import { Router } from "express";
import { usersController } from "../controllers/users.controller.js";
import { loadContext } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";

const router = Router();

// ==========================================
// PROFIL & ONBOARDING 
// ==========================================
router.patch("/users/onboarding",  jwtMiddleware,  loadContext,  usersController.updateOnboardingProfile );
router.get("/users/me",  jwtMiddleware,  loadContext,  usersController.getMyProfile );

// ==========================================
// ACCÈS ÉQUIPE INTERNE & PRIVILÈGES 
// ==========================================
router.post("/users/permissions/assign", jwtMiddleware, loadContext, authorize("STAFF_MANAGE"), usersController.assignPermissionsToUser);
router.post("/users/permissions/system-create", jwtMiddleware, loadContext, authorize("SYSTEM_MAINTENANCE"),  usersController.createSystemPermission);
router.post("/users/staff/create", jwtMiddleware, loadContext, authorize("STAFF_MANAGE"), usersController.createStaffAccount);

export default router;