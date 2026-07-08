import { Router } from "express";
import { loadContext } from "../middlewares/auth.middleware.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { globalSearch } from "../controllers/search.controller.js";

const router = Router();
const authStack = [jwtMiddleware, loadContext];

/**
 * @openapi
 * /api/search:
 * get:
 * summary: Exécuter une recherche globale multi-critères (Utilisateurs, Partenaires, Offres)
 * description: Interroge simultanément les comptes utilisateurs, les établissements partenaires et les annonces promotionnelles avec un ordonnancement prioritaire basé sur le pays.
 * tags:
 * - Moteur de Recherche
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: query
 * name: query
 * required: true
 * schema:
 * type: string
 * minLength: 4
 * description: Terme ou chaîne de recherche (Minimum 4 caractères exigés)
 * example: "hotel"
 * - in: query
 * name: countryCode
 * required: false
 * schema:
 * type: string
 * description: Code ISO ou libellé du pays pour appliquer le tri de priorité géographique
 * example: "BJ"
 * responses:
 * 200:
 * description: Résultats agrégés et formatés par type de entités (users, partners, promos).
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * data:
 * type: object
 * properties:
 * users:
 * type: array
 * items:
 * type: object
 * properties:
 * id:
 * type: integer
 * type:
 * type: string
 * example: "USER"
 * title:
 * type: string
 * subtitle:
 * type: string
 * avatar:
 * type: string
 * isLocalCountry:
 * type: boolean
 * partners:
 * type: array
 * items:
 * type: object
 * properties:
 * id:
 * type: integer
 * type:
 * type: string
 * example: "PARTNER"
 * title:
 * type: string
 * subtitle:
 * type: string
 * category:
 * type: string
 * isLocalCountry:
 * type: boolean
 * promos:
 * type: array
 * items:
 * type: object
 * properties:
 * id:
 * type: integer
 * type:
 * type: string
 * example: "PROMO"
 * title:
 * type: string
 * subtitle:
 * type: string
 * avatar:
 * type: string
 * isLocalCountry:
 * type: boolean
 * 400:
 * description: Requête invalide (Paramètre manquant ou chaîne de moins de 4 caractères).
 * 401:
 * description: Authentification requise.
 * 500:
 * description: Erreur lors du traitement de la requête par le serveur.
 */
router.get('/search', ...authStack, globalSearch);

export default router;