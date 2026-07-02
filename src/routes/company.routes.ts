import { Router } from "express";
import { loadContext } from "../middlewares/auth.middleware";
import { jwtMiddleware } from "../middlewares/jwt.middleware";
import { companiesController } from "../controllers/company.controller";

const router = Router();

// --- ROUTES PUBLIQUES ---
// Récupérer les entreprises | annonces par proximité (Haversine)
router.get("/proximity", companiesController.getByProximity);
// Lister les entreprises avec filtres, recherche, tri et pagination
router.get("/", companiesController.getMany);
// Récupérer une entreprise par son ID
router.get("/:id", companiesController.getById);


// --- ROUTES PROTÉGÉES ---
// Créer une nouvelle entreprise
router.post("/", jwtMiddleware, loadContext, companiesController.create);
// Mettre à jour une entreprise existante
router.put("/:id", jwtMiddleware, loadContext, companiesController.update);
// Suppression logique
router.delete("/:id", jwtMiddleware, loadContext, companiesController.delete);


// --- ROUTE ADMIN PRIVILÉGIÉE ---
// Workflow d'approbation administrative
router.patch("/:id/verify", jwtMiddleware, loadContext, companiesController.verify);

export default router;