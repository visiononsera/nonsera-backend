import { Router } from "express";
import { loadContext } from "../middlewares/auth.middleware.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { walletController } from "../controllers/wallet.controller.js";

const router = Router();
const authStack = [jwtMiddleware, loadContext];

// ==========================================
// --- SECTION 1 : OPÉRATIONS CLIENT ---
// ==========================================

/**
 * @openapi
 * /api/wallet/summary:
 * get:
 * summary: Obtenir la synthèse financière globale des comptes
 * description: Renvoie l'agrégat calculé des différents soldes de l'utilisateur (Principal utilisable, Bonus disponibles, Starpoints acquis).
 * tags:
 * - Portefeuille (Client)
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Synthèse extraite avec succès.
 * 401:
 * description: Jeton manquant ou utilisateur invalide.
 */
router.get("/wallet/summary", ...authStack, walletController.getSummary);

/**
 * @openapi
 * /api/wallet/history:
 * get:
 * summary: Obtenir l'historique complet linéaire des mouvements de compte
 * description: Liste paginée chronologique de l'ensemble des débits et tranches de crédits appliqués au compte.
 * tags:
 * - Portefeuille (Client)
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: query
 * name: page
 * schema:
 * type: integer
 * default: 1
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * default: 20
 * responses:
 * 200:
 * description: Historique récupéré.
 */
router.get("/wallet/history", ...authStack, walletController.getHistory);

/**
 * @openapi
 * /api/wallet/debit:
 * post:
 * summary: Initier un paiement ou un débit sur le portefeuille (Règle FIFO)
 * description: Déduis un montant spécifique du solde de l'utilisateur en consommant en priorité les tranches éligibles selon l'algorithme First In, First Out.
 * tags:
 * - Portefeuille (Client)
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - amount
 * properties:
 * amount:
 * type: number
 * minimum: 0.1
 * description:
 * type: string
 * responses:
 * 200:
 * description: Débit effectué avec succès.
 * 400:
 * description: Fonds insuffisants ou montant invalide.
 */
router.post("/wallet/debit", ...authStack, walletController.debit);

/**
 * @openapi
 * /api/wallet/lumiere-transfer:
 * post:
 * summary: Effectuer un transfert direct de solde principal "Lumière" de pair à pair
 * description: Permet d'envoyer une quote-part de son solde principal direct à un tiers sans affecter ni débloquer les tranches de bonus sous-jacentes.
 * tags:
 * - Portefeuille (Client)
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
 * - amount
 * properties:
 * receiverId:
 * type: integer
 * amount:
 * type: number
 * responses:
 * 200:
 * description: Transfert P2P exécuté.
 * 400:
 * description: Solde insuffisant ou destinataire invalide.
 */
router.post("/wallet/lumiere-transfer", ...authStack, walletController.transferLumiere);


// ==========================================
// --- SECTION 2 : ADMINISTRATION & SYSTEM MANAGEMENT ---
// ==========================================

/**
 * @openapi
 * /api/wallet/refund:
 * post:
 * summary: Créditer un remboursement sur une transaction ou tranche d'origine
 * tags:
 * - Portefeuille (Administration)
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - userId
 * - originalTrancheId
 * - amountToRefund
 * properties:
 * userId:
 * type: integer
 * originalTrancheId:
 * type: string
 * amountToRefund:
 * type: number
 * reason:
 * type: string
 * responses:
 * 200:
 * description: Remboursement validé et tracé.
 * 403:
 * description: Droits restreints.
 */
router.post("/wallet/refund", ...authStack, authorize("FINANCIAL_ADMIN"), walletController.refundWallet);

/**
 * @openapi
 * /api/wallet/bonus/lock:
 * post:
 * summary: Poser un gel conservatoire de sécurité sur un montant de bonus
 * tags:
 * - Portefeuille (Administration)
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - amountToLock
 * properties:
 * userId:
 * type: integer
 * description: ID optionnel (Prend l'utilisateur courant si omis)
 * amountToLock:
 * type: number
 * reason:
 * type: string
 * responses:
 * 200:
 * description: Montant bloqué avec succès.
 */
router.post("/wallet/bonus/lock", ...authStack, authorize("FINANCIAL_ADMIN"), walletController.lockBonus);

/**
 * @openapi
 * /api/wallet/bonus/unlock:
 * post:
 * summary: Lever le gel de sécurité sur un montant de bonus
 * tags:
 * - Portefeuille (Administration)
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - amountToUnlock
 * properties:
 * userId:
 * type: integer
 * amountToUnlock:
 * type: number
 * reason:
 * type: string
 * responses:
 * 200:
 * description: Bonus débloqué et réinjecté dans les encours utilisables.
 */
router.post("/wallet/bonus/unlock", ...authStack, authorize("FINANCIAL_ADMIN"), walletController.unlockBonus);

/**
 * @openapi
 * /api/wallet/bonus/trigger-expiration:
 * post:
 * summary: Déclencher manuellement ou via CRON la purge des bonus obsolètes
 * description: Parcourt la base de données pour invalider et expirer les tranches de bonus ayant dépassé leur date limite d'utilisation.
 * tags:
 * - Portefeuille (Administration)
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Purge effectuée.
 */
router.post("/wallet/bonus/trigger-expiration", ...authStack, authorize("SYSTEM_MAINTENANCE"), walletController.expireOldBonus);


// ==========================================
// --- SECTION 3 : ENVIRONNEMENTS & GATEWAYS (SANDBOX / INCOMING) ---
// ==========================================

/**
 * @openapi
 * /api/wallet/test-sandbox-recharge:
 * post:
 * summary: Simuler un versement sur le portefeuille de test (Environnement Sandbox)
 * description: Permet d'alimenter son compte fictif en utilisant les identifiants magiques configurés (Ex. Numéro MoMo ou RIB Banque factice dédié au Sandbox).
 * tags:
 * - Portefeuille (Sandbox)
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - amount
 * - method
 * - testIdentifier
 * properties:
 * amount:
 * type: number
 * method:
 * type: string
 * enum: [MOBILE_MONEY, CARD_BANK]
 * testIdentifier:
 * type: string
 * description: Utiliser '0100000000' pour MoMo ou 'BJ0620100100000000000180' pour carte/RIB.
 * responses:
 * 201:
 * description: Recharge simulée acceptée et créditée.
 */
router.post("/wallet/test-sandbox-recharge", ...authStack, walletController.simulateTestRecharge);

/**
 * @openapi
 * /api/wallet/webhook/kkiapay:
 * post:
 * summary: Point d'entrée de notification asynchrone (Webhook Kkiapay)
 * description: Endpoint public consommé directement par les serveurs de la passerelle Kkiapay pour confirmer la réussite d'un paiement en production.
 * tags:
 * - Passerelles de Paiement
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - status
 * - amount
 * - metadata
 * properties:
 * status:
 * type: string
 * amount:
 * type: number
 * transactionId:
 * type: string
 * metadata:
 * type: object
 * required:
 * - userId
 * properties:
 * userId:
 * type: integer
 * countryCode:
 * type: string
 * responses:
 * 201:
 * description: Webhook traité et provisionné.
 * 200:
 * description: Statut non géré ou ignoré de manière sécurisée (Évite les retries intempestifs de l'agrégateur).
 * 400:
 * description: Métadonnées obligatoires corrompues ou absentes.
 */
router.post("/wallet/webhook/kkiapay", walletController.handleKkiapayWebhook);

export default router;