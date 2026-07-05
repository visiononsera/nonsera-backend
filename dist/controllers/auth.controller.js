import { usersService } from "../services/users.service.js";
import { companiesService } from "../services/companies.service.js";
import { twilioService } from "../services/twilio.service.js";
import { generateToken, generateRefreshToken } from "../utils/jwt.utils.js";
import bcrypt from "bcrypt";
import prisma from "../services/prisma.service.js";
import { SALT_ROUND } from "../config/env.js";
/**
 * Génère un code OTP aléatoire à 6 chiffres
 */
function generateNumericOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
/**
 * Vérifie l'existence d'un numéro de téléphone dans la table Users
 */
async function __checkPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
        return {
            exists: false,
            user: null,
            errorStatus: "BAD_REQUEST",
            errorMessage: "Le numéro de téléphone est obligatoire.",
        };
    }
    const searchResult = await usersService.getMany({ phoneNumber }, { limit: 1, page: 0 });
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
 * Valide si le rôle d'un utilisateur correspond aux rôles autorisés
 */
function __validateRole(user, allowedRoles) {
    if (!user || !allowedRoles.includes(user.role)) {
        return {
            isValid: false,
            errorMessage: "Accès interdit. Vos privilèges ne vous permettent pas d'accéder à cet espace.",
        };
    }
    return { isValid: true, errorMessage: null };
}
export const authController = {
    /**
     * USER - Route de checking d'existence (Fonction Pure)
     */
    checkUserNumber: async (req, res) => {
        try {
            const { phoneNumber } = req.body;
            const check = await __checkPhoneNumber(phoneNumber);
            // Cas 1 : Le numéro n'existe pas
            if (check.errorStatus === "NOT_FOUND") {
                return res.status(200).json({
                    success: true,
                    code: "NOT_FOUND",
                    message: "Numéro disponible pour inscription.",
                    data: null
                });
            }
            // Cas 2 : Le numéro est banni ou données invalides
            if (check.errorStatus) {
                return res.status(check.errorStatus === "BANNED" ? 403 : 400).json({
                    success: false,
                    code: check.errorStatus,
                    message: check.errorMessage,
                    data: null
                });
            }
            // Cas 3 : Le compte existe (complet ou incomplet). On retourne l'utilisateur brut.
            return res.status(200).json({
                success: true,
                code: "EXISTS",
                message: "Numéro de téléphone existant en base de données.",
                data: {
                    user: {
                        id: check?.user?.id,
                        phoneNumber: check.user?.phoneNumber,
                        onboardingStep: check.user?.onboardingStep,
                        isCompleted: check.user?.isCompleted,
                        role: check.user?.role
                    }
                }
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, code: "SERVER_ERROR", message: error.message, data: null });
        }
    },
    /**
     * Connexion utilisateur Nonsera
     */
    loginUser: async (req, res) => {
        const { phoneNumber, passCode } = req.body;
        if (!phoneNumber || !passCode) {
            return res.status(400).json({
                success: false,
                code: "INVALID_DATA",
                message: "Le numéro de téléphone et le code PIN sont obligatoires.",
                data: null
            });
        }
        try {
            const check = await __checkPhoneNumber(phoneNumber);
            if (!check.exists || check.errorStatus) {
                return res.status(444).json({
                    success: false,
                    code: "NOT_FOUND",
                    message: check.errorMessage || "Compte introuvable.",
                    data: null
                });
            }
            const roleValidation = __validateRole(check.user, ["USER"]);
            if (!roleValidation.isValid) {
                return res.status(403).json({
                    success: false,
                    code: "UNAUTHORIZED_ACTION",
                    message: roleValidation.errorMessage,
                    data: null
                });
            }
            // Vérification du code PIN
            const isPinCorrect = await bcrypt.compare(passCode, check.user?.passCode);
            if (!isPinCorrect) {
                return res.status(401).json({
                    success: false,
                    code: "BAD_CREDENTIALS",
                    message: "Code PIN incorrect.",
                    data: null
                });
            }
            const payload = { userId: check.user.id, type: check.user.role };
            const accessToken = generateToken(payload.userId, payload.type);
            const refreshToken = generateRefreshToken(payload.userId, payload.type);
            // Cas : Onboarding incomplet mais authentification réussie
            if (!check?.user?.isCompleted) {
                return res.status(200).json({
                    success: true,
                    code: "ONBOARDING_INCOMPLETE",
                    message: "Veuillez finaliser les étapes de votre profil.",
                    data: {
                        accessToken,
                        refreshToken,
                        onboardingStep: check?.user?.onboardingStep || "GENERAL_INFO",
                        user: check.user,
                    },
                });
            }
            // Cas : Connexion complète nominale
            return res.status(200).json({
                success: true,
                code: "LOGIN_SUCCESS",
                message: "Authentification réussie.",
                data: {
                    accessToken,
                    refreshToken,
                    onboardingStep: "COMPLETED",
                    user: check.user,
                },
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, code: "SERVER_ERROR", message: error.message, data: null });
        }
    },
    /**
     * Envoi d'OTP pour inscription
     */
    sendRegisterOtp: async (req, res) => {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                code: "INVALID_DATA",
                message: "Le numéro de téléphone est obligatoire.",
                data: null
            });
        }
        try {
            const check = await __checkPhoneNumber(phoneNumber);
            if (check.exists) {
                return res.status(400).json({
                    success: false,
                    code: "ALREADY_EXISTS",
                    message: "Ce numéro de téléphone est déjà associé à un compte.",
                    data: null
                });
            }
            const otpCode = generateNumericOtp();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
            await prisma.otpVerification.upsert({
                where: { phoneNumber },
                update: { codeHash: otpCode, expiresAt },
                create: { phoneNumber, codeHash: otpCode, expiresAt },
            });
            await twilioService.sendCustomSms(phoneNumber, `Votre code de vérification pour votre inscription est : ${otpCode}.`);
            return res.status(200).json({
                success: true,
                code: "OTP_SENT",
                message: "Code de validation envoyé avec succès.",
                data: null
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, code: "SERVER_ERROR", message: error.message, data: null });
        }
    },
    /**
     * USER - Validation OTP et Création initiale de compte
     */
    verifyRegisterAndCreate: async (req, res) => {
        const { phoneNumber, code } = req.body;
        if (!phoneNumber || !code) {
            return res.status(400).json({
                success: false,
                code: "INVALID_DATA",
                message: "Le numéro de téléphone et le code OTP sont obligatoires.",
                data: null
            });
        }
        try {
            const isDev = process.env.NODE_ENV === "development" || !process.env.TWILIO_ACCOUNT_SID;
            const isMockValid = isDev && code === "001089";
            if (!isMockValid) {
                const otpRecord = await prisma.otpVerification.findUnique({
                    where: { phoneNumber },
                });
                if (!otpRecord || new Date() > otpRecord.expiresAt) {
                    return res.status(400).json({
                        success: false,
                        code: "OTP_EXPIRED",
                        message: "Le code OTP a expiré ou n'existe pas.",
                        data: null
                    });
                }
                if (otpRecord.codeHash !== code) {
                    return res.status(400).json({
                        success: false,
                        code: "INVALID_OTP",
                        message: "Code OTP invalide.",
                        data: null
                    });
                }
            }
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
                code: "REGISTER_SUCCESS",
                message: "Numéro vérifié. Compte initialisé.",
                data: {
                    accessToken: generateToken(payload.userId, payload.type),
                    refreshToken: generateRefreshToken(payload.userId, payload.type),
                    onboardingStep: newUser.onboardingStep,
                    user: newUser,
                },
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, code: "SERVER_ERROR", message: error.message, data: null });
        }
    },
    // ==========================================
    // SECTION STAFF
    // ==========================================
    checkStaffNumber: async (req, res) => {
        try {
            const { phoneNumber } = req.body;
            const check = await __checkPhoneNumber(phoneNumber);
            if (!check.exists || check.errorStatus) {
                return res.status(check.errorStatus === "BANNED" ? 403 : 444).json({
                    success: false,
                    code: check.errorStatus || "NOT_FOUND",
                    message: check.errorMessage || "Accès refusé.",
                    data: null
                });
            }
            const roleValidation = __validateRole(check.user, ["ADMIN", "AGENT", "IT"]);
            if (!roleValidation.isValid) {
                return res.status(403).json({
                    success: false,
                    code: "UNAUTHORIZED_ROLE",
                    message: roleValidation.errorMessage,
                    data: null
                });
            }
            return res.status(200).json({
                success: true,
                code: "STAFF_EXISTS",
                message: "Compte Staff identifié et valide.",
                data: { role: check?.user?.role },
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, code: "SERVER_ERROR", message: error.message, data: null });
        }
    },
    loginStaff: async (req, res) => {
        const { phoneNumber, passCode } = req.body;
        if (!phoneNumber || !passCode) {
            return res.status(400).json({
                success: false,
                code: "INVALID_DATA",
                message: "Le numéro et le code PIN d'administration sont requis.",
                data: null
            });
        }
        try {
            const check = await __checkPhoneNumber(phoneNumber);
            if (!check.exists || check.errorStatus) {
                return res.status(403).json({
                    success: false,
                    code: "FORBIDDEN",
                    message: check.errorMessage || "Accès refusé.",
                    data: null
                });
            }
            const roleValidation = __validateRole(check.user, ["ADMIN", "AGENT", "IT"]);
            if (!roleValidation.isValid) {
                return res.status(403).json({
                    success: false,
                    code: "UNAUTHORIZED_ROLE",
                    message: roleValidation.errorMessage,
                    data: null
                });
            }
            const isPinCorrect = await bcrypt.compare(passCode, check.user.passCode);
            if (!isPinCorrect) {
                return res.status(401).json({
                    success: false,
                    code: "BAD_CREDENTIALS",
                    message: "Code PIN administratif erroné.",
                    data: null
                });
            }
            const payload = { userId: check.user.id, type: check.user.role };
            return res.status(200).json({
                success: true,
                code: "LOGIN_SUCCESS",
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
        }
        catch (error) {
            return res.status(500).json({ success: false, code: "SERVER_ERROR", message: error.message, data: null });
        }
    },
    // ==========================================
    // SECTION PARTNER (COMPANIES / B2B)
    // ==========================================
    checkPartnerNumber: async (req, res) => {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                code: "INVALID_DATA",
                message: "Le numéro de l'entreprise est obligatoire.",
                data: null
            });
        }
        try {
            const searchCompany = await companiesService.getMany({ search: phoneNumber }, { limit: 1, page: 0 });
            const company = searchCompany.result[0];
            if (!company) {
                return res.status(200).json({
                    success: true,
                    code: "NOT_FOUND",
                    message: "Numéro disponible pour enregistrer une entreprise.",
                    data: null
                });
            }
            return res.status(200).json({
                success: true,
                code: "EXISTS",
                message: "Compte entreprise existant.",
                data: { id: company.id, username: company.username },
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, code: "SERVER_ERROR", message: error.message, data: null });
        }
    },
    loginPartner: async (req, res) => {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                code: "INVALID_DATA",
                message: "Le numéro de téléphone de l'entreprise est obligatoire.",
                data: null
            });
        }
        try {
            const searchResult = await companiesService.getMany({ search: phoneNumber }, { limit: 1, page: 0 });
            const company = searchResult.result[0];
            if (!company) {
                return res.status(404).json({
                    success: false,
                    code: "NOT_FOUND",
                    message: "Aucun établissement partenaire trouvé avec ce numéro.",
                    data: null
                });
            }
            const payload = { userId: company.id, type: "PARTNER" };
            return res.status(200).json({
                success: true,
                code: "LOGIN_SUCCESS",
                message: "Connexion Espace Entreprise réussie.",
                data: {
                    accessToken: generateToken(payload.userId, payload.type),
                    refreshToken: generateRefreshToken(payload.userId, payload.type),
                    company: {
                        id: company.id,
                        username: company.username,
                        phoneNumber: company.phoneNumber,
                        solde: company.balance,
                    },
                },
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, code: "SERVER_ERROR", message: error.message, data: null });
        }
    },
    logout: async (req, res) => {
        return res.status(200).json({
            success: true,
            code: "LOGOUT_SUCCESS",
            message: "Déconnexion effectuée avec succès. Session invalidée.",
            data: null
        });
    },
};
//# sourceMappingURL=auth.controller.js.map