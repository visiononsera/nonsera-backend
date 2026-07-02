import { Router } from 'express';
import { PodiumController } from '../controllers/podium.controller';

const router = Router();

// Route d'interruption (Bouton Danielle cliqué par un utilisateur)
router.post('/danielle/interruption', PodiumController.actionDanielle);

// Route administrative/système pour forcer la rotation
router.post('/admin/trigger-podiums', PodiumController.triggerRounds);

export default router;