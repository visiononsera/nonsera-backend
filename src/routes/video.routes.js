import { Router } from "express";
import { videoValidationController } from "../controllers/videoValidation.controller.js";
import { loadContext } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { jwtMiddleware } from '../middlewares/jwt.middleware.js';

const router = Router();
const authStack = [jwtMiddleware, loadContext];

// ==========================================
// --- ESPACE CLIENT CONNECTÉ ---
// ==========================================

/**
 * @openapi
 * /api/video/ping:
 * post:
 * summary: Maintenir ou relancer le statut de présence dans la file d'attente (Heartbeat 5 min)
 * description: Permet au client de signaler qu'il attend toujours l'appel d'un agent. Actualise le timestamp pour éviter le timeout de son ticket WebRTC.
 * tags:
 * - Validation Vidéo (Client)
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Signal de présence enregistré. Renvoie l'identifiant de la room de communication active.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * message:
 * type: string
 * data:
 * type: object
 * properties:
 * roomId:
 * type: string
 * example: "rm_abc123xyz"
 * 400:
 * description: Impossible de traiter le ping (Onboarding non éligible ou session expirée).
 * 401:
 * description: Authentification manquante ou jeton invalide.
 */
router.post("/video/ping", ...authStack, videoValidationController.pingStatus);


// ==========================================
// --- ESPACE AGENT DE VALIDATION ---
// ==========================================

/**
 * @openapi
 * /api/video/next-ticket:
 * get:
 * summary: Récupérer et s'assigner le prochain dossier de validation en attente (FIFO)
 * description: Opération atomique isolée par transaction BDD. Sélectionne le ticket le plus ancien au statut 'AWAITING', bascule instantanément son état à 'IN_CALL' et l'attribue à l'agent requérant.
 * tags:
 * - Validation Vidéo (Agent/Staff)
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Retourne le profil utilisateur à inspecter ainsi que les coordonnées de la room vidéo associée.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * message:
 * type: string
 * data:
 * type: object
 * properties:
 * sessionId:
 * type: integer
 * example: 45
 * roomId:
 * type: string
 * example: "rm_abc123xyz"
 * clientProfile:
 * type: object
 * properties:
 * id:
 * type: integer
 * fullname:
 * type: string
 * username:
 * type: string
 * phoneNumber:
 * type: string
 * role:
 * type: string
 * onboardingStep:
 * type: string
 * 401:
 * description: Session agent invalide.
 * 403:
 * description: Privilèges insuffisants (Droit 'CALL_VALIDATION' obligatoire).
 */
router.get("/video/next-ticket", ...authStack, authorize("CALL_VALIDATION"), videoValidationController.fetchNextAwaitingUser);

/**
 * @openapi
 * /api/video/decision:
 * post:
 * summary: Clôturer une session vidéo et soumettre la décision administrative sur le compte cible
 * description: Applique la décision de l'agent en modifiant le statut global de complétude ou de restriction de l'utilisateur, puis détruit la session active pour vider la file d'attente opérationnelle.
 * tags:
 * - Validation Vidéo (Agent/Staff)
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - sessionId
 * - decision
 * properties:
 * sessionId:
 * type: integer
 * description: L'identifiant de la session vidéo active
 * example: 45
 * decision:
 * type: string
 * enum: [VALIDATED, REJECTED, BANNED]
 * description: |
 * * `VALIDATED` : Le compte passe complet et l'onboarding se termine.
 * * `REJECTED` : Renvoie l'utilisateur à l'étape initiale pour corriger ses données.
 * * `BANNED` : Verrouille définitivement l'accès de l'utilisateur au système.
 * example: "VALIDATED"
 * responses:
 * 200:
 * description: Sanction ou approbation appliquée avec succès. Session détruite proprement.
 * 400:
 * description: Paramètres manquants ou invalides.
 * 404:
 * description: Session de validation introuvable en base de données.
 */
router.post("/video/decision", ...authStack, authorize("CALL_VALIDATION"), videoValidationController.handleAgentDecision);

export default router;