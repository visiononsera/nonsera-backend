import { Router } from "express";
import { EnveloppeController } from "../controllers/enveloppe.controller.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { loadContext } from "../middlewares/auth.middleware.js";  

const router = Router();
const authStack = [jwtMiddleware, loadContext];

// Route pour l'état d'éligibilité et les barres de progression
router.get("/envelopes/eligibility", ...authStack, EnveloppeController.getEligibility);

// Route pour enregistrer la présence active de l'utilisateur (à appeler toutes les 30s en tâche de fond)
router.post("/envelopes/heartbeat", ...authStack, EnveloppeController.sendHeartbeat);

// Route pour déclencher le tirage interactif de la roulette
router.post("/envelopes/spin", ...authStack, EnveloppeController.spin);

// Route pour le fil de défilement (ticker) des derniers gagnants du pays
router.get("/envelopes/recent-winners", ...authStack, EnveloppeController.getRecentWinners);

export default router;