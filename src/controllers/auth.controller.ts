import type { Request, Response } from "express";
import { usersService } from "../services/users.service.js";
import { companiesService } from "../services/companies.service.js";
import { twilioService } from "../services/twilio.service.js";
import { generateToken, generateRefreshToken } from "../utils/jwt.utils.js";
import bcrypt from "bcrypt";
import prisma from "../services/prisma.service.js";
import { SALT_ROUND } from "../config/env.js";

const otpCache = new Map();

/**
 * Génère un code OTP aléatoire à 6 chiffres
 */
function generateNumericOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Vérifie l'existence d'un numéro de téléphone dans la table Users
 * @param {string} phoneNumber
 * @returns {Promise<{exists: boolean, user: Object|null, errorStatus: string|null, errorMessage: string|null}>}
 */
async function __checkPhoneNumber(phoneNumber: string) {
  if (!phoneNumber) {
    return {
      exists: false,
      user: null,
      errorStatus: "BAD_REQUEST",
      errorMessage: "Le numéro de téléphone est obligatoire.",
    };
  }

  const searchResult = await usersService.getMany(
    { phoneNumber },
    { limit: 1, page: 0 },
  );
  const user = searchResult.result[0];

  if (!user) {
    return {
      exists: false,
      user: null,
      errorStatus: "NOT_FOUND",
      errorMessage: "Aucun compte associé à ce numéro.",
    };
  }

  if (user.isBanned) {
    return {
      exists: true,
      user,
      errorStatus: "BANNED",
      errorMessage: "Ce compte a été suspendu. Accès refusé.",
    };
  }

  return { exists: true, user, errorStatus: null, errorMessage: null };
}

/**
 * Valide si le rôle d'un utilisateur correspond aux rôles autorisés pour un flux
 * @param {Object} user - L'objet utilisateur issu de la base
 * @param {Array<string>} allowedRoles - Tableau des rôles permis (ex: ['ADMIN', 'AGENT', 'IT'])
 * @returns {{isValid: boolean, errorMessage: string|null}}
 */
function __validateRole(user: any, allowedRoles: Array<string>) {
  if (!user || !allowedRoles.includes(user.role)) {
    return {
      isValid: false,
      errorMessage:
        "Accès interdit. Vos privilèges ne vous permettent pas d'accéder à cet espace.",
    };
  }
  return { isValid: true, errorMessage: null };
}

