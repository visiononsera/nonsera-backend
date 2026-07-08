import { Router } from "express";
import { loadContext } from "../middlewares/auth.middleware.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { companiesController } from "../controllers/companies.controller.js";

import {
  uploadCompanyLogo,
  uploadCompanyBanner,
} from "../middlewares/upload.middleware.js";

const router = Router();
const authStack = [jwtMiddleware, loadContext];

// ==========================================
// --- ROUTES PUBLIQUES ---
// ==========================================

/**
 * @openapi
 * /api/companies/proximity:
 * get:
 * summary: Récupérer les entreprises et annonces à proximité (Calcul Haversine)
 * tags:
 * - Companies
 * parameters:
 * - in: query
 * name: latitude
 * required: true
 * schema:
 * type: number
 * format: float
 * example: 6.3654
 * description: Latitude du point de recherche
 * - in: query
 * name: longitude
 * required: true
 * schema:
 * type: number
 * format: float
 * example: 2.4333
 * description: Longitude du point de recherche
 * - in: query
 * name: category
 * schema:
 * type: string
 * description: Filtrer les résultats par catégorie d'entreprise
 * - in: query
 * name: maxDistanceKm
 * schema:
 * type: number
 * format: float
 * default: 10
 * description: Rayon maximal de recherche en kilomètres
 * responses:
 * 200:
 * description: Liste des établissements à proximité récupérée.
 * 400:
 * description: Coordonnées géographiques manquantes ou invalides.
 * 500:
 * description: Erreur interne du serveur.
 */
router.get("/companies/proximity", companiesController.getByProximity);

/**
 * @openapi
 * /api/companies/:
 * get:
 * summary: Lister les entreprises avec filtres, recherche avancée, tri et pagination
 * tags:
 * - Companies
 * parameters:
 * - in: query
 * name: category
 * schema:
 * type: string
 * description: Catégorie de l'entreprise
 * - in: query
 * name: city
 * schema:
 * type: string
 * description: Ville d'implantation
 * - in: query
 * name: country
 * schema:
 * type: string
 * description: Pays
 * - in: query
 * name: search
 * schema:
 * type: string
 * description: Recherche textuelle sur le nom ou la description
 * - in: query
 * name: isVerified
 * schema:
 * type: string
 * enum: [true, false]
 * description: Filtrer par état de validation administrative
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * default: 8
 * description: Nombre de résultats par page
 * - in: query
 * name: page
 * schema:
 * type: integer
 * default: 0
 * description: Index de la page (commence à 0)
 * - in: query
 * name: sortBy
 * schema:
 * type: string
 * enum: [name, createdAt, balance]
 * description: Champ utilisé pour le tri des données
 * - in: query
 * name: sortOrder
 * schema:
 * type: string
 * enum: [asc, desc]
 * description: Sens du tri
 * responses:
 * 200:
 * description: Données paginées récupérées avec succès.
 * 500:
 * description: Erreur interne du serveur.
 */
router.get("/companies/", companiesController.getMany);

/**
 * @openapi
 * /api/companies/{id}:
 * get:
 * summary: Récupérer le profil complet d'une entreprise par son ID
 * tags:
 * - Companies
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * description: Identifiant unique de l'entreprise
 * responses:
 * 200:
 * description: Profil de l'entreprise trouvé.
 * 404:
 * description: Entreprise introuvable.
 */
router.get("/companies/:id", companiesController.getById);

// ==========================================
// --- ROUTES PROTÉGÉES ---
// ==========================================

/**
 * @openapi
 * /api/companies/:
 * post:
 * summary: Créer un nouvel établissement (avec fichiers logo et bannière)
 * tags:
 * - Companies
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
 * - category
 * properties:
 * name:
 * type: string
 * example: "Breality Digital"
 * category:
 * type: string
 * example: "TECHNOLOGY"
 * phoneNumber:
 * type: string
 * example: "+22900000000"
 * city:
 * type: string
 * example: "Cotonou"
 * country:
 * type: string
 * example: "Bénin"
 * logo:
 * type: string
 * format: binary
 * description: Fichier image pour le logo de l'entreprise
 * banner:
 * type: string
 * format: binary
 * description: Fichier image pour la bannière de l'entreprise
 * responses:
 * 201:
 * description: Entreprise créée avec succès.
 * 400:
 * description: Données d'entrée invalides.
 * 401:
 * description: Non authentifié.
 */
router.post(
  "/companies/",
  ...authStack,
  uploadCompanyLogo.single("logo"),
  uploadCompanyBanner.single("banner"),
  companiesController.create,
);

/**
 * @openapi
 * /api/companies/{id}:
 * put:
 * summary: Mettre à jour l'intégralité ou une partie des données d'une entreprise
 * tags:
 * - Companies
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * description: ID de l'entreprise à éditer
 * requestBody:
 * required: true
 * content:
 * multipart/form-data:
 * schema:
 * type: object
 * properties:
 * name:
 * type: string
 * category:
 * type: string
 * city:
 * type: string
 * logo:
 * type: string
 * format: binary
 * banner:
 * type: string
 * format: binary
 * responses:
 * 200:
 * description: Mise à jour effectuée avec succès.
 * 400:
 * description: ID ou données reçues incorrectes.
 * 401:
 * description: Non authentifié.
 */
router.put(
  "/companies/:id",
  ...authStack,
  uploadCompanyLogo.single("logo"),
  uploadCompanyBanner.single("banner"),
  companiesController.update,
);

/**
 * @openapi
 * /api/companies/{id}:
 * delete:
 * summary: Suppression logique d'une entreprise (Soft-delete)
 * tags:
 * - Companies
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * description: ID de l'entreprise à marquer comme supprimée
 * responses:
 * 200:
 * description: L'entreprise a été désactivée avec succès (Soft-delete).
 * 400:
 * description: Impossible de traiter la suppression.
 * 401:
 * description: Non autorisé.
 */
router.delete(
  "/companies/:id",
  ...authStack,
  companiesController.delete,
);

// ==========================================
// --- ROUTE ADMIN PRIVILÉGIÉE ---
// ==========================================

/**
 * @openapi
 * /api/companies/{id}/verify:
 * patch:
 * summary: Workflow d'approbation et validation administrative d'une entreprise
 * tags:
 * - Administration
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * description: ID de l'entreprise à modifier
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - approved
 * properties:
 * approved:
 * type: boolean
 * description: true pour valider l'entreprise, false pour l'invalider/suspendre
 * example: true
 * responses:
 * 200:
 * description: Statut d'approbation mis à jour avec succès.
 * 400:
 * description: Paramètre approved manquant ou erroné.
 * 401:
 * description: Non authentifié.
 * 403:
 * description: Privilèges insuffisants (Requiert un rôle Staff autorisé).
 */
router.patch(
  "/companies/:id/verify",
  ...authStack,
  companiesController.verify,
);

export default router;