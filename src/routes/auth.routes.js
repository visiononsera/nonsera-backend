import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";

const router = Router();

/**
 * @openapi
 * components:
 * securitySchemes:
 * bearerAuth:
 * type: http
 * scheme: bearer
 * bearerFormat: JWT
 * schemas:
 * StandardResponse:
 * type: object
 * properties:
 * success:
 * type: boolean
 * code:
 * type: string
 * message:
 * type: string
 * data:
 * type: object
 * nullable: true
 */

// ==========================================
// FLUX UTILISATEURS STANDARD
// ==========================================

/**
 * @openapi
 * /auth/check-user:
 *   post:
 *     summary: Vérifier l'existence d'un numéro utilisateur standard
 *     tags:
 *       - Auth (User)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+22900000000"
 *     responses:
 *       "200":
 *         description: Succès - Retourne si le numéro est disponible (NOT_FOUND) ou s'il existe déjà (EXISTS)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StandardResponse'
 *       "403":
 *         description: Accès refusé - L'utilisateur associé à ce numéro est banni
 *       "500":
 *         description: Erreur serveur
 */
router.post("/auth/check-user", authController.checkUserNumber);

/**
 * @openapi
 * /auth/login-user:
 * post:
 * summary: Connexion d'un utilisateur standard via numéro et Code PIN
 * tags:
 * - Auth (User)
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - phoneNumber
 * - passCode
 * properties:
 * phoneNumber:
 * type: string
 * example: "+22900000000"
 * passCode:
 * type: string
 * description: Code PIN de l'utilisateur
 * example: "1234"
 * responses:
 * 200:
 * description: Authentification réussie (Codes possibles : LOGIN_SUCCESS, ONBOARDING_INCOMPLETE)
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/StandardResponse'
 * 401:
 * description: Code PIN incorrect (BAD_CREDENTIALS)
 * 403:
 * description: Rôle invalide pour cet espace
 * 444:
 * description: Aucun compte associé à ce numéro (NOT_FOUND)
 * 500:
 * description: Erreur serveur
 */
router.post("/auth/login-user", authController.loginUser);

/**
 * @openapi
 * /auth/register/send-otp:
 * post:
 * summary: Initier et envoyer un code de validation OTP pour l'inscription
 * tags:
 * - Auth (User)
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - phoneNumber
 * properties:
 * phoneNumber:
 * type: string
 * example: "+22900000000"
 * responses:
 * 200:
 * description: OTP généré et transmis via SMS avec succès (OTP_SENT)
 * 400:
 * description: Données invalides ou numéro déjà existant (ALREADY_EXISTS)
 * 500:
 * description: Erreur serveur
 */
router.post("/auth/register/send-otp", authController.sendRegisterOtp);

/**
 * @openapi
 * /auth/register/verify-otp:
 * post:
 * summary: Valider l'OTP reçu et initialiser le compte de l'utilisateur
 * tags:
 * - Auth (User)
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - phoneNumber
 * - code
 * properties:
 * phoneNumber:
 * type: string
 * example: "+22900000000"
 * code:
 * type: string
 * description: Code OTP reçu par SMS (ou code de mock "001089" en dev)
 * example: "584123"
 * responses:
 * 201:
 * description: Compte créé initialement avec succès, tokens JWT retournés (REGISTER_SUCCESS)
 * 400:
 * description: Code OTP expiré ou incorrect (OTP_EXPIRED, INVALID_OTP)
 * 500:
 * description: Erreur serveur
 */
router.post("/auth/register/verify-otp", authController.verifyRegisterAndCreateTest);

// ==========================================
// FLUX INTERNE (STAFF / BACKOFFICE)
// ==========================================

/**
 * @openapi
 * /auth/check-staff:
 * post:
 * summary: Vérifier l'existence et l'autorisation d'un membre du Staff
 * tags:
 * - Auth (Staff)
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - phoneNumber
 * properties:
 * phoneNumber:
 * type: string
 * example: "+22911111111"
 * responses:
 * 200:
 * description: Numéro staff identifié avec le bon rôle (STAFF_EXISTS)
 * 403:
 * description: Rôle insuffisant pour l'espace administratif ou banni (UNAUTHORIZED_ROLE)
 * 444:
 * description: Numéro introuvable (NOT_FOUND)
 * 500:
 * description: Erreur serveur
 */
router.post("/auth/check-staff", authController.checkStaffNumber);

/**
 * @openapi
 * /auth/login-staff:
 * post:
 * summary: Connexion à l'espace administratif (ADMIN, AGENT, IT)
 * tags:
 * - Auth (Staff)
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - phoneNumber
 * - passCode
 * properties:
 * phoneNumber:
 * type: string
 * example: "+22911111111"
 * passCode:
 * type: string
 * example: "9999"
 * responses:
 * 200:
 * description: Connexion réussie, tokens générés (LOGIN_SUCCESS)
 * 401:
 * description: Code PIN incorrect (BAD_CREDENTIALS)
 * 403:
 * description: Accès refusé ou rôle non autorisé
 * 500:
 * description: Erreur serveur
 */
router.post("/auth/login-staff", authController.loginStaff);

// ==========================================
// FLUX PARTENAIRES (B2B / ENTREPRISES)
// ==========================================

/**
 * @openapi
 * /auth/check-partner:
 * post:
 * summary: Vérifier si un numéro est rattaché à une entreprise partenaire
 * tags:
 * - Auth (Partner)
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - phoneNumber
 * properties:
 * phoneNumber:
 * type: string
 * example: "+22922222222"
 * responses:
 * 200:
 * description: Retourne l'état de l'entreprise (EXISTS ou NOT_FOUND si disponible pour création)
 * 500:
 * description: Erreur serveur
 */
router.post("/auth/check-partner", authController.checkPartnerNumber);

/**
 * @openapi
 * /auth/login-partner:
 * post:
 * summary: Connexion directe de l'espace Entreprise Partenaire (B2B)
 * tags:
 * - Auth (Partner)
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - phoneNumber
 * properties:
 * phoneNumber:
 * type: string
 * example: "+22922222222"
 * responses:
 * 200:
 * description: Authentification de l'établissement réussie (LOGIN_SUCCESS)
 * 404:
 * description: Aucun établissement trouvé avec ce numéro
 * 500:
 * description: Erreur serveur
 */
router.post("/auth/login-partner", authController.loginPartner);

// ==========================================
// LOGOUT
// ==========================================
/**
 * @openapi
 * /auth/logout:
 * post:
 * summary: Invalidation de la session courante
 * tags:
 * - Auth (Global)
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Déconnexion enregistrée (LOGOUT_SUCCESS)
 * 401:
 * description: Token manquant ou expiré
 */
router.post("/auth/logout", jwtMiddleware, authController.logout);

export default router;