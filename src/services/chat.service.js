import prisma from "./prisma.service.js";

export class ChatService {
  /**
   * Enregistre un message dans une ChatRoom et met à jour les métadonnées de la room
   */
  static async saveMessage({ chatRoomId, senderId, recipientId, type, content, isRecipientOnline }) {
    const status = isRecipientOnline ? "DELIVERED" : "SENT";

    // Utilisation d'une transaction pour garantir l'intégrité entre le message et l'état du salon
    return await prisma.$transaction(async (tx) => {
      // 1. Création du message
      const message = await tx.message.create({
        data: {
          chatRoomId,
          senderId,
          recipientId,
          type,
          content,
          status,
          // Récupération automatique du matchId lié à la ChatRoom pour propager la dénormalisation si nécessaire
          match: {
            connect: {
              id: (await tx.chatRoom.findUnique({
                where: { id: chatRoomId },
                select: { matchId: true }
              })).matchId
            }
          }
        },
        include: {
          sender: {
            select: { id: true, fullname: true, username: true, profilePhoto: true }
          }
        }
      });

      // 2. Mise à jour des métadonnées du dernier message de la ChatRoom
      await tx.chatRoom.update({
        where: { id: chatRoomId },
        data: {
          lastMessage: type === "TEXT" ? content : `[${type}]`,
          lastMessageSenderId: senderId,
          lastMessageStatus: isRecipientOnline ? "RECEIVED" : "SENT",
          updatedAt: new Date()
        }
      });

      return message;
    });
  }

  /**
   * Marque tous les messages non lus d'une ChatRoom comme lus (par le récepteur local)
   */
  static async markAsRead(chatRoomId, localUserId) {
    return await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour les messages reçus par l'utilisateur connecté
      await tx.message.updateMany({
        where: {
          chatRoomId,
          recipientId: localUserId,
          status: { not: "READ" }
        },
        data: { status: "READ" }
      });

      // 2. Mettre à jour le statut global du dernier message de la pièce si le partenaire en était l'émetteur
      const room = await tx.chatRoom.findUnique({
        where: { id: chatRoomId },
        select: { lastMessageSenderId: true }
      });

      if (room && room.lastMessageSenderId !== localUserId) {
        await tx.chatRoom.update({
          where: { id: chatRoomId },
          data: { lastMessageStatus: "READ" }
        });
      }
    });
  }

  /**
   * Récupère l'historique de messages paginé par curseur
   */
  static async getChatHistory(chatRoomId, limit = 50, cursorId) {
    const query = {
      where: { chatRoomId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        sender: { select: { id: true, fullname: true, username: true, profilePhoto: true } }
      }
    };

    if (cursorId) {
      query.cursor = { id: Number(cursorId) };
      query.skip = 1; // Éviter de récupérer à nouveau le message pivot
    }

    const messages = await prisma.message.findMany(query);
    
    // Inversion pour remettre l'historique dans le fil chronologique ascendant (du plus ancien au plus récent)
    return messages.reverse();
  }

  /**
   * Dissout de manière irréversible le couple (Match) et désactive la ChatRoom
   */
  static async breakUpRelationship(chatRoomId, localUserId) {
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      include: { match: true }
    });

    if (!chatRoom || !chatRoom.isActive || chatRoom.match.status !== "ACTIVE") {
      throw new Error("Cette discussion n'est pas active ou a déjà été dissoute.");
    }

    const matchId = chatRoom.matchId;

    await prisma.$transaction([
      // 1. Passer le couple en statut rompu (BROKEN)
      prisma.match.update({
        where: { id: matchId },
        data: { status: "BROKEN", isConfirmed: false }
      }),
      // 2. Désactiver le salon de discussion
      prisma.chatRoom.update({
        where: { id: chatRoomId },
        data: { isActive: false }
      })
    ]);

    // Identifier l'ID du partenaire pour permettre les notifications sockets en temps réel
    const partnerId = chatRoom.match.fromId === localUserId ? chatRoom.match.toId : chatRoom.match.fromId;

    return {
      matchId,
      partnerId
    };
  }
}