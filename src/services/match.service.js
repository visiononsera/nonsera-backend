import { PurchaseStatus } from "../generated/prisma/index.js";
import prisma from "./prisma.service.js";
import { walletService } from "./wallet.service.js";

export class MatchService {
  /**
   * RÉCUPÉRATION DU MATCH ACTIF
   */
  static async getCurrentMatch(userId) {
    const activeMatch = await prisma.match.findFirst({
      where: {
        status: "ACTIVE",
        isConfirmed: true,
        OR: [{ fromId: userId }, { toId: userId }],
      },
      include: {
        from: true,
        to: true,
      },
    });

    if (!activeMatch) return null;

    const isFromUser = activeMatch.fromId === userId;
    const partner = isFromUser ? activeMatch.to : activeMatch.from;

    const participantOneId = Math.min(activeMatch.fromId, activeMatch.toId);
    const participantTwoId = Math.max(activeMatch.fromId, activeMatch.toId);

    const chatRoom = await prisma.chatRoom.findFirst({
      where: {
        participantOneId,
        participantTwoId,
      },
    });

    return {
      matchId: activeMatch.id,
      type: activeMatch.type,
      createdAt: activeMatch.createdAt,
      flameExpiresAt: activeMatch.flameExpiresAt,
      partner,
      chatRoomId: chatRoom ? chatRoom.id : null,
    };
  }

