import { Router } from 'express';
import { PodiumController } from '../controllers/podium.controller.js';
import { jwtMiddleware } from '../middlewares/jwt.middleware.js';
import { loadContext } from '../middlewares/auth.middleware.js';

const router = Router();
const authStack = [jwtMiddleware, loadContext];

// ==========================================
// --- INTERACTIONS & CONSULTATION PODIUM ---
// ==========================================

/**
 * @openapi
 * /api/podiums/current-star:
 * get:
 * summary: Récupérer la Star active actuellement mise en avant sur le podium pour le spectateur connecté
 * tags:
 * - Podiums & Événements
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Métadonnées de la Star active récupérées avec succès.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * roundId:
 * type: integer
 * example: 10
 * timeDue:
 * type: string
 * format: date-time
 * example: "2026-07-08T06:30:00.000Z"
 * spot:
 * type: integer
 * example: 1
 * star:
 * type: object
 * description: Informations du profil de la Star.
 * 401:
 * description: Non authentifié ou jeton invalide.
 * 500:
 * description: Erreur interne du serveur.
 */
router.get('/podiums/current-star', ...authStack, PodiumController.getCurrentStarForSpectator);

/**
 * @openapi
 * /api/podiums/danielle/send-gift:
 * post:
 * summary: Étape 1 - Envoyer un présent ou une approche par annonce à la Star active (Bouton Danielle)
 * tags:
 * - Podiums & Événements
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - podiumStarId
 * properties:
 * senderId:
 * type: integer
 * description: ID de l'expéditeur (injecté par défaut via le jeton si omis)
 * example: 5
 * podiumStarId:
 * type: integer
 * description: ID unique de l'enregistrement PodiumStar ciblé
 * example: 24
 * presentId:
 * type: integer
 * nullable: true
 * description: ID du cadeau virtuel à attribuer
 * example: 14
 * annonceId:
 * type: integer
 * nullable: true
 * description: ID de l'annonce commerciale ou du sponsoring d'entreprise choisi
 * example: 89
 * responses:
 * 200:
 * description: Proposition transmise à la Star du podium. En attente de validation.
 * 400:
 * description: Identifiants requis absents, ou absence simultanée de présent et d'annonce.
 * 410:
 * description: Ce round de podium n'est plus actif, a expiré ou a été remplacé.
 * 500:
 * description: Erreur interne du serveur.
 */
router.post('/podiums/danielle/send-gift', ...authStack, PodiumController.sendDaniellePresent);

/**
 * @openapi
 * /api/podiums/danielle/accept-gift:
 * post:
 * summary: Étape 2 - Validation par la Star de l'attention reçue (Active le Match BOOST et ferme le round)
 * tags:
 * - Podiums & Événements
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - podiumStarId
 * - matchSenderId
 * properties:
 * podiumStarId:
 * type: integer
 * description: ID unique du round PodiumStar
 * example: 24
 * matchSenderId:
 * type: integer
 * description: ID du spectateur initiateur de l'offre
 * example: 5
 * presentId:
 * type: integer
 * nullable: true
 * description: Référence du présent virtuel associé
 * example: 14
 * annonceId:
 * type: integer
 * nullable: true
 * description: Référence de l'annonce d'entreprise associée
 * example: 89
 * responses:
 * 200:
 * description: Attention acceptée. Match BOOST officialisé et transition immédiate du podium effectuée.
 * 400:
 * description: Paramètres obligatoires manquants ou formats erronés.
 * 401:
 * description: Non authentifié.
 * 500:
 * description: Erreur système lors de la clôture ou de la passation de round.
 */
router.post('/podiums/danielle/accept-gift', ...authStack, PodiumController.acceptDaniellePresent);


// ==========================================
// --- ADMINISTRATION / SYSTÈME ---
// ==========================================

/**
 * @openapi
 * /api/podiums/admin/trigger-podiums:
 * post:
 * summary: Forcer manuellement la régénération immédiate des files d'attente et rounds de podium pour un pays cible
 * tags:
 * - Administration
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - country
 * properties:
 * country:
 * type: string
 * description: Code ou nom complet du pays à mettre à jour (génère les flux MALE et FEMALE)
 * example: "Bénin"
 * responses:
 * 200:
 * description: Processus de génération parallèle achevé. Les podiums nationaux sont actualisés.
 * 400:
 * description: Le paramètre country est obligatoire.
 * 401:
 * description: Droits d'administration ou jeton manquants.
 * 500:
 * description: Échec de traitement lors du recalcul des scores ou des sélections Prisma.
 */
router.post('/podiums/admin/trigger-podiums', ...authStack, PodiumController.triggerRounds);

export default router;