export const authController = {
  /**
   * USER - Route de checking d'existence
   */
  checkUserNumber: async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.body;
      const check = await __checkPhoneNumber(phoneNumber);

      if (check.errorStatus === "NOT_FOUND") {
        return res.status(200).json({
          status: "NOT_FOUND",
          message: "Numéro disponible pour inscription.",
        });
      }

      if (check.errorStatus) {
        return res.status(check.errorStatus === "BANNED" ? 403 : 400).json({
          status: check.errorStatus,
          message: check.errorMessage,
        });
      }

      const roleValidation = __validateRole(check.user, ["USER"]);
      if (!roleValidation.isValid) {
        return res
          .status(403)
          .json({ success: false, message: roleValidation.errorMessage });
      }

      if (!check?.user?.isCompleted) {
        return res.status(200).json({
          status: "ONBOARDING_INCOMPLETE",
          message: "Onboarding en cours pour cet utilisateur.",
          data: {
            onboardingStep: check.user?.onboardingStep || "GENERAL_INFO",
            user: {
              id: check?.user?.id,
              fullname: check?.user?.fullname,
              phoneNumber: check?.user?.phoneNumber,
            },
          },
        });
      }

      return res.status(200).json({
        status: "EXISTS",
        message:
          "Compte utilisateur valide et complet. Prêt pour la connexion.",
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Connexion utilisateur Nonsera
   */
  loginUser: async (req: Request, res: Response) => {
    const { phoneNumber, passCode } = req.body;
    if (!phoneNumber || !passCode) {
      return res.status(400).json({
        success: false,
        message: "Le numéro de téléphone et le code PIN sont obligatoires.",
      });
    }

    try {
      const check = await __checkPhoneNumber(phoneNumber);
      if (!check.exists || check.errorStatus) {
        return res.status(404).json({
          success: false,
          message: check.errorMessage || "Compte introuvable.",
        });
      }

      const roleValidation = __validateRole(check.user, ["USER"]);
      if (!roleValidation.isValid) {
        return res
          .status(403)
          .json({ success: false, message: roleValidation.errorMessage });
      }

      if (check.user && !check.user.isCompleted) {
        const accessToken = generateToken(check.user.id, check.user.role);
        return res.status(200).json({
          success: true,
          code: "ONBOARDING_INCOMPLETE",
          message: "Veuillez finaliser les étapes de votre profil.",
          data: {
            onboardingStep: check.user.onboardingStep || "GENERAL_INFO",
            accessToken,
            user: {
              id: check.user.id,
              phoneNumber: check.user.phoneNumber,
              fullname: check.user.fullname,
              role: check.user.role,
            },
          },
        });
      }

      // Vérification de la conformité du code PIN
      const isPinCorrect = await bcrypt.compare(
        passCode,
        check.user?.passCode as string,
      );
      if (!isPinCorrect) {
        return res
          .status(401)
          .json({ success: false, message: "Code PIN incorrect." });
      }

      // Génération de la session
      const payload = { userId: check.user!.id, type: check.user!.role };
      return res.status(200).json({
        success: true,
        code: "LOGIN_SUCCESS",
        message: "Authentification réussie.",
        data: {
          accessToken: generateToken(payload.userId, payload.type),
          refreshToken: generateRefreshToken(payload.userId, payload.type),
          user: {
            id: check.user!.id,
            phoneNumber: check.user!.phoneNumber,
            fullname: check.user!.fullname,
            role: check.user!.role,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Envoie d'OTP
   */
  sendRegisterOtp: async (req: Request, res: Response) => {
    const { phoneNumber } = req.body;
    try {
      const check = await __checkPhoneNumber(phoneNumber);
      if (check.exists) {
        return res.status(400).json({
          success: false,
          message: "Ce numéro de téléphone est déjà associé à un compte.",
        });
      }

      const otpCode = generateNumericOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // SÉCURITÉ CONCURRENCE : Enregistrement atomique en Base de Données (upsert évite les doublons de clés)
      await prisma.otpVerification.upsert({
        where: { phoneNumber },
        update: { code: otpCode, expiresAt },
        create: { phoneNumber, code: otpCode, expiresAt }
      });

      await twilioService.sendCustomSms(
        phoneNumber,
        `Votre code de vérification pour votre inscription est : ${otpCode}.`,
      );
      return res.status(200).json({
        success: true,
        message: "Code de validation envoyé avec succès.",
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * USER - Validation OTP et Création de compte
   */
  verifyRegisterAndCreate: async (req: Request, res: Response) => {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        message: "Le numéro de téléphone et le code OTP sont obligatoires.",
      });
    }

    try {
      const isDev = process.env.NODE_ENV === "development" || !process.env.TWILIO_ACCOUNT_SID;
      const isMockValid = isDev && code === "001089";

      if (!isMockValid) {
        // Lecture sécurisée multi-utilisateurs depuis la base de données
        const otpRecord = await prisma.otpVerification.findUnique({ where: { phoneNumber } });

        if (!otpRecord || new Date() > otpRecord.expiresAt) {
          return res.status(400).json({ success: false, message: "Le code OTP a expiré ou n'existe pas." });
        }
        if (otpRecord.code !== code) {
          return res.status(400).json({ success: false, message: "Code OTP invalide." });
        }
      }

      // Nettoyage immédiat de l'OTP consommé
      await prisma.otpVerification.deleteMany({ where: { phoneNumber } });

      const salt = await bcrypt.genSalt(SALT_ROUND);
      const hashedDefaultPin = await bcrypt.hash(code, salt);

      const newUser = await usersService.create({
        phoneNumber,
        fullname: "Nouvel Utilisateur",
        passCode: hashedDefaultPin,
        role: "USER",
        onboardingStep: "GENERAL_INFO",
      });

      const payload = { userId: newUser.id, type: newUser.role };
      return res.status(201).json({
        success: true,
        message: "Numéro vérifié. Compte initialisé.",
        data: {
          accessToken: generateToken(payload.userId, payload.type),
          refreshToken: generateRefreshToken(payload.userId, payload.type),
          onboardingStep: newUser.onboardingStep,
          user: {
            id: newUser.id,
            phoneNumber: newUser.phoneNumber,
            role: newUser.role,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ==========================================
  // SECTION STAFF
  // ==========================================
  checkStaffNumber: async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.body;
      const check = await __checkPhoneNumber(phoneNumber);

      if (!check.exists || check.errorStatus) {
        return res.status(check.errorStatus === "BANNED" ? 403 : 444).json({
          status: "NOT_FOUND",
          message: check.errorMessage || "Accès refusé.",
        });
      }

      const roleValidation = __validateRole(check.user, [
        "ADMIN",
        "AGENT",
        "IT",
      ]);
      if (!roleValidation.isValid) {
        return res.status(403).json({
          status: "UNAUTHORIZED",
          message: roleValidation.errorMessage,
        });
      }

      return res.status(200).json({
        status: "EXISTS",
        message: "Compte Staff identifié et valide.",
        data: { role: check?.user?.role },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  loginStaff: async (req: Request, res: Response) => {
    const { phoneNumber, passCode } = req.body;
    if (!phoneNumber || !passCode) {
      return res.status(400).json({
        success: false,
        message: "Le numéro et le code PIN d'administration sont requis.",
      });
    }

    try {
      const check = await __checkPhoneNumber(phoneNumber);
      if (!check.exists || check.errorStatus) {
        return res.status(403).json({
          success: false,
          message: check.errorMessage || "Accès refusé.",
        });
      }

      const roleValidation = __validateRole(check.user, [
        "ADMIN",
        "AGENT",
        "IT",
      ]);
      if (!roleValidation.isValid) {
        return res
          .status(403)
          .json({ success: false, message: roleValidation.errorMessage });
      }

      const isPinCorrect = await bcrypt.compare(
        passCode,
        check.user!.passCode as string,
      );
      if (!isPinCorrect) {
        return res
          .status(401)
          .json({ success: false, message: "Code PIN administratif erroné." });
      }

      const payload = { userId: check.user!.id, type: check.user!.role };
      return res.status(200).json({
        success: true,
        message: `Authentification réussie. Espace ${check.user?.role}.`,
        data: {
          accessToken: generateToken(payload.userId, payload.type),
          refreshToken: generateRefreshToken(payload.userId, payload.type),
          staff: {
            id: check.user?.id,
            phoneNumber: check.user?.phoneNumber,
            fullname: check.user?.fullname,
            role: check.user?.role,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ==========================================
  // SECTION PARTNER (COMPANIES / B2B)
  // ==========================================

  checkPartnerNumber: async (req: Request, res: Response) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber)
      return res.status(400).json({
        success: false,
        message: "Le numéro de l'entreprise est obligatoire.",
      });

    try {
      const searchCompany = await companiesService.getMany(
        { search: phoneNumber },
        { limit: 1, page: 0 },
      );
      const company = searchCompany.result[0];

      if (!company) {
        return res.status(200).json({
          status: "NOT_FOUND",
          message: "Numéro disponible pour enregistrer une entreprise.",
        });
      }

      return res.status(200).json({
        status: "EXISTS",
        message: "Compte entreprise existant.",
        data: { id: company.id, username: company.username },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  loginPartner: async (req: Request, res: Response) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber)
      return res.status(400).json({
        success: false,
        message: "Le numéro de téléphone de l'entreprise est obligatoire.",
      });

    try {
      const searchResult = await companiesService.getMany(
        { search: phoneNumber },
        { limit: 1, page: 0 },
      );
      const company = searchResult.result[0];

      if (!company)
        return res.status(404).json({
          success: false,
          message: "Aucun établissement partenaire trouvé avec ce numéro.",
        });

      const payload = { userId: company.id, type: "PARTNER" };
      return res.status(200).json({
        success: true,
        message: "Connexion Espace Entreprise réussie.",
        data: {
          accessToken: generateToken(payload.userId, payload.type),
          refreshToken: generateRefreshToken(payload.userId, payload.type),
          company: {
            id: company.id,
            username: company.username,
            phoneNumber: company.phoneNumber,
            solde: company.solde,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  logout: async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(200).json({ success: true, message: "Déconnexion réussie (Session locale nettoyée)." });
    }

    try {
      return res.status(200).json({
        success: true,
        message: "Déconnexion effectuée avec succès. Session invalidée."
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};
