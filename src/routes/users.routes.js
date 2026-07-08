import { Router } from "express";
import { usersController } from "../controllers/users.controller.js";
import { loadContext } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { uploadProfilePhoto } from "../middlewares/upload.middleware.js";

const router = Router();
const authStack = [jwtMiddleware, loadContext];

// ==========================================
// --- SECTION 1 : PROFIL & ONBOARDING ---
// ==========================================

/**
 * @openapi
 * /api/users/onboarding:
 * patch:
 * summary: Mettre à jour le profil étape par étape (Onboarding / Édition classique)
 * description: Enregistre les métadonnées de l'utilisateur. Si l'étape transite vers 'CALL_VALIDATION', une session vidéo WebRTC/Twilio est automatiquement initialisée.
 * tags:
 * - Utilisateurs & Profil
 * security:
 * - bearerAuth: []
 * requestBody:
 * content:
 * multipart/form-data:
 * schema:
 * type: object
 * properties:
 * profilePhoto:
 * type: string
 * format: binary
 * description: Fichier image du profil à téléverser
 * fullname:
 * type: string
 * email:
 * type: string
 * birthday:
 * type: string
 * format: date
 * gender:
 * type: string
 * enum: [MALE, FEMALE]
 * pin:
 * type: string
 * religion:
 * type: string
 * passions:
 * type: string
 * height:
 * type: number
 * biography:
 * type: string
 * vision:
 * type: string
 * nextStep:
 * type: string
 * responses:
 * 200:
 * description: Étape d'onboarding validée. Renvoie soit les infos de session d'appel (si complété), soit l'état intermédiaire.
 * 400:
 * description: Requête mal formée ou erreur de contraintes sur les données.
 */
router.patch(
  "/users/onboarding",
  ...authStack,
  uploadProfilePhoto.single("profilePhoto"),
  usersController.updateOnboardingProfile,
);

/**
 * @openapi
 * /api/users/me:
 * get:
 * summary: Récupérer le compte complet de l'utilisateur connecté
 * description: Calcule en temps réel le solde disponible dans le portefeuille financier associé avant de retourner l'état utilisateur synchronisé.
 * tags:
 * - Utilisateurs & Profil
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Profil récupéré avec succès avec mise à jour comptable intégrée.
 * 404:
 * description: Utilisateur introuvable.
 */
router.get("/users/me", ...authStack, usersController.getMyProfile);

/**
 * @openapi
 * /api/users/me/deactivate:
 * post:
 * summary: Mettre temporairement son compte en veille (Désactivation réversible)
 * tags:
 * - Utilisateurs & Profil
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Compte suspendu avec succès. L'utilisateur est déconnecté du système.
 */
router.post("/users/me/deactivate", ...authStack, usersController.deactivateAccount);

/**
 * @openapi
 * /api/users/me/delete:
 * delete:
 * summary: Suppression définitive et complète du compte (Régulation Google Play Store)
 * tags:
 * - Utilisateurs & Profil
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Conformité assurée. Données personnelles effacées définitivement des tables physiques.
 */
router.delete("/users/me/delete", ...authStack, usersController.deleteAccount);


// ==========================================
// --- SECTION 2 : ÉQUIPE INTERNE & PRIVILÈGES ---
// ==========================================

/**
 * @openapi
 * /api/users/permissions/assign:
 * post:
 * summary: Assigner ou écraser un tableau de règles de privilèges à un utilisateur cible
 * tags:
 * - Droits & Équipe Interne
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - targetUserId
 * - permissionIds
 * properties:
 * targetUserId:
 * type: integer
 * permissionIds:
 * type: array
 * items:
 * type: integer
 * responses:
 * 200:
 * description: Permissions reconfigurées avec succès.
 * 403:
 * description: Rupture de privilèges (Ex. un ADMIN tente de rétrograder ou modifier un profil IT).
 */
router.post(
  "/users/permissions/assign",
  ...authStack,
  authorize("STAFF_MANAGE"),
  usersController.assignPermissionsToUser,
);

/**
 * @openapi
 * /api/users/permissions/system-create:
 * post:
 * summary: Injecter une nouvelle clé de droit applicatif dans le dictionnaire système général
 * tags:
 * - Droits & Équipe Interne
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - name
 * - code
 * properties:
 * name:
 * type: string
 * code:
 * type: string
 * description: Code unique de permission (sera forcé en majuscules)
 * description:
 * type: string
 * responses:
 * 201:
 * description: Règle de privilège créée.
 * 400:
 * description: Code de permission déjà alloué ou données manquantes.
 */
router.post(
  "/users/permissions/system-create",
  ...authStack,
  authorize("SYSTEM_MAINTENANCE"),
  usersController.createSystemPermission,
);

/**
 * @openapi
 * /api/users/staff/create:
 * post:
 * summary: Initialiser directement un compte opérationnel pour le personnel (AGENT, ADMIN, IT)
 * tags:
 * - Droits & Équipe Interne
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - phoneNumber
 * - fullname
 * - role
 * - passCode
 * properties:
 * phoneNumber:
 * type: string
 * fullname:
 * type: string
 * role:
 * type: string
 * enum: [AGENT, ADMIN, IT]
 * passCode:
 * type: string
 * description: Code d'accès brut (Sera haché via bcrypt)
 * responses:
 * 201:
 * description: Personnel enregistré et dispensé du tunnel d'onboarding classique.
 * 403:
 * description: Restriction hiérarchique (Un ADMIN ne peut créer un profil de niveau IT).
 */
router.post(
  "/users/staff/create",
  ...authStack,
  authorize("STAFF_MANAGE"),
  usersController.createStaffAccount,
);


// ==========================================
// --- SECTION 3 : ADMINISTRATION DE L'ONBOARDING ---
// ==========================================

/**
 * @openapi
 * /api/users/admin/pending-onboardings:
 * get:
 * summary: Consulter la file d'attente paginée des dossiers d'onboarding nécessitant une approbation par appel
 * tags:
 * - Administration de l'Onboarding
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: query
 * name: page
 * schema:
 * type: integer
 * description: Index de page (Défaut 1)
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * description: Nombre d'enregistrements par lot (Défaut 20)
 * responses:
 * 200:
 * description: File d'attente extraite (triée par ordre chronologique d'arrivée).
 */
router.get(
  "/users/admin/pending-onboardings",
  ...authStack,
  authorize("STAFF_MANAGE"), // Préférer STAFF_MANAGE ou un droit d'audit équivalent selon ton architecture
  usersController.getPendingOnboardings,
);

/**
 * @openapi
 * /api/users/admin/review-account:
 * post:
 * summary: Rendre un arbitrage sur un dossier en attente (Approuver, Rejeter pour correction, Bannir)
 * description: Modifie le statut de complétude et propage l'événement en temps réel via l'instance WebSocket globale (Socket.io).
 * tags:
 * - Administration de l'Onboarding
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - targetUserId
 * - action
 * properties:
 * targetUserId:
 * type: integer
 * action:
 * type: string
 * enum: [APPROVE, REJECT, BAN]
 * reason:
 * type: string
 * description: Motif requis en cas de REJECT ou BAN pour notifier l'utilisateur
 * responses:
 * 200:
 * description: Décision enregistrée et synchronisée sur les clients applicatifs en temps réel.
 * 404:
 * description: Utilisateur cible introuvable.
 */
router.post(
  "/users/admin/review-account",
  ...authStack,
  authorize("STAFF_MANAGE"),
  usersController.reviewPendingAccount,
);

export default router;