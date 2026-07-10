// routes/chat.routes.js
import { Router } from "express";
import { ChatController } from "../controllers/chat.controller.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js"; 
import { loadContext } from "../middlewares/auth.middleware.js"; 

const router = Router();
const authStack = [jwtMiddleware, loadContext];

// Récupération de l'historique des messages du salon
router.get("/chat/history", ...authStack, ChatController.getHistory);

// Récupération des informations de profil du partenaire
router.get(
  "/chat/partner-settings/:chatRoomId",
  ...authStack,
  ChatController.getPartnerSettings,
);

// Déclenchement de la rupture
router.post("/chat/break-up", ...authStack, ChatController.breakUp);

export default router;
