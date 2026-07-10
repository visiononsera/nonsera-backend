import { Router } from "express";
import { coffretsController } from "../controllers/coffrets.controller.js";
import { loadContext } from "../middlewares/auth.middleware.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";

const router = Router();
const authStack = [jwtMiddleware, loadContext];


// ======================================================
// FLUX PUBLICS / RECHERCHE (AUTHENTIFICATION OPTIONNELLE OU REQUISE SELON VOS STANDARDS)
// ======================================================

/**
 * @openapi
 * /coffrets:
 * get:
 * summary: Récupérer les coffrets disponibles à proximité ou par recherche
 * tags:
 * - Coffrets Romantiques
 * parameters:
 * - in: query
 * name: latitude
 * schema:
 * type: number
 * description: Latitude actuelle de l'utilisateur (tri de proximité)
 * - in: query
 * name: longitude
 * schema:
 * type: number
 * description: Longitude actuelle de l'utilisateur (tri de proximité)
 * - in: query
 * name: searchQuery
 * schema:
 * type: string
 * description: Nom d'une ville ou d'un pays saisi librement pour filtrer
 * - in: query
 * name: maxDistanceKm
 * schema:
 * type: number
 * description: Rayon kilométrique d'action pour la géolocalisation
 * responses:
 * 200:
 * description: Liste des coffrets disponibles ordonnés de façon pertinente
 * 500:
 * description: Erreur serveur
 */
router.get("/coffrets", ...authStack, coffretsController.getAvailableCoffrets);

/**
 * @openapi
 * /coffrets/{id}:
 * get:
 * summary: Obtenir les détails complets d'un coffret et de ses inclusions
 * tags:
 * - Coffrets Romantiques
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: Identifiant unique du coffret
 * responses:
 * 200:
 * description: Fiche détaillée du coffret avec son entreprise créatrice et ses inclusions
 * 404:
 * description: Coffret introuvable
 * 500:
 * description: Erreur serveur
 */
router.get("/coffrets/:id", ...authStack, coffretsController.getCoffretById);

// ======================================================
// FLUX PRIVÉS / TRANSACTIONS FINANCIÈRES (AUTHENTIFICATION SÉCURISÉE REQUISE)
// ======================================================

/**
 * @openapi
 * /coffrets/book:
 * post:
 * summary: Réserver un coffret clé en main avec débit wallet unifié FIFO
 * tags:
 * - Coffrets Romantiques
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - coffretId
 * - startDate
 * - quantity
 * properties:
 * coffretId:
 * type: integer
 * startDate:
 * type: string
 * format: date-time
 * example: "2026-08-14T19:00:00.000Z"
 * quantity:
 * type: integer
 * description: Nombre de personnes (si > 1, réduction de 10%)
 * example: 2
 * responses:
 * 201:
 * description: Coffret réservé avec succès et wallet débité
 * 402:
 * description: Solde insuffisant (code d'erreur SOLDE_INSUFFISANT)
 * 500:
 * description: Erreur serveur
 */
router.post("/coffrets/book", ...authStack, coffretsController.bookCoffret);

/**
 * @openapi
 * /coffrets/cancel:
 * post:
 * summary: Annuler une réservation de coffret (Remboursement si <= 72h après achat)
 * tags:
 * - Coffrets Romantiques
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - reservationId
 * properties:
 * reservationId:
 * type: integer
 * responses:
 * 200:
 * description: Réservation annulée (remboursement calculé et exécuté)
 * 500:
 * description: Erreur serveur
 */
router.post("/coffrets/cancel", ...authStack, coffretsController.cancelCoffretBooking);

export default router;