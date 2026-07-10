import logger from "../utils/logger.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { ChatService } from "./chat.service.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Map unique et centralisée pour suivre l'état en ligne (userId -> socketId)
const userSockets = new Map();

/**
 * Fonction globale pour annoncer un gagnant de la Roue des Enveloppes (T. ENVELOPPE)
 * Peut être importée et appelée depuis tes services/contrôleurs lors d'un tirage.
 */
export const broadcastEnvelopeWinner = (
  io,
  winnerRecord,
  country,
  prizeAmount,
) => {
  if (!io)
    return logger.error("Instance Socket.io (io) manquante pour le broadcast.");

  const countryRoom = `country_${country.toUpperCase()}`;

  // 1. Envoyer l'animation de célébration plein écran ciblée au gagnant unique
  io.to(`user_${winnerRecord.userId}`).emit("envelope:victory", {
    amount: prizeAmount,
    message: `Félicitations ! Vous venez de gagner ${prizeAmount}$ ! Les fonds ont été crédités sur votre compte.`,
  });

  // 2. Notification push en temps réel à tout le pays connecté
  io.to(countryRoom).emit("envelope:country-announcement", {
    message: `Un utilisateur de ${winnerRecord.city || "votre pays"} vient de gagner ${prizeAmount}$ sur DMORAU 🎰 !`,
  });

  logger.info(
    `Broadcast de gain T. ENVELOPPE envoyé pour l'utilisateur #${winnerRecord.userId} au pays ${countryRoom}`,
  );
};

