import { Router } from 'express';
import { PodiumController } from '../controllers/podium.controller';
import { jwtMiddleware } from '../middlewares/jwt.middleware';
import { loadContext } from '../middlewares/auth.middleware';

const router = Router();

/**
 * Étape 1 : Le spectateur clique sur le bouton Danielle et envoie un cadeau
 * POST /podiums/danielle/send-gift
 */
router.post('/podiums/danielle/send-gift',  jwtMiddleware,  loadContext,  PodiumController.sendDanielleGift);

/**
 * Étape 2 : La Star accepte le cadeau reçu
 * POST /podiums/danielle/accept-gift
 */
router.post('/podiums/danielle/accept-gift',  jwtMiddleware,  loadContext,  PodiumController.acceptDanielleGift);


// --- ADMINISTRATION / SYSTÈME ---

/**
 * Route système
 * POST /podiums/admin/trigger-podiums
 */
router.post('/podiums/admin/trigger-podiums',  jwtMiddleware,  loadContext, PodiumController.triggerRounds);

export default router;