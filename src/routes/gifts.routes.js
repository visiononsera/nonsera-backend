import { Router } from "express";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { loadContext } from "../middlewares/auth.middleware.js";
import { giftsController } from "../controllers/gifts.controller.js";

const router = Router();
const authStack = [jwtMiddleware, loadContext];

// ======================================================
// GESTION DU CATALOGUE (ADMIN / AGENT / BACK-OFFICE)
// ======================================================

/**
 * @openapi
 * /api/gifts:
 * post:
 * summary: Créer un nouveau présent dans le catalogue
 * tags:
 * - Gifts (Catalogue)
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - name
 * - price
 * - image
 * properties:
 * name:
 * type: string
 * example: "Coffret Box Premium"
 * price:
 * type: number
 * example: 25000
 * points:
 * type: number
 * example: 150
 * image:
 * type: string
 * example: "https://cdn.example.com/images/gift-box.png"
 * description:
 * type: string
 * example: "Un coffret surprise contenant des articles haut de gamme."
 * category:
 * type: string
 * example: "PHYSICAL"
 * companyId:
 * type: integer
 * example: 4
 * responses:
 * 201:
 * description: Cadeau généré et enregistré au catalogue avec succès.
 * 400:
 * description: Paramètres requis manquants ou types incorrects.
 * 401:
 * description: Non authentifié.
 */
router.post("/gifts", ...authStack, giftsController.create);

/**
 * @openapi
 * /api/gifts/{id}:
 * put:
 * summary: Mettre à jour un présent existant par son ID
 * tags:
 * - Gifts (Catalogue)
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID unique du cadeau à modifier
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * name:
 * type: string
 * price:
 * type: number
 * points:
 * type: number
 * image:
 * type: string
 * description:
 * type: string
 * category:
 * type: string
 * responses:
 * 200:
 * description: Métadonnées du présent mises à jour.
 * 401:
 * description: Non autorisé.
 * 404:
 * description: Cadeau introuvable.
 */
router.put("/gifts/:id", ...authStack, giftsController.update);

/**
 * @openapi
 * /api/gifts/{id}:
 * delete:
 * summary: Suppression logique (désactivation) d'un présent du catalogue
 * tags:
 * - Gifts (Catalogue)
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID du cadeau à désactiver
 * responses:
 * 200:
 * description: Cadeau retiré du catalogue (désactivé) avec succès.
 * 401:
 * description: Jeton invalide ou droits insuffisants.
 * 404:
 * description: Ressource introuvable.
 */
router.delete("/gifts/:id", ...authStack, giftsController.delete);

// ======================================================
// ROUTES PUBLIQUES / CONSULTATION DU CATALOGUE
// ======================================================

/**
 * @openapi
 * /api/gifts:
 * get:
 * summary: Récupérer tous les présents disponibles (Filtres optionnels)
 * tags:
 * - Gifts (Catalogue)
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: query
 * name: category
 * schema:
 * type: string
 * description: Filtrer par catégorie d'objet cadeau
 * - in: query
 * name: companyId
 * schema:
 * type: integer
 * description: Filtrer par identifiant d'entreprise partenaire
 * responses:
 * 200:
 * description: Collection de présents récupérée.
 * 401:
 * description: Non authentifié.
 */
router.get("/gifts", ...authStack, giftsController.getAllAvailable);

/**
 * @openapi
 * /api/gifts/{id}:
 * get:
 * summary: Récupérer les détails d'un présent spécifique par son ID
 * tags:
 * - Gifts (Catalogue)
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID unique du cadeau
 * responses:
 * 200:
 * description: Données détaillées du cadeau demandées.
 * 404:
 * description: Aucun cadeau correspondant à cet ID.
 */
router.get("/gifts/:id", ...authStack, giftsController.getById);

// ======================================================
// PRÉFÉRENCES UTILISATEURS & HISTORIQUE DES RÉCEPTIONS
// ======================================================

/**
 * @openapi
 * /api/gifts/received:
 * get:
 * summary: Récupérer l'historique complet des présents reçus (Virtuels et Annonces)
 * tags:
 * - Gifts (Utilisateur)
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Liste de l'historique des gains et cadeaux de l'utilisateur connecté.
 * 401:
 * description: Authentification requise.
 */
router.get("/gifts/received", ...authStack, giftsController.getReceivedGifts);

/**
 * @openapi
 * /api/gifts/preferences/preferred:
 * post:
 * summary: Définir ou modifier le présent virtuel standard préféré du profil connecté
 * tags:
 * - Gifts (Utilisateur)
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * giftId:
 * type: integer
 * nullable: true
 * example: 14
 * description: ID du cadeau standard ou null pour réinitialiser
 * responses:
 * 200:
 * description: Préférence de cadeau virtuel enregistrée.
 * 401:
 * description: Non authentifié.
 */
router.post("/gifts/preferences/preferred", ...authStack, giftsController.setPreferredGift);

/**
 * @openapi
 * /api/gifts/preferences/purpose:
 * post:
 * summary: Définir ou modifier l'Annonce d'entreprise visée comme objectif/souhait cadeau
 * tags:
 * - Gifts (Utilisateur)
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * annonceId:
 * type: integer
 * nullable: true
 * example: 102
 * description: ID de l'annonce visée en objectif principal ou null
 * responses:
 * 200:
 * description: Objectif de conversion d'annonce mis à jour.
 * 401:
 * description: Non authentifié.
 */
router.post("/gifts/preferences/purpose", ...authStack, giftsController.setGiftPurposeAnnonce);

export default router;