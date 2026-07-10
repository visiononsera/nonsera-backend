import prisma from "../services/prisma.service.js";
import { ChatService } from "../services/chat.service.js";

export class ChatController {
  /**
   * Récupère l'historique paginé des messages d'une ChatRoom
   * GET /api/chat/history?chatRoomId=XX&limit=50&cursorId=YY
   */
  static async getHistory(req, res, next) {
    try {
      const { chatRoomId, limit, cursorId } = req.query;

      if (!chatRoomId) {
        return res
          .status(400)
          .json({ error: "Le paramètre chatRoomId est obligatoire." });
      }

      const messages = await ChatService.getChatHistory(
        Number(chatRoomId),
        limit ? Number(limit) : 50,
        cursorId,
      );

      return res.status(200).json({
        success: true,
        messages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupère les informations du partenaire pour l'écran des paramètres de discussion
   * GET /api/chat/partner-settings/:chatRoomId
   */
  static async getPartnerSettings(req, res, next) {
    try {
      const { chatRoomId } = req.params;
      const localUserId = req.user.id; // Injecté par ton middleware d'authentification

      const chatRoom = await prisma.chatRoom.findUnique({
        where: { id: Number(chatRoomId) },
        include: {
          participantOne: {
            select: {
              id: true,
              fullname: true,
              username: true,
              profilePhoto: true,
              city: true,
              country: true,
            },
          },
          participantTwo: {
            select: {
              id: true,
              fullname: true,
              username: true,
              profilePhoto: true,
              city: true,
              country: true,
            },
          },
        },
      });

      if (!chatRoom || !chatRoom.isActive) {
        return res
          .status(404)
          .json({ error: "Salon de discussion introuvable ou inactif." });
      }

      // Déterminer qui est le partenaire du couple exclusif
      const partner =
        chatRoom.participantOneId === localUserId
          ? chatRoom.participantTwo
          : chatRoom.participantOne;

      return res.status(200).json({
        success: true,
        data: {
          fullname: partner.fullname,
          username: partner.username,
          profilePhoto: partner.profilePhoto,
          location: partner.city
            ? `${partner.city}, ${partner.country}`
            : partner.country,
          notificationRingtone: "default", // Valeur par défaut, ajustable selon tes extensions futures
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Action irréversible : Dissolution instantanée du couple (Rupture)
   * POST /api/chat/break-up
   */
  static async breakUp(req, res, next) {
    try {
      const { chatRoomId } = req.body;
      const localUserId = req.user.id;

      if (!chatRoomId) {
        return res
          .status(400)
          .json({ error: "Le champ chatRoomId est obligatoire." });
      }

      const result = await ChatService.breakUpRelationship(
        Number(chatRoomId),
        localUserId,
      );

      // Si l'instance globale d'Express ou d'un gestionnaire expose ton serveur Socket.io `io`,
      // on émet l'ordre de déconnexion et de bascule immédiate vers l'état Célibataire aux deux clients.
      if (global.io) {
        global.io
          .to(`user_${localUserId}`)
          .emit("relationship:terminated", { chatRoomId: Number(chatRoomId) });
        global.io
          .to(`user_${result.partnerId}`)
          .emit("relationship:terminated", { chatRoomId: Number(chatRoomId) });
      }

      return res.status(200).json({
        success: true,
        message:
          "La relation a été rompue avec succès. Vous repassez tous les deux au statut Célibataire.",
      });
    } catch (error) {
      next(error);
    }
  }
}
