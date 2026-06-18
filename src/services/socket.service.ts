import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

const prisma = new PrismaClient({ adapter });

const userSockets = new Map<string | number, string>();

const getObjectURLFromPresignedURL = (presignedURL: string): string => {
  try {
    const url = new URL(presignedURL);
    return url.origin + url.pathname;
  } catch (error) {
    return presignedURL;
  }
};

export const setupSocketIO = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connecté. Socket ID: ${socket.id}`);

    // Authentification du socket utilisateur
    socket.on('authenticate', async (userId: string | number) => {
      userSockets.set(userId, socket.id);
      logger.info(`Utilisateur ${userId} authentifié sur le socket.`);

      try {
        await prisma.user.update({
          where: { id: userId as any }, 
          data: { isOnline: true },
        });
      } catch (err) {
        logger.error(`Erreur mise à jour statut en ligne pour l'utilisateur ${userId}:`, err);
      }
    });

    // Rejoindre une chambre de discussion
    socket.on('joinChatroom', (chatroomId: string, userId: string | number) => {
      socket.join(chatroomId);
      logger.info(`Utilisateur ${userId} a rejoint la chatroom: ${chatroomId}`);
    });

    // Transmission et sauvegarde d'un Match
    // socket.on('sendMatch', async (senderUserId: any, targetUserId: any, isConfirm: boolean, typeMatch: string) => {
    //   try {
    //     const sentMatch = await prisma.match.create({
    //       data: {
    //         fromId: senderUserId,
    //         toId: targetUserId,
    //         isConfirm,
    //         typeMatch,
    //       },
    //     });

    //     const recipientSocketId = userSockets.get(targetUserId);
    //     if (recipientSocketId) {
    //       io.to(recipientSocketId).emit('matchReceived', sentMatch);
    //     }
    //   } catch (err) {
    //     logger.error('Erreur lors de l\'envoi du match:', err);
    //   }
    // });

    // Routage et persistance des messages textuels et images
    // socket.on('sendMessage', async (message: { text?: string; image?: string; createdAt?: Date }, recipientUserId: any, senderUserId: any, chatroomId: any) => {
    //   try {
    //     let activeChatroomId = chatroomId;

    //     // Si la chatroom n'existe pas encore (ID transmis égal à 0)
    //     if (activeChatroomId === 0 || activeChatroomId === '0') {
    //       const existingChatroom = await prisma.chatRoom.findFirst({
    //         where: {
    //           OR: [
    //             { participant: { equals: [senderUserId, recipientUserId] } },
    //             { participant: { equals: [recipientUserId, senderUserId] } }
    //           ],
    //         },
    //       });

    //       if (existingChatroom) {
    //         activeChatroomId = existingChatroom.id;
    //       } else {
    //         const recipientUser = await prisma.user.findUnique({
    //           where: { id: recipientUserId },
    //           select: { assignedAgent: true },
    //         });

    //         const participant = [senderUserId, recipientUserId];

    //         const createdChatroom = await prisma.chatRoom.create({
    //           data: {
    //             participant,
    //             ...(recipientUser?.assignedAgent ? { isSentByAgent: true, agentId: recipientUser.assignedAgent } : {})
    //           }
    //         });
    //         activeChatroomId = createdChatroom.id;
    //       }
    //     }

    //     // Préparation du payload de message
    //     let storedMessage;
    //     if (message.image) {
    //       const objectURL = getObjectURLFromPresignedURL(message.image);
    //       storedMessage = await prisma.message.create({
    //         data: {
    //           contenu: message.text || "",
    //           typeMessage: 'image',
    //           mediaUrl: objectURL,
    //           sender: senderUserId,
    //           dateMessage: message.createdAt || new Date(),
    //           status: 'send',
    //           chatId: activeChatroomId,
    //         },
    //       });
    //     } else {
    //       storedMessage = await prisma.message.create({
    //         data: {
    //           contenu: message.text || "",
    //           typeMessage: 'text',
    //           sender: senderUserId,
    //           dateMessage: new Date(),
    //           status: 'send',
    //           chatId: activeChatroomId,
    //         },
    //       });
    //     }

    //     // Expédition vers le destinataire et le destinataire d'origine
    //     const recipientSocket = userSockets.get(recipientUserId);
    //     if (recipientSocket) io.to(recipientSocket).emit('receiveMessage', storedMessage);

    //     const senderSocket = userSockets.get(senderUserId);
    //     if (senderSocket) io.to(senderSocket).emit('receiveMessage', storedMessage);

    //     // Mise à jour de l'état de la chambre
    //     await prisma.chatRoom.update({
    //       where: { id: activeChatroomId },
    //       data: {
    //         lastMessage: message.image ? 'Photo' : message.text,
    //         lastMessageSender: senderUserId,
    //         lastMessageStatus: 'send',
    //       },
    //     });

    //     io.emit('updateChatroom', activeChatroomId);
    //   } catch (err) {
    //     logger.error('Erreur lors du traitement du message via socket:', err);
    //   }
    // });

    // Déconnexion d'un utilisateur
    socket.on('disconnect', async () => {
      let disconnectedUserId: string | number | null = null;

      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          userSockets.delete(userId);
          logger.info(`❌ Utilisateur ${userId} déconnecté du socket.`);
          break;
        }
      }

      if (disconnectedUserId) {
        try {
          await prisma.user.update({
            where: { id: disconnectedUserId as any },
            data: { isOnline: false },
          });
        } catch (err) {
          logger.error(`Erreur mise à jour statut hors-ligne pour ${disconnectedUserId}:`, err);
        }
      }
    });
  });
};