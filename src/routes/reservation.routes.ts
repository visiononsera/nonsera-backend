import { Router } from "express";
import { loadContext } from "../middlewares/auth.middleware";
import { jwtMiddleware } from "../middlewares/jwt.middleware";
import { reservationsController } from "../controllers/reservation.controller";

const router = Router();

// Toutes les routes de réservation nécessitent généralement d'être connecté
// Créer une réservation 
router.post("/", jwtMiddleware, loadContext, reservationsController.create);
// Annuler une réservation 
router.post("/:id/cancel", jwtMiddleware, loadContext, reservationsController.cancel);
// Accepter | Confirmer une réservation 
router.patch("/:id/confirm", jwtMiddleware, loadContext,reservationsController.confirm);
// Démarrer la course 
router.patch("/:id/start-trip", jwtMiddleware, loadContext, reservationsController.startTrip);
// Finaliser la course | Débloquer les fonds manuellement
router.patch("/:id/complete", jwtMiddleware, loadContext, reservationsController.completeOrProcess);
// Signaler un problème 
router.post("/:id/dispute", jwtMiddleware, loadContext, reservationsController.openDispute);


// --- ROUTE ADMIN PRIVILÉGIÉE ---

// Trancher un litige
router.patch("/:id/resolve-dispute", jwtMiddleware, loadContext, reservationsController.resolveDispute);

export default router;