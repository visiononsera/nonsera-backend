import { Router } from "express";
import { MatchController } from "../controllers/match.controller.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { loadContext } from "../middlewares/auth.middleware.js";

const router = Router();
const authStack = [jwtMiddleware, loadContext];

/**
 * @openapi
 * /api/matches/status/{userId}:
 * get:
 * summary: Consulter l'état d'engagement relationnel de l'utilisateur (Couple / Célibataire)
 * tags:
 * - Matchmaking & Couple
 * parameters:
 * - in: path
 * name: userId
 * required: true
 * schema:
 * type: integer
 * responses:
 * 200:
 * description: Statut couple extrait avec succès.
 */
router.get(
  "/matches/status/:userId",
  ...authStack,
  MatchController.checkCoupleStatus,
);

/**
 * @openapi
 * /api/matches/gifts/send:
 * post:
 * summary: Étape 1 - Proposer un cadeau d'approche (Initie la discussion s'il est accepté)
 * tags:
 * - Matchmaking (Cadeaux)
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
 * receiverId:
 * type: integer
 * giftId:
 * type: integer
 * description: ID du cadeau standard (table Gift)
 * annonceId:
 * type: integer
 * description: ID du produit/service d'établissement partenaire (table Annonce)
 * responses:
 * 200:
 * description: Demande d'attention enregistrée, solde bloqué.
 */
router.post(
  "/matches/gifts/send",
  ...authStack,
  MatchController.sendDirectGift,
);

/**
 * @openapi
 * /api/matches/gifts/accept:
 * post:
 * summary: Étape 2 - Accepter l'approche cadeau (Ouvre automatiquement le chat de couple)
 * tags:
 * - Matchmaking
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
 * senderId:
 * type: integer
 * description: ID de la personne qui a offert le cadeau
 * giftId:
 * type: integer
 * annonceId:
 * type: integer
 * matchType:
 * type: string
 * default: "NORMAL"
 * responses:
 * 200:
 * description: Offre acceptée. ChatRoom ouverte et Match actif créé.
 */


router.post(
  "/matches/gifts/accept",
  ...authStack,
  MatchController.acceptDirectGift,
);

/**
 * @openapi
 * /api/matches/break:
 * post:
 * summary: Rompre définitivement la relation de couple actuelle (Retour en statut célibataire)
 * tags:
 * - Matchmaking
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
 * partnerId:
 * type: integer
 * description: ID du partenaire à unmatch
 * responses:
 * 200:
 * description: Rupture actée, statut de couple éteint.
 */
router.post("/matches/break", ...authStack, MatchController.breakMatch);

export default router;
