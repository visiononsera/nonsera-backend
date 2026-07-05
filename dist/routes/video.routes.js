import { Router } from "express";
import { videoValidationController } from "../controllers/videoValidation.controller";
import { loadContext } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { jwtMiddleware } from '../middlewares/jwt.middleware';
const router = Router();
// ==========================================
// ESPACE CLIENT CONNECTÉ
// ==========================================
router.post("/video/ping", jwtMiddleware, loadContext, videoValidationController.pingStatus);
// ==========================================
// ESPACE AGENT DE VALIDATION
// ==========================================
router.get("/video/next-ticket", jwtMiddleware, loadContext, authorize("CALL_VALIDATION"), videoValidationController.fetchNextAwaitingUser);
router.post("/video/decision", jwtMiddleware, loadContext, authorize("CALL_VALIDATION"), videoValidationController.handleAgentDecision);
export default router;
//# sourceMappingURL=video.routes.js.map