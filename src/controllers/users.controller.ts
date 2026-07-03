import type { Request, Response } from "express";
import prisma from "../services/prisma.service.js";
import { usersService } from "../services/users.service.js";
import { SALT_ROUND } from "../config/env.js";
import bcrypt from "bcrypt";
import { videoValidationService } from "../services/videoValidation.service.js";
import { storageService } from "../services/storage/storage.factory.js";
import { walletService } from "../services/wallet.service.js";

export const usersController = {
  // ==========================================
  // SECTION 1 : LOGIQUE DE PROFIL & ONBOARDING (PUBLIC / USER)
  // ==========================================

  /**
   * Met à jour le profil étape par étape durant le parcours d'Onboarding ou en mode classique
   */
  updateOnboardingProfile: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
      }

      // Récupération dynamique de la photo via notre Factory unifiée
      const multerFile = req.file;
      let profilePhoto = req.body.profilePhoto;

      if (multerFile) {
        profilePhoto = await storageService.uploadFile(multerFile);
      }

      const {
        fullname,
        email,
        birthday,
        gender,
        pin,
        code,
        religion,
        passions,
        height,
        biography,
        vision,
        nextStep,
      } = req.body;

      // Traitement des informations et application des contraintes via le service général
      const updatedUser = await usersService.updateOnboardingData(userId, {
        fullname,
        profilePhoto,
        email,
        birthday,
        gender,
        pin: pin || code,
        religion,
        passions,
        height,
        biography,
        vision,
        nextStep, 
      });

      // Vérification séquentielle basée sur la valeur retournée par la BDD
      if (updatedUser.onboardingStep === "CALL_VALIDATION") {
        const finalUpdate = await prisma.user.update({
          where: { id: userId },
          data: {
            isCompleted: false, // Reste false tant que l'agent n'a pas validé physiquement
            onboardingStep: "AWAITING_VIDEO_CALL",
          },
        });

        // Initialisation immédiate de la room de flux WebRTC/Twilio
        // @ts-ignore 
        const videoSession = await videoValidationService.initializeSession(
          userId,
          true,
        );

        return res.status(200).json({
          success: true,
          code: "ONBOARDING_COMPLETED_AWAITING_CALL",
          message:
            "Informations enregistrées. En attente de la vérification par un agent.",
          data: {
            onboardingStep: finalUpdate.onboardingStep,
            roomId: videoSession.roomId,
            user: {
              id: finalUpdate.id,
              fullname: finalUpdate.fullname,
              profilePhoto: finalUpdate.profilePhoto,
            },
          },
        });
      }

      // Réponse de succès standard pour les étapes d'onboarding intermédiaires
      return res.status(200).json({
        success: true,
        message: "Étape d'onboarding enregistrée.",
        data: {
          isCompleted: updatedUser.isCompleted,
          onboardingStep: updatedUser.onboardingStep,
          user: {
            id: updatedUser.id,
            fullname: updatedUser.fullname,
            username: updatedUser.username,
            profilePhoto: updatedUser.profilePhoto,
            firstOtherPhoto: updatedUser.firstOtherPhoto,
            secondOtherPhoto: updatedUser.secondOtherPhoto,
          },
        },
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message:
          error.message || "Une erreur est survenue lors de la mise à jour.",
      });
    }
  },

  /**
   * Récupère le profil complet de l'utilisateur connecté avec ses droits associés
   */
  getMyProfile: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Profil introuvable." });
      }

      // 2. Récupération dynamique et calculée du solde des coins & starpoints
      const walletSummary = await walletService.getWalletSummary(userId);

      // mettre à jour le solde coins 
      await prisma.user.update({
        where: { id: userId },
        data: { coins: walletSummary.soldeTotalUtilisable }
      });

      return res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Désactive temporairement le compte de l'utilisateur (Option de mise en veille)
   */
  deactivateAccount: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      await usersService.deactivateAccount(userId);

      return res.status(200).json({
        success: true,
        message:
          "Votre compte a été suspendu temporairement avec succès. Vous avez été déconnecté.",
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Suppression définitive du compte (Exigence de conformité Google Play Store)
   */
  deleteAccount: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;

      await usersService.deleteAccountCompletely(userId);

      return res.status(200).json({
        success: true,
        code: "ACCOUNT_DELETED_SUCCESS",
        message:
          "Conformité Google : Votre compte et l'ensemble de vos données personnelles ont été supprimés définitivement.",
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ====================================================
  // SECTION 2 : GESTION DYNAMIQUE DES PERMISSIONS
  // ====================================================

  /**
   * Assigne ou révoque des permissions à un USER ou un AGENT
   */
  assignPermissionsToUser: async (req: Request, res: Response) => {
    try {
      const requesterRole = req.user.role;
      const { targetUserId, permissionIds } = req.body;

      if (!targetUserId || !Array.isArray(permissionIds)) {
        return res.status(400).json({
          success: false,
          message:
            "L'identifiant de la cible et un tableau d'IDs de permissions sont requis.",
        });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: parseInt(targetUserId) },
      });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: "L'utilisateur cible n'existe pas.",
        });
      }

      if (targetUser.role === "IT" && requesterRole === "ADMIN") {
        return res.status(403).json({
          success: false,
          message:
            "Rupture de privilèges : Un Administrateur ne peut modifier les privilèges d'un profil IT.",
        });
      }

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

      if (role === "IT" && requesterRole === "ADMIN") {
        return res.status(403).json({
          success: false,
          message:
            "Création refusée. Seul un administrateur système IT peut initialiser un autre profil IT.",
        });
      }

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

  // ==========================================
  // SECTION 4 : OPÉRATIONS FINANCIÈRES & PORTEFEUILLE (WALLET)
  // ==========================================

  /**
   * Action de l'administration sur une demande d'onboarding en attente (Validation, Rejet ou Bannissement)
   * Protégé par un middleware d'autorisation restreint aux rôles AGENT, ADMIN ou IT
   */
  reviewPendingAccount: async (req: Request, res: Response) => {
    try {
      const { targetUserId, action, reason } = req.body;

      if (!targetUserId || !action) {
        return res.status(400).json({
          success: false,
          message:
            "L'identifiant de la cible (targetUserId) et l'action ('APPROVE' | 'REJECT' | 'BAN') sont requis.",
        });
      }

      const targetId = parseInt(targetUserId, 10);
      const targetUser = await prisma.user.findUnique({
        where: { id: targetId },
      });

      if (!targetUser) {
        return res
          .status(404)
          .json({ success: false, message: "Utilisateur cible introuvable." });
      }

      let finalUser;

      // CAS A : APPROBATION PHYSIQUE DE L'AGENT
      if (action === "APPROVE") {
        finalUser = await prisma.user.update({
          where: { id: targetId },
          data: {
            isCompleted: true,
            onboardingStep: "COMPLETED",
          },
        });

        // Propagation Temps Réel vers la room Socket de l'utilisateur concerné
        globalThis.io.to(`user_${targetId}`).emit("admin:account:approved", {
          user: {
            id: finalUser.id,
            onboardingStep: finalUser.onboardingStep,
            isCompleted: finalUser.isCompleted,
          },
        });
      }

      // CAS B : REJET DES DONNÉES / PHOTOS NON CONFORMES
      else if (action === "REJECT") {
        finalUser = await prisma.user.update({
          where: { id: targetId },
          data: {
            isCompleted: false,
            onboardingStep: "PROFILE_DETAILS", // Renvoi vers la correction des détails
          },
        });

        globalThis.io.to(`user_${targetId}`).emit("admin:account:rejected", {
          reason:
            reason ||
            "Vos informations ou votre photo n'ont pas été validées par notre équipe.",
        });
      }

      // CAS C : BANNING IMMÉDIAT
      else if (action === "BAN") {
        finalUser = await prisma.user.update({
          where: { id: targetId },
          data: {
            isBanned: true,
          },
        });

        globalThis.io.to(`user_${targetId}`).emit("admin:account:banned");
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Action demandée inconnue." });
      }

      return res.status(200).json({
        success: true,
        message: `L'action [${action}] sur le compte de ${targetUser.fullname} a été traitée et synchronisée en temps réel.`,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ==========================================
  // SECTION 5 : SYNC BACKEND-DRIVEN / ACTIONS AGENT-ADMIN (TEMPS RÉEL)
  // ==========================================

  /**
   * Récupère la liste paginée des utilisateurs en attente de validation par un agent
   * Sécurisé : Accessible uniquement par le STAFF (AGENT, ADMIN, IT)
   */
  getPendingOnboardings: async (req: Request, res: Response) => {
    try {
      // Optionnel : Récupération des paramètres de pagination depuis la query string
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const skip = (page - 1) * limit;

      // 1. Requête Prisma pour cibler uniquement les comptes en attente d'appel
      const [pendingUsers, total] = await prisma.$transaction([
        prisma.user.findMany({
          where: {
            onboardingStep: "AWAITING_VIDEO_CALL",
            isCompleted: false,
            isBanned: false,
            deletedAt: null, // Ignore les comptes supprimés logiquement
          },
          select: {
            id: true,
            fullname: true,
            username: true,
            phoneNumber: true,
            email: true,
            profilePhoto: true,
            birthday: true,
            gender: true,
            religion: true,
            passion: true,
            preferences: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc", // Premier arrivé, premier servi (file d'attente logique)
          },
          skip,
          take: limit,
        }),
        prisma.user.count({
          where: {
            onboardingStep: "AWAITING_VIDEO_CALL",
            isCompleted: false,
            isBanned: false,
            deletedAt: null,
          },
        }),
      ]);

      return res.status(200).json({
        success: true,
        message: "Liste des demandes d'inscription en attente récupérée.",
        meta: {
          totalCount: total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
        },
        data: pendingUsers,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Une erreur est survenue lors de la récupération des demandes.",
      });
    }
  },
};
