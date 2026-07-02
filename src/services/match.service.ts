import prisma from "./prisma.service";
import { walletService } from "./wallet.service";

export class MatchService {

  /**
   * Étape 1 : Envoi d'un cadeau direct (Hors Podium)
   * VERIFICATION : Bloquer l'envoi si l'expéditeur ou le destinataire est déjà en couple.
   */
  static async sendDirectGift(senderId: number, receiverId: number, giftId: number) {
    if (senderId === receiverId) {
      throw new Error("Vous ne pouvez pas vous envoyer un cadeau à vous-même.");
    }

    // 1. Vérification stricte du statut célibataire des deux côtés
    const senderBusy = await this.isUserInCouple(senderId);
    if (senderBusy) {
      throw new Error("Vous êtes déjà en couple. Vous ne pouvez pas envoyer de cadeau direct.");
    }

    const receiverBusy = await this.isUserInCouple(receiverId);
    if (receiverBusy) {
      throw new Error("Cet utilisateur est déjà en couple.");
    }

    // 2. Validation du cadeau
    const gift = await prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift) throw new Error("Le cadeau spécifié n'existe pas.");

    // 3. Notification temps réel au destinataire
    io.to(`user_${receiverId}`).emit('gift:received', {
      senderId,
      giftId,
      giftName: gift.name,
      giftPrice: gift.price,
      message: "Vous avez reçu une proposition et un cadeau direct !"
    });

    return { success: true };
  }

  /**
   * Étape 2 : Le destinataire accepte le cadeau direct 
   */
  static async acceptDirectGift(receiverId: number, senderId: number, giftId: number, matchType: 'NORMAL' | 'BOOST' = 'NORMAL') {
    return await prisma.$transaction(async (tx) => {
      const gift = await tx.gift.findUnique({ where: { id: giftId } });
      if (!gift) throw new Error("Cadeau introuvable.");

      const giftPrice = Number(gift.price);

      // A. Débit sécurisé (Verrou exclusif sur les tranches financières)
      await walletService.debitWallet(
        senderId,
        giftPrice,
        `Achat Cadeau Direct (#${giftId}) accepté par l'utilisateur #${receiverId}`,
        tx
      );

      // B. Double-check de sécurité concurrentielle
      const isBusy = await this.isUserInCouple(senderId, tx) || await this.isUserInCouple(receiverId, tx);
      if (isBusy) {
        throw new Error("Action annulée : L'un des utilisateurs s'est mis en couple entre-temps.");
      }

      const participantOneId = Math.min(senderId, receiverId);
      const participantTwoId = Math.max(senderId, receiverId);

      // C. Création du Match ACTIVE et de la ChatRoom
      const [match, chatRoom] = await Promise.all([
        tx.match.create({
          data: {
            fromId: senderId,
            toId: receiverId,
            isConfirmed: true,
            type: matchType,
            status: 'ACTIVE',
            giftId: giftId
          }
        }),
        tx.chatRoom.create({
          data: {
            participantOneId,
            participantTwoId,
            lastMessage: "Cadeau accepté ! Le salon privé est ouvert."
          }
        })
      ]);

      io.to(`user_${senderId}`).to(`user_${receiverId}`).emit('match:created', {
        chatRoomId: chatRoom.id,
        partnerId: receiverId
      });

      return { match, chatRoom };
    });
  }

  /**
   * Étape 3 : RUPTURE (Unmatch -> Retour instantané au statut célibataire)
   */
  static async breakMatch(userId: number, partnerId: number) {
    return await prisma.$transaction(async (tx) => {
      const activeMatch = await tx.match.findFirst({
        where: {
          status: 'ACTIVE',
          OR: [
            { fromId: userId, toId: partnerId, isConfirmed: true },
            { fromId: partnerId, toId: userId, isConfirmed: true }
          ]
        }
      });

      if (!activeMatch) {
        throw new Error("Aucun match actif trouvé entre vous.");
      }

      const participantOneId = Math.min(userId, partnerId);
      const participantTwoId = Math.max(userId, partnerId);

      // Le statut bascule sur BROKEN : les deux redeviennent célibataires instantanément
      await Promise.all([
        tx.match.update({
          where: { id: activeMatch.id },
          data: { status: 'BROKEN' }
        }),
        tx.chatRoom.updateMany({
          where: { participantOneId, participantTwoId },
          data: { lastMessage: "Match rompu. Discussion fermée." }
        })
      ]);

      io.to(`user_${userId}`).to(`user_${partnerId}`).emit('match:broken', {
        matchId: activeMatch.id,
        message: "La relation a pris fin. Vous êtes de nouveau célibataire."
      });

      return { success: true };
    });
  }

  /**
   * UTILITAIRE : Recherche si un utilisateur possède un match avec le statut 'ACTIVE'
   */
  static async isUserInCouple(userId: number, txClient: any = null): Promise<boolean> {
    const tx = txClient || prisma;
    const activeMatch = await tx.match.findFirst({
      where: {
        status: 'ACTIVE',
        isConfirmed: true,
        OR: [
          { fromId: userId },
          { toId: userId }
        ]
      }
    });
    return !!activeMatch;
  }
}