import { Router } from "express";
import { annoncesController } from "../controllers/annonces.controller.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { loadContext } from "../middlewares/auth.middleware.js";
// Importer le middleware Multer configuré pour les photos d'annonces
import { uploadAnnoncePhoto } from "../middlewares/upload.middleware.js";
const router = Router();
// Pile de middlewares d'authentification réutilisable pour sécuriser les routes
const authStack = [jwtMiddleware, loadContext];
// ==========================================
// ROUTES PUBLIQUES (Consultation)
// ==========================================
// Lister les annonces avec filtres, recherche et pagination
router.get("/annonces", annoncesController.getMany);
// Récupérer les détails d'une annonce spécifique par son ID
router.get("/annonces/:id", annoncesController.getById);
// ==========================================
// ROUTES PROTÉGÉES
// ==========================================
// Créer une nouvelle annonce avec upload d'image
router.post("/annonces", ...authStack, uploadAnnoncePhoto.single("image"), annoncesController.create);
// Mettre à jour une annonce existante (y compris son image)
router.patch("/annonces/:id", ...authStack, uploadAnnoncePhoto.single("image"), annoncesController.update);
// Supprimer définitivement une annonce (nettoie aussi le stockage)
router.delete("/annonces/:id", ...authStack, annoncesController.delete);
export default router;
//# sourceMappingURL=annonces.routes.js.map