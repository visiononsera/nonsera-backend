import { Router } from "express";
import { annoncesController } from "../controllers/annonces.controller.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { loadContext } from "../middlewares/auth.middleware.js";
import { uploadAnnoncePhoto } from "../middlewares/upload.middleware.js";

const router = Router();

const authStack = [jwtMiddleware, loadContext];

// ==========================================
// ROUTES PUBLIQUES 
// ==========================================

/**
 * @openapi
 * /api/annonces:
 * get:
 * summary: Lister les annonces avec filtres, recherche et pagination
 * tags:
 * - Annonces
 * parameters:
 * - in: query
 * name: companyId
 * schema:
 * type: integer
 * description: Filtrer par l'identifiant de l'entreprise
 * - in: query
 * name: category
 * schema:
 * type: string
 * description: Filtrer par catégorie d'annonce
 * - in: query
 * name: vehicleType
 * schema:
 * type: string
 * description: Filtrer par type de véhicule (si applicable)
 * - in: query
 * name: activityType
 * schema:
 * type: string
 * description: Filtrer par type d'activité
 * - in: query
 * name: isAvailable
 * schema:
 * type: string
 * enum: [true, false]
 * description: Filtrer par disponibilité
 * - in: query
 * name: isVerified
 * schema:
 * type: string
 * enum: [true, false]
 * description: Filtrer par statut de vérification
 * - in: query
 * name: search
 * schema:
 * type: string
 * description: Terme de recherche textuelle (titre, description...)
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * default: 10
 * description: Nombre d'éléments par page
 * - in: query
 * name: page
 * schema:
 * type: integer
 * default: 1
 * description: Numéro de la page à récupérer
 * responses:
 * 200:
 * description: Liste des annonces récupérée avec succès.
 * 500:
 * description: Erreur interne du serveur.
 */
router.get("/annonces", annoncesController.getMany);

/**
 * @openapi
 * /api/annonces/{id}:
 * get:
 * summary: Récupérer les détails d'une annonce spécifique par son ID
 * tags:
 * - Annonces
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID unique de l'annonce
 * responses:
 * 200:
 * description: Données de l'annonce trouvée.
 * 400:
 * description: ID d'annonce fourni invalide.
 * 404:
 * description: Annonce introuvable.
 * 500:
 * description: Erreur interne du serveur.
 */
router.get("/annonces/:id", annoncesController.getById);

// ==========================================
// ROUTES PROTÉGÉES
// ==========================================

/**
 * @openapi
 * /api/annonces:
 * post:
 * summary: Créer une nouvelle annonce 
 * tags:
 * - Annonces
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * multipart/form-data:
 * schema:
 * type: object
 * required:
 * - name
 * - price
 * - companyId
 * properties:
 * name:
 * type: string
 * description: Nom ou titre de l'annonce
 * example: "Camion citerne Volvo FH"
 * price:
 * type: number
 * description: Prix de l'annonce
 * example: 450000
 * companyId:
 * type: integer
 * description: ID de l'entreprise rattachée
 * example: 12
 * category:
 * type: string
 * example: "Transport"
 * vehicleType:
 * type: string
 * example: "TRUCK"
 * activityType:
 * type: string
 * example: "RENTAL"
 * image:
 * type: string
 * format: binary
 * description: Fichier photo de l'annonce à uploader
 * responses:
 * 201:
 * description: Annonce générée avec succès.
 * 400:
 * description: Paramètres obligatoires manquants ou erronés.
 * 401:
 * description: Token d'authentification manquant ou invalide.
 * 500:
 * description: Erreur interne du serveur.
 */
router.post(
  "/annonces",
  ...authStack,
  uploadAnnoncePhoto.single("image"),
  annoncesController.create,
);

/**
 * @openapi
 * /api/annonces/{id}:
 * patch:
 * summary: Mettre à jour une annonce existante (y compris sa photo)
 * tags:
 * - Annonces
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID unique de l'annonce à modifier
 * requestBody:
 * required: true
 * content:
 * multipart/form-data:
 * schema:
 * type: object
 * properties:
 * name:
 * type: string
 * price:
 * type: number
 * category:
 * type: string
 * isAvailable:
 * type: boolean
 * image:
 * type: string
 * format: binary
 * description: Nouvelle photo de remplacement (effacera l'ancienne sur Cloudinary/S3)
 * responses:
 * 200:
 * description: Modification enregistrée avec succès.
 * 400:
 * description: ID invalide ou format des données incorrect.
 * 401:
 * description: Non authentifié.
 * 500:
 * description: Erreur interne du serveur.
 */
router.patch(
  "/annonces/:id",
  ...authStack,
  uploadAnnoncePhoto.single("image"),
  annoncesController.update,
);

/**
 * @openapi
 * /api/annonces/{id}:
 * delete:
 * summary: Supprimer définitivement une annonce et purger ses fichiers associés
 * tags:
 * - Annonces
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID de l'annonce à supprimer
 * responses:
 * 200:
 * description: Annonce et ressources associées supprimées avec succès.
 * 400:
 * description: ID fourni incorrect.
 * 401:
 * description: Non authentifié.
 * 500:
 * description: Erreur de suppression ou panne serveur.
 */
router.delete("/annonces/:id", ...authStack, annoncesController.delete);

export default router;