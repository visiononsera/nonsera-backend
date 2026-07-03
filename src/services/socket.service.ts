import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Map pour retrouver rapidement le Socket ID d'un utilisateur
const userSockets = new Map<string | number, string>();

export const setupSocketIO = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connecté. Socket ID: ${socket.id}`);

    // 1. Authentification et raccordement aux Rooms géographiques
    socket.on('authenticate', async (userId: string | number) => {
      userSockets.set(userId, socket.id);
      logger.info(`Utilisateur ${userId} authentifié sur le socket.`);

      try {
        const user = await prisma.user.update({
          where: { id: Number(userId) }, 
          data: { isOnline: true },
          select: { country: true }
        });

        // CRITIQUE POUR L'INSTANTANÉITÉ : Le client rejoint la room de son pays (ex: country_BJ)
        if (user && user.country) {
          const countryRoom = `country_${user.country.toUpperCase()}`;
          socket.join(countryRoom);
          logger.info(`Socket ${socket.id} (User #${userId}) a rejoint la room pays : ${countryRoom}`);
        }

        // L'utilisateur rejoint aussi sa propre room personnelle pour les notifications ciblées
        socket.join(`user_${userId}`);

      } catch (err) {
        logger.error(`Erreur mise à jour statut en ligne pour l'utilisateur ${userId}:`, err);
      }
    });

    // 2. Rejoindre une chambre de discussion (Chat Privé)
    socket.on('joinChatroom', (chatroomId: string, userId: string | number) => {
      socket.join(chatroomId);
      logger.info(`Utilisateur ${userId} a rejoint la chatroom: ${chatroomId}`);
    });

    // 3. Déconnexion d'un utilisateur et nettoyage des statuts
    socket.on('disconnect', async () => {
      let disconnectedUserId: string | number | null = null;

      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          userSockets.delete(userId);
          logger.info(`Utilisateur ${userId} déconnecté du socket.`);
          break;
        }
      }

      if (disconnectedUserId) {
        try {
          await prisma.user.update({
            where: { id: Number(disconnectedUserId) },
            data: { isOnline: false },
          });
        } catch (err) {
          logger.error(`Erreur mise à jour statut hors-ligne pour ${disconnectedUserId}:`, err);
        }
      }
    });
  });
};