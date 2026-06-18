import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { jwtMiddleware } from "../middlewares/jwt.middleware";

const router = Router();

// ==========================================
// FLUX UTILISATEURS STANDARD (MOBILE)
// ==========================================
router.post("/auth/check-user", authController.checkUserNumber);
router.post("/auth/login-user", authController.loginUser);
router.post("/auth/register/send-otp", authController.sendRegisterOtp);
router.post("/auth/register/verify-otp", authController.verifyRegisterAndCreate);

// ==========================================
// FLUX INTERNE (STAFF / BACKOFFICE)
// ==========================================
router.post("/auth/check-staff", authController.checkStaffNumber);
router.post("/auth/login-staff", authController.loginStaff);

// ==========================================
// FLUX PARTENAIRES (B2B / ENTREPRISES)
// ==========================================
router.post("/auth/check-partner", authController.checkPartnerNumber);
router.post("/auth/login-partner", authController.loginPartner);

// ==========================================
// LOGOUT (SÉCURISÉ)
// ==========================================
router.post("/auth/logout", jwtMiddleware, authController.logout);

export default router;