import { Router } from "express";
import { loadContext } from "../middlewares/auth.middleware.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { walletController } from "../controllers/wallet.controller.js";

const router = Router();

/**
 * @route   GET /api/wallet/summary
 * @desc    Obtenir la synthèse des comptes (Principal, Bonus, Starpoints)
 * @access  Privé
 */
router.get("/wallet/summary", jwtMiddleware, loadContext, walletController.getSummary);

/**
 * @route   GET /api/wallet/history
 * @desc    Obtenir l'historique complet linéaire de toutes les tranches/mouvements
 * @access  Privé
 */
router.get("/wallet/history", jwtMiddleware, loadContext, walletController.getHistory);

/**
 * @route   POST /api/wallet/debit
 * @desc    Initier un paiement/débit sur le wallet via le mécanisme FIFO
 * @access  Privé
 */
router.post("/wallet/debit", jwtMiddleware, loadContext, walletController.debit);

/**
 * @route   POST /api/wallet/lumiere-transfer
 * @desc    Transférer du solde principal à un tiers (Cas 7 : sans débloquer de bonus)
 * @access  Privé
 */
router.post("/wallet/lumiere-transfer", jwtMiddleware, loadContext, walletController.transferLumiere);

/**
 * @route   POST /api/wallet/test-sandbox-recharge
 * @desc    Simuler un versement avec un numéro MoMo ou RIB magique de test
 * @access  Privé (Réservé au développement / Sandbox)
 */
router.post("/wallet/test-sandbox-recharge", jwtMiddleware, loadContext, walletController.simulateTestRecharge);

/**
 * @route   POST /api/wallet/webhook/kkiapay
 * @desc    Point d'entrée public de production pour Kkiapay
 * @access  Public
 */
router.post("/wallet/webhook/kkiapay", walletController.handleKkiapayWebhook);

router.post("/bonus/lock", jwtMiddleware, loadContext, walletController.lockBonus);
router.post("/bonus/unlock", jwtMiddleware, loadContext, walletController.unlockBonus);

export default router;