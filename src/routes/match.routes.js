import { Router } from 'express';
import { jwtMiddleware } from '../middlewares/jwt.middleware.js';
import { loadContext } from '../middlewares/auth.middleware.js';
import { MatchController } from '../controllers/match.controller.js';

const router = Router();
const authStack = [jwtMiddleware, loadContext];

/**
 * @openapi
 * /api/match/{userId}:
 * get:
 * summary: Vérifier l'état actuel du couple pour un utilisateur spécifique
 * tags:
 * - Matchs & Interactions
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: userId
 * required: true
 * schema:
 * type: integer
 * description: ID de l'utilisateur dont on vérifie le statut de couple
 * responses:
 * 200:
 * description: Statut de couple récupéré avec succès.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * inCouple:
 * type: boolean
 * example: true
 * data:
 * type: object
 * nullable: true
 * description: Détails du match actif si existant.
 * 400:
 * description: ID utilisateur fourni manquant ou invalide.
 * 401:
 * description: Non authentifié.
 * 500:
 * description: Erreur interne du serveur.
 */
router.get('/match/:userId', ...authStack, MatchController.checkCoupleStatus);

/**
 * @openapi
 * /api/match/gifts/send:
 * post:
 * summary: Étape 1 - Envoyer ou acheter un cadeau direct / une approche par annonce
 * tags:
 * - Matchs & Interactions
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - receiverId
 * properties:
 * senderId:
 * type: integer
 * description: ID de l'expéditeur (facultatif si injecté par le token)
 * example: 1
 * receiverId:
 * type: integer
 * description: ID du destinataire ciblé
 * example: 2
 * giftId:
 * type: integer
 * nullable: true
 * description: ID du cadeau virtuel à envoyer (si cadeau simple)
 * example: 12
 * annonceId:
 * type: integer
 * nullable: true
 * description: ID de l'annonce d'entreprise associée (si approche commerciale/sponsoring)
 * example: 45
 * responses:
 * 200:
 * description: Proposition d'interaction enregistrée ou envoyée avec succès.
 * 400:
 * description: Erreur de validation (identifiants incorrects ou absence simultanée de giftId et d'annonceId).
 * 401:
 * description: Non authentifié.
 * 500:
 * description: Erreur interne du serveur.
 */
router.post('/match/gifts/send', ...authStack, MatchController.sendDirectGift);

/**
 * @openapi
 * /api/match/gifts/accept:
 * post:
 * summary: Étape 2 - Accepter un présent ou une approche (Officialise le couple et ouvre la ChatRoom)
 * tags:
 * - Matchs & Interactions
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - senderId
 * properties:
 * receiverId:
 * type: integer
 * description: ID de l'utilisateur connecté acceptant le cadeau (facultatif si injecté par le token)
 * example: 2
 * senderId:
 * type: integer
 * description: ID de l'expéditeur initial de l'offre
 * example: 1
 * giftId:
 * type: integer
 * nullable: true
 * description: ID du cadeau reçu
 * example: 12
 * annonceId:
 * type: integer
 * nullable: true
 * description: ID de l'annonce d'entreprise reçue
 * example: 45
 * matchType:
 * type: string
 * default: "NORMAL"
 * enum: [NORMAL, PREMIUM, SPONSORED]
 * description: Type ou niveau de la relation établie
 * responses:
 * 200:
 * description: Présent accepté, statut de couple actif mis à jour et salon privé ouvert.
 * 400:
 * description: Paramètres manquants ou références d'objets invalides.
 * 401:
 * description: Authentification en échec.
 * 500:
 * description: Erreur interne du serveur.
 */
router.post('/match/gifts/accept', ...authStack, MatchController.acceptDirectGift);

/**
 * @openapi
 * /api/match/break:
 * post:
 * summary: Étape 3 - Rompre un match actif (Unmatch)
 * tags:
 * - Matchs & Interactions
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - partnerId
 * properties:
 * userId:
 * type: integer
 * description: ID de l'utilisateur qui rompt le match (facultatif si injecté par le token)
 * example: 1
 * partnerId:
 * type: integer
 * description: ID du partenaire à dissocier
 * example: 2
 * responses:
 * 200:
 * description: Match rompu avec succès. Clôture des droits d'accès aux salons partagés.
 * 400:
 * description: Paramètres invalides ou aucun match actif trouvé entre les deux parties.
 * 401:
 * description: Jeton expiré ou utilisateur non authentifié.
 * 500:
 * description: Erreur lors du traitement de la rupture.
 */
router.post('/match/break', ...authStack, MatchController.breakMatch);

export default router;