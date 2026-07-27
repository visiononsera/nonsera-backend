import { Router } from "express";
import { loadContext } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { dashboardStatsController } from "../controllers/dashboardStats.controller.js";

const router = Router();
const authStack = [jwtMiddleware, loadContext];
/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Obtenir l'ensemble des métriques métier et financières par pays
 * @access  Private (Admin)
 */
router.get(
  "/admin/dashboard/stats",
  ...authStack,
  authorize("STAFF_MANAGE"),
  dashboardStatsController.getDashboardStats,
);

export default router;
