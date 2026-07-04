import { PurchaseStatus } from "../generated/prisma";
import prisma from "./prisma.service";
import { walletService } from "./wallet.service";

// Déclaration globale pour éviter les erreurs de build si io est injecté globalement
declare const io: any;

export class MatchService {
  /**
   * RÉCUPÉRATION DU MATCH ACTIF
   */
  static async getCurrentMatch(userId: number) {
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
      partner,
      chatRoomId: chatRoom ? chatRoom.id : null,
    };
  }

  /**
   * Étape 1 : ENVOYER / ACHETER UN CADEAU (Virtuel ou Annonce)
   * Crée SYSTEMATIQUEMENT une ligne Purchase au statut PENDING
   */
  static async sendGiftProposal(
    senderId: number,
    receiverId: number,
    giftId: number | null,
    annonceId: number | null
  ) {
    if (senderId === receiverId) {
      throw new Error("Vous ne pouvez pas vous envoyer un cadeau à vous-même.");
    }
    if (!giftId && !annonceId) {
      throw new Error("Vous devez spécifier soit un cadeau simple (giftId), soit une annonce (annonceId).");
    }

    // 1. Vérifications des statuts relationnels
    const [senderMatch, receiverMatch] = await Promise.all([
      this.getCurrentMatch(senderId),
      this.getCurrentMatch(receiverId),
    ]);

    if (receiverMatch && receiverMatch.partner.id !== senderId) {
      throw new Error("Cet utilisateur est en couple. Seul son partenaire peut lui offrir des cadeaux.");
    }

    if (senderMatch && senderMatch.partner.id !== receiverId) {
      throw new Error("Vous êtes en couple. Vous ne pouvez offrir des cadeaux qu'à votre partenaire.");
    }

    // 2. Calcul du prix et validation de l'existence de l'item
    let totalPrice = 0;
    let giftName = "";

    if (giftId) {
      const gift = await prisma.gift.findUnique({ where: { id: giftId } });
      if (!gift || !gift.isAvailable) throw new Error("Le cadeau standard spécifié n'est pas disponible.");
      totalPrice = Number(gift.price);
      giftName = gift.name;
    } else if (annonceId) {
      const annonce = await prisma.annonce.findUnique({ where: { id: annonceId } });
      if (!annonce || !annonce.isAvailable) throw new Error("L'annonce spécifiée n'est pas disponible.");
      totalPrice = Number(annonce.price);
      giftName = annonce.name;
    }

    // 3. TRANSACTION FINANCIÈRE ET CRÉATION DE L'ACHAT EN ATTENTE
    return await prisma.$transaction(async (tx) => {
      await walletService.debitWallet(
        senderId,
        totalPrice,
        `Achat de l'approche cadeau : ${giftName} pour l'utilisateur #${receiverId}`,
        tx
      );

      // CORRECTION : On enregistre l'achat PEU IMPORTE le type (Polymorphisme complet)
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

      // 4. Notification Temps Réel via Socket.io
      if (typeof io !== "undefined") {
        io.to(`user_${receiverId}`).emit("gift:received", {
          senderId,
          giftId,
          annonceId,
          purchaseId: purchase.id,
          giftName,
          message: "Vous avez reçu une attention et une proposition !",
        });
      }

      return { success: true, purchaseId: purchase.id };
    });
  }

  /**
   * Étape 2 : LE DESTINATAIRE ACCEPTE LE CADEAU / L'ANNONCE
   */
  static async acceptDirectGift(
    receiverId: number,
    senderId: number,
    giftId: number | null,
    annonceId: number | null,
    matchType: "NORMAL" | "BOOST" = "NORMAL"
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Double check de sécurité concurrentielle
      const [senderBusy, receiverBusy] = await Promise.all([
        this.isUserInCouple(senderId, tx),
        this.isUserInCouple(receiverId, tx),
      ]);

      if (senderBusy || receiverBusy) {
        throw new Error("Action impossible : L'un des utilisateurs est déjà engagé dans un couple actif.");
      }

      //  On récupère et met à jour le Purchase correspondant au flux polymorphe
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
        throw new Error("Aucune proposition d'achat en attente n'a été trouvée pour ce couple.");
      }

      await tx.purchase.update({
        where: { id: pendingPurchase.id },
        data: { status: PurchaseStatus.RECEIVED },
      });

      const participantOneId = Math.min(senderId, receiverId);
      const participantTwoId = Math.max(senderId, receiverId);

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
            purchaseId: pendingPurchase.id, // Liaison avec la table Purchase
          },
        }),
        tx.chatRoom.upsert({
          where: {
            participantOneId_participantTwoId: { participantOneId, participantTwoId },
          },
          update: {
            lastMessage: "Proposition acceptée ! Votre salon privé est désormais actif.",
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
   */
  static async breakMatch(userId: number, partnerId: number) {
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
          data: { status: "BROKEN" },
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
  static async isUserInCouple(userId: number, txClient: any = null): Promise<boolean> {
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