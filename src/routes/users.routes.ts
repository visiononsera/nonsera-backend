import { Router } from "express";
import { usersController } from "../controllers/users.controller.js";
import { loadContext } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";

const router = Router();

// ==========================================
// PROFIL & ONBOARDING (CLIENT CONNECTÉ)
// ==========================================
router.patch(
  "/users/onboarding", 
  jwtMiddleware, 
  loadContext, 
  usersController.updateOnboardingProfile
);

router.get(
  "/users/me", 
  jwtMiddleware, 
  loadContext, 
  usersController.getMyProfile
);

// ==========================================
// ACCÈS ÉQUIPE INTERNE & PRIVILÈGES (ADMIN / IT)
// ==========================================
router.post(
  "/users/permissions/assign",
  jwtMiddleware,
  loadContext,
  authorize("STAFF_MANAGE"), // Vérifie le dictionnaire de permissions pour les agents (Bypass pour ADMIN/IT)
  usersController.assignPermissionsToUser
);

router.post(
  "/users/permissions/system-create",
  jwtMiddleware,
  loadContext,
  authorize("SYSTEM_MAINTENANCE"), // Seuls l'IT ou l'ADMIN peuvent ajouter de nouvelles clés au dictionnaire
  usersController.createSystemPermission
);

router.post(
  "/users/staff/create",
  jwtMiddleware,
  loadContext,
  authorize("STAFF_MANAGE"),
  usersController.createStaffAccount
);

export default router;