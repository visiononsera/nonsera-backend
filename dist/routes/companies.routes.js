import { Router } from "express";
import { loadContext } from "../middlewares/auth.middleware";
import { jwtMiddleware } from "../middlewares/jwt.middleware";
import { companiesController } from "../controllers/company.controller";
import { uploadCompanyLogo, uploadCompanyBanner, } from "../middlewares/upload.middleware";
const router = Router();
// --- ROUTES PUBLIQUES ---
// Récupérer les entreprises | annonces par proximité (Haversine)
router.get("/companies/proximity", companiesController.getByProximity);
// Lister les entreprises avec filtres, recherche, tri et pagination
router.get("/companies/", companiesController.getMany);
// Récupérer une entreprise par son ID
router.get("/companies/:id", companiesController.getById);
// --- ROUTES PROTÉGÉES ---
// Créer une nouvelle entreprise
router.post("/companies/", jwtMiddleware, loadContext, uploadCompanyLogo.single("logo"), uploadCompanyBanner.single("banner"), companiesController.create);
// Mettre à jour une entreprise existante
router.put("/companies/:id", jwtMiddleware, loadContext, uploadCompanyLogo.single("logo"), uploadCompanyBanner.single("banner"), companiesController.update);
// Suppression logique
router.delete("/companies/:id", jwtMiddleware, loadContext, companiesController.delete);
// --- ROUTE ADMIN PRIVILÉGIÉE ---
// Workflow d'approbation administrative
router.patch("/companies/:id/verify", jwtMiddleware, loadContext, companiesController.verify);
export default router;
//# sourceMappingURL=companies.routes.js.map