export const setupSocketIO = (io) => {
  io.on("connection", (socket) => {
    logger.info(`Client connecté. Socket ID: ${socket.id}`);

    // ======================================================
    // 1. AUTHENTIFICATION & STATUT EN LIGNE GLOBAL
    // ======================================================
    socket.on("authenticate", async (userId) => {
      const uId = Number(userId);
      userSockets.set(uId, socket.id);
      socket.userId = uId; // Stockage dans l'instance du socket pour un nettoyage rapide au disconnect

      logger.info(`Utilisateur ${uId} authentifié sur le socket.`);

      try {
        const user = await prisma.user.update({
          where: { id: uId },
          data: { isOnline: true },
          select: { country: true },
        });

        // Le client rejoint la room de son pays pour l'instantanéité des podiums
        if (user && user.country) {
          const countryRoom = `country_${user.country.toUpperCase()}`;
          socket.join(countryRoom);
          logger.info(
            `Socket ${socket.id} (User #${uId}) a rejoint la room pays : ${countryRoom}`,
          );
        }

        // L'utilisateur rejoint sa room personnelle pour les notifications ciblées
        socket.join(`user_${uId}`);
      } catch (err) {
        logger.error(
          `Erreur mise à jour statut en ligne pour l'utilisateur ${uId}:`,
          err,
        );
      }
    });

    // ======================================================
    // 2. LOGIQUE DE CHAT PRIVÉ & TEMPS RÉEL (COUPLE EXCLUSIF)
    // ======================================================

    /**
     * Rejoindre une chambre de discussion spécifique
     */
    socket.on("chat:join-room", ({ chatRoomId, partnerId }) => {
      const roomId = `chatroom_${chatRoomId}`;
      socket.join(roomId);
      logger.info(
        `Utilisateur ${socket.userId || "Inconnu"} a rejoint visuellement la room: ${roomId}`,
      );

      // Si le partenaire est connecté à l'application, on lui envoie un signal
      if (userSockets.has(Number(partnerId))) {
        io.to(`user_${partnerId}`).emit("partner:status-changed", {
          chatRoomId: Number(chatRoomId),
          status: "Online",
        });
      }
    });

    /**
     * Envoi d'un message (TEXT, IMAGE, AUDIO, LINK, EMOJI, GIFT)
     */
    socket.on("chat:send-message", async (payload) => {
      const { chatRoomId, recipientId, type, content } = payload;
      const senderId = socket.userId;

      if (!senderId) {
        return socket.emit("chat:error", {
          message: "Session socket non authentifiée.",
        });
      }

      const isRecipientOnline = userSockets.has(Number(recipientId));

      try {
        // Persistence en BDD et mise à jour automatique des métadonnées de la ChatRoom
        const savedMessage = await ChatService.saveMessage({
          chatRoomId: Number(chatRoomId),
          senderId,
          recipientId: Number(recipientId),
          type,
          content,
          isRecipientOnline,
        });

        // 1. Diffusion immédiate à la room (les deux abonnés de la discussion reçoivent le message)
        io.to(`chatroom_${chatRoomId}`).emit(
          "chat:receive-message",
          savedMessage,
        );

        // 2. Si le destinataire est connecté globalement mais sur un autre écran de l'app, on pousse un ping
        if (isRecipientOnline) {
          io.to(`user_${recipientId}`).emit("chat:notification-new-message", {
            chatRoomId: Number(chatRoomId),
            message: savedMessage,
          });
        }
      } catch (error) {
        logger.error(
          `Erreur d'envoi de message dans la room ${chatRoomId}:`,
          error,
        );
        socket.emit("chat:error", {
          message: "Erreur lors du traitement de l'envoi.",
        });
      }
    });

    /**
     * Accusé de lecture (Double trait coloré sur le téléphone du partenaire)
     */
    socket.on("chat:read-room", async ({ chatRoomId, partnerId }) => {
      const localUserId = socket.userId;
      if (!localUserId) return;

      try {
        await ChatService.markAsRead(Number(chatRoomId), localUserId);

        // Notifier le partenaire pour mettre à jour l'état visuel de ses messages envoyés
        if (userSockets.has(Number(partnerId))) {
          io.to(`user_${partnerId}`).emit("chat:partner-read", {
            chatRoomId: Number(chatRoomId),
          });
        }
      } catch (error) {
        logger.error(
          `Erreur accusé de lecture pour le chat ${chatRoomId}:`,
          error,
        );
      }
    });

    // ======================================================
    // 3. LOGIQUE DE SIGNALING AUDIO & VIDÉO (WebRTC)
    // ======================================================
    socket.on("call:initiate", ({ chatRoomId, recipientId, isVideo }) => {
      if (!userSockets.has(Number(recipientId))) {
        return socket.emit("call:error", {
          message: "Le destinataire est actuellement déconnecté.",
        });
      }

      io.to(`user_${recipientId}`).emit("call:incoming", {
        chatRoomId: Number(chatRoomId),
        callerId: socket.userId,
        isVideo,
      });
    });

    socket.on("call:signal", ({ recipientId, signalData }) => {
      io.to(`user_${recipientId}`).emit("call:signal", {
        senderId: socket.userId,
        signalData,
      });
    });

    socket.on("call:respond", ({ recipientId, accepted }) => {
      io.to(`user_${recipientId}`).emit("call:response", {
        accepted,
        responderId: socket.userId,
      });
    });

    // ======================================================
    // 4. DÉCONNEXION & NETTOYAGE DES STATUTS
    // ======================================================
    socket.on("disconnect", async () => {
      let disconnectedUserId = socket.userId;

      // Fallback si l'id n'était pas stocké directement sur l'objet socket
      if (!disconnectedUserId) {
        for (const [userId, socketId] of userSockets.entries()) {
          if (socketId === socket.id) {
            disconnectedUserId = userId;
            break;
          }
        }
      }

      if (disconnectedUserId) {
        userSockets.delete(disconnectedUserId);
        logger.info(
          `Utilisateur ${disconnectedUserId} supprimé de la Map active.`,
        );

        try {
          await prisma.user.update({
            where: { id: Number(disconnectedUserId) },
            data: { isOnline: false },
          });
        } catch (err) {
          logger.error(
            `Erreur mise à jour statut hors-ligne pour ${disconnectedUserId}:`,
            err,
          );
        }
      }
    });
  });
};
