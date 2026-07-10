import { Router } from "express";
import { giftsController } from "../controllers/gifts.controller.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { loadContext } from "../middlewares/auth.middleware.js";

const router = Router();
const authStack = [jwtMiddleware, loadContext];

// ======================================================
// CATALOGUE DE CADEAUX (PUBLIC / AUTHENTIFIÉ)
// ======================================================

/**
 * @openapi
 * /api/gifts:
 * get:
 * summary: Récupérer tous les cadeaux virtuels disponibles à l'achat
 * tags:
 * - Cadeaux (Gifts)
 * parameters:
 * - in: query
 * name: category
 * schema:
 * type: string
 * description: Filtrer par catégorie d'énumération GiftCategory (ROSE, BIJOUX_ACCESSOIRES...)
 * - in: query
 * name: companyId
 * schema:
 * type: integer
 * description: Filtrer les cadeaux offerts par une enseigne partenaire spécifique
 * responses:
 * 200:
 * description: Catalogue des cadeaux récupéré.
 */
router.get("/gifts", giftsController.getAllAvailable);

/**
 * @openapi
 * /api/gifts/{id}:
 * get:
 * summary: Obtenir la fiche détaillée d'un cadeau virtuel par son ID
 * tags:
 * - Cadeaux (Gifts)
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * responses:
 * 200:
 * description: Fiche cadeau trouvée.
 * 404:
 * description: Cadeau introuvable.
 */
router.get("/gifts/:id", giftsController.getById);

// ======================================================
// GESTION DU PROFIL UTILISATEUR & PRÉFÉRENCES
// ======================================================

/**
 * @openapi
 * /api/gifts/preferences/favorite:
 * post:
 * summary: Configurer le cadeau virtuel préféré de l'utilisateur (Bouton Danielle)
 * tags:
 * - Cadeaux (Gifts)
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - giftId
 * properties:
 * giftId:
 * type: integer
 * responses:
 * 200:
 * description: Préférence enregistrée.
 */
router.post(
  "/gifts/preferences/favorite",
  ...authStack,
  giftsController.setPreferredGift,
);

/**
 * @openapi
 * /api/gifts/preferences/purpose:
 * post:
 * summary: Définir une annonce comme intention de présent/approche commerciale
 * tags:
 * - Cadeaux (Gifts)
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - annonceId
 * properties:
 * annonceId:
 * type: integer
 * responses:
 * 200:
 * description: Intention d'achat configurée.
 */
router.post(
  "/gifts/preferences/purpose",
  ...authStack,
  giftsController.setGiftPurposeAnnonce,
);

// ======================================================
// TRAITEMENTS TRANSACTIONNELS & CYCLE DE VIE
// ======================================================

/**
 * @openapi
 * /api/gifts/{id}/open:
 * patch:
 * summary: Marquer un présent reçu comme consulté/ouvert par le destinataire (Statut CONSULTÉ)
 * tags:
 * - Cadeaux (Gifts)
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID de l'achat (Purchase ID) à modifier
 * responses:
 * 200:
 * description: Cadeau consulté.
 */
router.patch("/gifts/:id/open", ...authStack, giftsController.markAsOpened);

/**
 * @openapi
 * /api/gifts/:id/claim:
 * post:
 * summary: Réclamer un cadeau reçu et fournir l'adresse de livraison (Statut RÉCLAMÉ)
 * tags:
 * - Cadeaux (Gifts)
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID de la transaction d'achat (Purchase ID)
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - firstName
 * - lastName
 * - address
 * - city
 * - country
 * properties:
 * firstName:
 * type: string
 * lastName:
 * type: string
 * address:
 * type: string
 * city:
 * type: string
 * country:
 * type: string
 * instructions:
 * type: string
 * responses:
 * 200:
 * description: Cadeau réclamé avec succès. Adresse transmise.
 */
router.post("/gifts/:id/claim", ...authStack, giftsController.claimGift);

/**
 * @openapi
 * /api/gifts/{id}/reject:
 * post:
 * summary: Refuser un cadeau reçu (Statut REFUSÉ - Remboursement automatique de l'expéditeur)
 * tags:
 * - Cadeaux (Gifts)
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID de la transaction d'achat
 * responses:
 * 200:
 * description: Cadeau rejeté et expéditeur remboursé.
 */
router.post("/gifts/:id/reject", ...authStack, giftsController.rejectGift);

// ======================================================
// HISTORIQUES & SUIVI UTILISATEUR
// ======================================================

/**
 * @openapi
 * /api/gifts/history/received:
 * get:
 * summary: Récupérer tous les cadeaux (virtuels et physiques) reçus par l'utilisateur connecté
 * tags:
 * - Cadeaux (Historique)
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Historique des cadeaux reçus.
 */
router.get(
  "/gifts/history/received",
  ...authStack,
  giftsController.getReceivedGifts,
);

/**
 * @openapi
 * /api/gifts/history/sent:
 * get:
 * summary: Récupérer tous les cadeaux offerts et envoyés par l'utilisateur connecté
 * tags:
 * - Cadeaux
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Historique des envois de l'utilisateur.
 */
router.get("/gifts/history/sent", ...authStack, giftsController.getSentGifts);

export default router;
