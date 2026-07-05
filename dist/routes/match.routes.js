import { Router } from 'express';
import { jwtMiddleware } from '../middlewares/jwt.middleware';
import { loadContext } from '../middlewares/auth.middleware';
import { MatchController } from '../controllers/match.controller';
const router = Router();
router.get('/match/:userId', jwtMiddleware, loadContext, MatchController.checkCoupleStatus);
// Gestion des interactions par cadeaux directs
router.post('/match/gifts/send', jwtMiddleware, loadContext, MatchController.sendDirectGift);
router.post('/match/gifts/accept', jwtMiddleware, loadContext, MatchController.acceptDirectGift);
// Rupture de match
router.post('/match/break', jwtMiddleware, loadContext, MatchController.breakMatch);
export default router;
//# sourceMappingURL=match.routes.js.map