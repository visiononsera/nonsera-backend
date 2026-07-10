import { Router } from "express";
import { MoreauController } from "../controllers/moreau.controller.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { loadContext } from "../middlewares/auth.middleware.js";

const router = Router();
const authStack = [jwtMiddleware, loadContext];

/**
 * @openapi
 * /api/moreau/button-state:
 *   get:
 *     summary: Récupérer l'état dynamique temps réel du bouton P. MOREAU (Mode Célibataire ou Jauge Couple)
 *     tags:
 *       - Bouton P. MOREAU
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: État renvoyé avec succès. S'adapte au statut de relation de l'utilisateur connecté.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Corps de l'état du bouton (SINGLE ou COUPLE)
 *       401:
 *         description: Non authentifié.
 *         500:
 *           description: Erreur interne du serveur.
 */
router.get(
  "/moreau/button-state",
  ...authStack,
  MoreauController.getButtonState,
);

export default router;
