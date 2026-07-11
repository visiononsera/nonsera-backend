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
 */
router.get("/coffrets", ...authStack, coffretsController.getAvailableCoffrets);

/**
 * @openapi
 * /coffrets/{id}:
 * get:
 * summary: Obtenir les détails complets d'un coffret
 */
router.get("/coffrets/:id", ...authStack, coffretsController.getCoffretById);

// ======================================================
// FLUX PRIVÉS / TRANSACTIONS FINANCIÈRES (AUTHENTIFICATION SÉCURISÉE REQUISE)
// ======================================================
/**
 * @openapi
 * /coffrets/book:
 * post:
 * summary: Réserver un coffret clé en main avec débit wallet unifié
 */
router.post("/coffrets/book", ...authStack, coffretsController.bookCoffret);

/**
 * @openapi
 * /coffrets/cancel:
 * post:
 * summary: Annuler une réservation de coffret
 */
router.post(
  "/coffrets/cancel",
  ...authStack,
  coffretsController.cancelCoffretBooking,
);

// ======================================================
// PANNEAU ADMINISTRATEUR (ADMIN ONLY)
// ======================================================

/**
 * @openapi
 * /coffrets/admin/verify/{id}:
 * put:
 * summary: Validation administrative d'un coffret (En ligne / Suspendu)
 */
router.put(
  "/coffrets/admin/verify/:id",
  ...authStack,
  coffretsController.verifyCoffret,
);

// ======================================================
// ESPACE PARTENAIRES (CRUD ENTREPRISES)
// ======================================================

/**
 * @openapi
 * /coffrets/company/catalog:
 * get:
 * summary: Récupérer le catalogue de coffrets de l'entreprise connectée
 */
router.get(
  "/coffrets/company/catalog",
  ...authStack,
  coffretsController.getCompanyCatalog,
);

/**
 * @openapi
 * /coffrets/company:
 * post:
 * summary: Création d'un nouveau coffret par l'entreprise
 */
router.post(
  "/coffrets/company",
  ...authStack,
  coffretsController.createCoffret,
);

/**
 * @openapi
 * /coffrets/company/{id}:
 * put:
 * summary: Mise à jour d'un coffret existant par l'entreprise
 * delete:
 * summary: Suppression d'un coffret par l'entreprise
 */
router.put(
  "/coffrets/company/:id",
  ...authStack,
  coffretsController.updateCoffret,
);

router.delete(
  "/coffrets/company/:id",
  ...authStack,
  coffretsController.deleteCoffret,
);

export default router;
