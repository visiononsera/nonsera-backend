import { Router } from "express";
import { EnveloppeController } from "../controllers/enveloppe.controller.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { loadContext } from "../middlewares/auth.middleware.js";  

const router = Router();
const authStack = [jwtMiddleware, loadContext];

// Route pour l'état d'éligibilité et les barres de progression
router.get("/envelopes/eligibility", ...authStack, EnvelopeController.getEligibility);

// Route publique/partagée pour le fil de défilement des derniers gagnants
router.get("/envelopes/recent-winners", ...authStack, EnvelopeController.getRecentWinners);

export default router;