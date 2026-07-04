import { Router } from 'express';
import { PodiumController } from '../controllers/podium.controller';
import { jwtMiddleware } from '../middlewares/jwt.middleware';
import { loadContext } from '../middlewares/auth.middleware';

const router = Router();

/**
 * Nouvelle Route Récupérer la Star active du podium pour le spectateur connecté
 * GET /podiums/current-star
 */
router.get('/podiums/current-star', jwtMiddleware, loadContext, PodiumController.getCurrentStarForSpectator);

/**
 * Étape 1 : Le spectateur clique sur le bouton Danielle et envoie un cadeau
 * POST /podiums/danielle/send-gift
 */
router.post('/podiums/danielle/send-gift',  jwtMiddleware,  loadContext,  PodiumController.sendDaniellePresent);

/**
 * Étape 2 : La Star accepte le cadeau reçu
 * POST /podiums/danielle/accept-gift
 */
router.post('/podiums/danielle/accept-gift',  jwtMiddleware,  loadContext,  PodiumController.acceptDaniellePresent);


// --- ADMINISTRATION / SYSTÈME ---

/**
 * Route système
 * POST /podiums/admin/trigger-podiums
 */
router.post('/podiums/admin/trigger-podiums',  jwtMiddleware,  loadContext, PodiumController.triggerRounds);

export default router;