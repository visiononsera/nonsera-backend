import { Router } from "express";
import { loadContext } from "../middlewares/auth.middleware.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { globalSearch } from "../controllers/search.controller.js";

const router = Router();

router.get('/', jwtMiddleware, loadContext, globalSearch);

export default router;
