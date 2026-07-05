import { Router } from "express";
import { usersController } from "../controllers/users.controller";
import { loadContext } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { jwtMiddleware } from "../middlewares/jwt.middleware";
import { uploadProfilePhoto } from "../middlewares/upload.middleware";
const router = Router();
// Pile de middlewares d'authentification réutilisable pour clarifier le code
const authStack = [jwtMiddleware, loadContext];
// ==========================================
// PROFIL & ONBOARDING
// ==========================================
router.patch("/users/onboarding", ...authStack, uploadProfilePhoto.single("profilePhoto"), usersController.updateOnboardingProfile);
router.get("/users/me", ...authStack, usersController.getMyProfile);
// ==========================================
// ACCÈS ÉQUIPE INTERNE & PRIVILÈGES
// ==========================================
router.post("/users/permissions/assign", ...authStack, authorize("STAFF_MANAGE"), usersController.assignPermissionsToUser);
router.post("/users/permissions/system-create", ...authStack, authorize("SYSTEM_MAINTENANCE"), usersController.createSystemPermission);
router.post("/users/staff/create", ...authStack, authorize("STAFF_MANAGE"), usersController.createStaffAccount);
export default router;
//# sourceMappingURL=users.routes.js.map