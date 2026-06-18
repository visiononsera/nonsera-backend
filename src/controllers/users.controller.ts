import type { Request, Response } from "express";
import prisma from "../services/prisma.service.js";
import { usersService } from "../services/users.service.js";
import { SALT_ROUND } from "../config/env.js";
import bcrypt from "bcrypt";
import { videoValidationService } from "../services/videoValidation.service.js";

export const usersController = {
  // ==========================================
  // SECTION 1 : LOGIQUE DE PROFIL & ONBOARDING (PUBLIC / USER)
  // ==========================================

  /**
   * Met à jour le profil étape par étape durant le parcours d'Onboarding
   */
  updateOnboardingProfile: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { fullname, username, currentStep, nextStep } = req.body;

      const updateData: any = {};
      if (fullname) updateData.fullname = fullname;

      if (username) {
        const existingUsername = await prisma.user.findUnique({
          where: { username },
        });
        if (existingUsername && existingUsername.id !== userId) {
          return res
            .status(400)
            .json({
              success: false,
              message: "Ce nom d'utilisateur est déjà pris.",
            });
        }
        updateData.username = username;
      }

      if (nextStep) {
        updateData.onboardingStep = nextStep;
      }

      // VÉRIFICATION DE LA COMPLÉTION DE L'ONBOARDING
      const isFinalStep = currentStep === "FINAL_STEP";
      if (isFinalStep) {
        updateData.isCompleted = false; // Reste à false tant que l'AGENT n'a pas validé l'appel
        updateData.onboardingStep = "AWAITING_VIDEO_CALL";
      }

      // Mise à jour de l'utilisateur
      const updatedUser = await usersService.update(userId, updateData);

      // AUTOMATION BACKEND-DRIVEN : Déclenchement automatique de la session vidéo
      if (isFinalStep) {
        const videoSession = await videoValidationService.initializeSession(
          userId,
          true,
        );

        return res.status(201).json({
          success: true,
          code: "ONBOARDING_COMPLETED_AWAITING_CALL",
          message:
            "Informations enregistrées. Session d'appel vidéo initialisée par le système.",
          data: {
            onboardingStep: updatedUser.onboardingStep,
            roomId: videoSession.roomId, // Renvoyé directement au client mobile pour s'y connecter
          },
        });
      }

      // Étape d'onboarding intermédiaire standard
      return res.status(200).json({
        success: true,
        message: "Étape d'onboarding enregistrée.",
        data: {
          isCompleted: updatedUser.isCompleted,
          onboardingStep: updatedUser.onboardingStep,
          user: { id: updatedUser.id, fullname: updatedUser.fullname },
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  /**
   * Récupère le profil complet de l'utilisateur connecté avec ses droits associés
   */
  getMyProfile: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { permissions: { select: { code: true, name: true } } },
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Profil introuvable." });
      }

      return res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ==========================================
  // SECTION 2 : GESTION DYNAMIQUE DES PERMISSIONS (ADMIN & IT)
  // ==========================================

  /**
   * Assigne ou révoque des permissions à un USER ou un AGENT
   * Droit absolu réservé à l'ADMIN et à l'IT
   */
  assignPermissionsToUser: async (req: Request, res: Response) => {
    try {
      const requesterRole = req.user.role; // Le rôle de l'opérateur (ADMIN ou IT)
      const { targetUserId, permissionIds } = req.body; // permissionIds: ex: [2, 5, 11]

      if (!targetUserId || !Array.isArray(permissionIds)) {
        return res.status(400).json({
          success: false,
          message:
            "L'identifiant de la cible et un tableau d'IDs de permissions sont requis.",
        });
      }

      // Extraction de la cible pour valider la hiérarchie de sécurité
      const targetUser = await prisma.user.findUnique({
        where: { id: parseInt(targetUserId) },
      });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: "L'utilisateur cible n'existe pas.",
        });
      }

      // Barrière de sécurité : Un ADMIN ne peut pas modifier un ingénieur IT
      if (targetUser.role === "IT" && requesterRole === "ADMIN") {
        return res.status(403).json({
          success: false,
          message:
            "Rupture de privilèges : Un Administrateur ne peut modifier les privilèges d'un profil IT.",
        });
      }

      // Synchronisation atomique Many-to-Many via Prisma Connect/Set
      await prisma.user.update({
        where: { id: parseInt(targetUserId) },
        data: {
          permissions: {
            set: permissionIds.map((id: number) => ({
              id: parseInt(id as any),
            })),
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: `Les permissions de l'utilisateur [${targetUser.fullname}] ont été reconfigurées avec succès.`,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Enregistre une nouvelle clé de permission dans le dictionnaire général du système
   */
  createSystemPermission: async (req: Request, res: Response) => {
    try {
      const { name, code, description } = req.body;

      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: "Le nom et le code de permission sont requis.",
        });
      }

      const newPermission = await prisma.permission.create({
        data: {
          name,
          code: code.toUpperCase().trim(),
          description,
        },
      });

      return res.status(201).json({
        success: true,
        message:
          "Nouvelle règle de privilège injectée dans le dictionnaire système.",
        data: newPermission,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message:
          "Impossible de créer la permission. Le code est peut-être déjà utilisé.",
      });
    }
  },

  // ==========================================
  // SECTION 3 : CONTRÔLE ET MANAGEMENT DU PERSONNEL (STAFF CREATION)
  // ==========================================

  /**
   * Initialisation directe d'un compte AGENT, ADMIN ou IT par le personnel habilité
   */
  createStaffAccount: async (req: Request, res: Response) => {
    try {
      const requesterRole = req.user.role;
      const { phoneNumber, fullname, role, passCode } = req.body;

      if (!phoneNumber || !fullname || !role || !passCode) {
        return res.status(400).json({
          success: false,
          message:
            "Tous les champs (phoneNumber, fullname, role, passCode) sont obligatoires.",
        });
      }

      // Interdiction pour un ADMIN de créer un niveau supérieur (IT)
      if (role === "IT" && requesterRole === "ADMIN") {
        return res.status(403).json({
          success: false,
          message:
            "Création refusée. Seul un administrateur système IT peut initialiser un autre profil IT.",
        });
      }

      // Validation de conflit d'unicité sur le numéro
      const existingUser = await prisma.user.findUnique({
        where: { phoneNumber },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Ce numéro de téléphone est déjà attribué.",
        });
      }

      const salt = await bcrypt.genSalt(SALT_ROUND);
      const hashedPin = await bcrypt.hash(passCode, salt);

      // Création du compte via le service
      const newStaff = await usersService.create({
        phoneNumber,
        fullname,
        role,
        passCode: hashedPin,
        isCompleted: true,
        onboardingStep: "COMPLETED",
      });

      return res.status(201).json({
        success: true,
        message: `Le compte opérationnel [${role}] a été créé avec succès pour ${fullname}.`,
        data: {
          id: newStaff.id,
          phoneNumber: newStaff.phoneNumber,
          role: newStaff.role,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};