  /**
   * Étape 1 : ENVOYER / ACHETER UN CADEAU (Virtuel ou Annonce)
   * Débite l'expéditeur, génère des Starpoints (1$ = 1 pt) et met à jour la flamme si déjà en couple
   */
  static async sendGiftProposal(senderId, receiverId, giftId, annonceId) {
    if (senderId === receiverId) {
      throw new Error("Vous ne pouvez pas vous envoyer un cadeau à vous-même.");
    }
    if (!giftId && !annonceId) {
      throw new Error(
        "Vous devez spécifier soit un cadeau simple (giftId), soit une annonce (annonceId).",
      );
    }

    // 1. Vérifications des statuts relationnels
    const [senderMatch, receiverMatch] = await Promise.all([
      this.getCurrentMatch(senderId),
      this.getCurrentMatch(receiverId),
    ]);

    if (receiverMatch && receiverMatch.partner.id !== senderId) {
      throw new Error(
        "Cet utilisateur est en couple. Seul son partenaire peut lui offrir des cadeaux.",
      );
    }

    if (senderMatch && senderMatch.partner.id !== receiverId) {
      throw new Error(
        "Vous êtes en couple. Vous ne pouvez offrir des cadeaux qu'à votre partenaire.",
      );
    }

    // 2. Calcul du prix et validation de l'existence de l'item
    let totalPrice = 0;
    let giftName = "";

    if (giftId) {
      const gift = await prisma.gift.findUnique({ where: { id: giftId } });
      if (!gift || !gift.isAvailable)
        throw new Error("Le cadeau standard spécifié n'est pas disponible.");
      totalPrice = Number(gift.price);
      giftName = gift.name;
    } else if (annonceId) {
      const annonce = await prisma.annonce.findUnique({
        where: { id: annonceId },
      });
      if (!annonce || !annonce.isAvailable)
        throw new Error("L'annonce spécifiée n'est pas disponible.");
      totalPrice = Number(annonce.price);
      giftName = annonce.name;
    }

    // 3. TRANSACTION FINANCIÈRE, DEBIT FIFO, STARPOINTS & FLAMME
    return await prisma.$transaction(async (tx) => {
      // Débit du wallet unifié FIFO
      await walletService.debitWallet(
        senderId,
        totalPrice,
        `Achat du cadeau : ${giftName} pour l'utilisateur #${receiverId}`,
        tx,
      );

      // Enregistrement de l'achat
      const purchase = await tx.purchase.create({
        data: {
          senderId,
          receiverId,
          giftId: giftId || null,
          annonceId: annonceId || null,
          status: PurchaseStatus.PENDING,
          quantity: 1,
          totalPrice,
        },
      });

      // RG: Chaque cadeau génère des Starpoints : 1 Coin dépensé = 1 Starpoint
      const starpointsToGenerate = Math.floor(totalPrice);
      if (starpointsToGenerate > 0) {
        await tx.starpointWallet.upsert({
          where: { userId: senderId },
          update: { points: { increment: starpointsToGenerate } },
          create: { userId: senderId, points: starpointsToGenerate },
        });
      }

      // RG: Chaque cadeau envoyé dans le couple réinitialise automatiquement le chrono de 15 jours
      if (senderMatch) {
        const fifteenDaysLater = new Date();
        fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);

        await tx.match.update({
          where: { id: senderMatch.matchId },
          data: {
            flameExpiresAt: fifteenDaysLater,
            updatedAt: new Date(),
          },
        });
      }

      // 4. Notification Temps Réel via Socket.io
      if (typeof io !== "undefined") {
        io.to(`user_${receiverId}`).emit("gift:received", {
          senderId,
          giftId,
          annonceId,
          purchaseId: purchase.id,
          giftName,
          message: "Vous avez reçu un cadeau !",
        });
      }

      return { success: true, purchaseId: purchase.id };
    });
  }

  /**
   * Étape 2 : LE DESTINATAIRE ACCEPTE LE CADEAU / L'ANNONCE (Initie le couple)
   */
  static async acceptDirectGift(
    receiverId,
    senderId,
    giftId,
    annonceId,
    matchType = "NORMAL",
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Double check de sécurité concurrentielle
      const [senderBusy, receiverBusy] = await Promise.all([
        this.isUserInCouple(senderId, tx),
        this.isUserInCouple(receiverId, tx),
      ]);

      if (senderBusy || receiverBusy) {
        throw new Error(
          "Action impossible : L'un des utilisateurs est déjà engagé dans un couple actif.",
        );
      }

      const pendingPurchase = await tx.purchase.findFirst({
        where: {
          senderId,
          receiverId,
          giftId: giftId || null,
          annonceId: annonceId || null,
          status: PurchaseStatus.PENDING,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!pendingPurchase) {
        throw new Error(
          "Aucune proposition d'achat en attente n'a été trouvée pour ce couple.",
        );
      }

      // Validation de l'achat
      await tx.purchase.update({
        where: { id: pendingPurchase.id },
        data: { status: PurchaseStatus.RECEIVED },
      });

      const participantOneId = Math.min(senderId, receiverId);
      const participantTwoId = Math.max(senderId, receiverId);

      // Calcul de la jauge de flamme initiale (15 jours)
      const initialFlameExpiration = new Date();
      initialFlameExpiration.setDate(initialFlameExpiration.getDate() + 15);

      // 3. Création ou activation du Match et de la ChatRoom
      const [match, chatRoom] = await Promise.all([
        tx.match.create({
          data: {
            fromId: senderId,
            toId: receiverId,
            isConfirmed: true,
            type: matchType,
            status: "ACTIVE",
            giftId: giftId || null,
            purchaseId: pendingPurchase.id,
            flameExpiresAt: initialFlameExpiration, // Initialisation de la flamme à 15 jours
          },
        }),
        tx.chatRoom.upsert({
          where: {
            participantOneId_participantTwoId: {
              participantOneId,
              participantTwoId,
            },
          },
          update: {
            lastMessage:
              "Proposition acceptée ! Votre salon privé est désormais actif.",
          },
          create: {
            participantOneId,
            participantTwoId,
            lastMessage: "Félicitations ! Le salon privé est ouvert.",
          },
        }),
      ]);

      if (typeof io !== "undefined") {
        io.to(`user_${senderId}`)
          .to(`user_${receiverId}`)
          .emit("match:created", {
            chatRoomId: chatRoom.id,
            partnerId: receiverId,
            matchId: match.id,
          });
      }

      return { match, chatRoom };
    });
  }

  /**
   * Étape 3 : RUPTURE (Unmatch)
   * Éteint le chrono du couple (status: BROKEN)
   */
  static async breakMatch(userId, partnerId) {
    return await prisma.$transaction(async (tx) => {
      const activeMatch = await tx.match.findFirst({
        where: {
          status: "ACTIVE",
          OR: [
            { fromId: userId, toId: partnerId, isConfirmed: true },
            { fromId: partnerId, toId: userId, isConfirmed: true },
          ],
        },
      });

      if (!activeMatch) throw new Error("Aucun match actif trouvé entre vous.");

      const participantOneId = Math.min(userId, partnerId);
      const participantTwoId = Math.max(userId, partnerId);

      await Promise.all([
        tx.match.update({
          where: { id: activeMatch.id },
          data: {
            status: "BROKEN",
            flameExpiresAt: null, // Extinction du chrono de couple
          },
        }),
        tx.chatRoom.updateMany({
          where: { participantOneId, participantTwoId },
          data: { lastMessage: "Match rompu. Discussion fermée." },
        }),
      ]);

      if (typeof io !== "undefined") {
        io.to(`user_${userId}`).to(`user_${partnerId}`).emit("match:broken", {
          matchId: activeMatch.id,
          message: "La relation a pris fin. Vous êtes de nouveau célibataire.",
        });
      }

      return { success: true };
    });
  }

  /**
   * UTILITAIRE
   */
  static async isUserInCouple(userId, txClient = null) {
    const tx = txClient || prisma;
    const activeMatch = await tx.match.findFirst({
      where: {
        status: "ACTIVE",
        isConfirmed: true,
        OR: [{ fromId: userId }, { toId: userId }],
      },
    });
    return !!activeMatch;
  }
}
