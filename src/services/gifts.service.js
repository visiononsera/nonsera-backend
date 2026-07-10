import prisma from "./prisma.service.js";
import { GiftCategory, PurchaseStatus } from "../generated/prisma/index.js";
import { walletService } from "./wallet.service.js";

export const giftsService = {
  // ======================================================
  // MANAGEMENT DU REFLUX ET CRUD DES CADEAUX (GIFT)
  // ======================================================

  create: async (data) => {
    return await prisma.gift.create({
      data: {
        name: data.name,
        price: data.price,
        points: data.points || 0,
        image: data.image,
        description: data.description || null,
        category: data.category || GiftCategory.ROSE,
        companyId: data.companyId || null,
      },
    });
  },

  getAllAvailable: async (filters) => {
    return await prisma.gift.findMany({
      where: {
        isAvailable: true,
        ...(filters?.category && { category: filters.category }),
        ...(filters?.companyId && { companyId: filters.companyId }),
      },
      include: {
        company: { select: { name: true, logo: true } },
      },
      orderBy: { price: "asc" },
    });
  },

  getById: async (id) => {
    const gift = await prisma.gift.findUnique({
      where: { id },
      include: {
        company: {
          select: { name: true, logo: true, city: true, country: true },
        },
      },
    });
    if (!gift) throw new Error("Le cadeau demandé n'existe pas.");
    return gift;
  },

  update: async (id, data) => {
    return await prisma.gift.update({
      where: { id },
      data,
    });
  },

  delete: async (id) => {
    return await prisma.gift.update({
      where: { id },
      data: { isAvailable: false },
    });
  },

  // ======================================================
  // CONFIGURATION DES PRÉFÉRENCES UTILISATEURS
  // ======================================================

  setPreferredGift: async (userId, giftId) => {
    return await prisma.user.update({
      where: { id: userId },
      data: { preferredGiftId: giftId },
      select: { id: true, fullname: true, preferredGiftId: true },
    });
  },

  setGiftPurposeAnnonce: async (userId, annonceId) => {
    return await prisma.user.update({
      where: { id: userId },
      data: { giftPurposeId: annonceId },
      select: { id: true, fullname: true, giftPurposeId: true },
    });
  },

  // ======================================================
  // LOGIQUE FINANCIÈRE & INTERACTION TEMPS RÉEL (CADEAUX)
  // ======================================================

  /**
   * Action : Le destinataire consulte la vignette du cadeau
   */
  markAsOpened: async (purchaseId, receiverId) => {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase || purchase.receiverId !== receiverId) {
      throw new Error("Opération non autorisée ou achat introuvable.");
    }

    if (purchase.status === PurchaseStatus.PENDING) {
      return await prisma.purchase.update({
        where: { id: purchaseId },
        data: { status: PurchaseStatus.PROCESSING }, // PROCESSING correspond à l'état 'Consulté'
      });
    }

    return purchase;
  },

  /**
   * Action : Le destinataire accepte/réclame le cadeau et fournit son adresse de livraison
   */
  claimGift: async (purchaseId, receiverId, deliveryData) => {
    return await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { gift: true, annonce: true },
      });

      if (!purchase || purchase.receiverId !== receiverId) {
        throw new Error("Opération non autorisée.");
      }

      if (purchase.status === PurchaseStatus.CANCELLED) {
        throw new Error("Ce cadeau a expiré ou a déjà été refusé.");
      }

      const deliveryText = `${deliveryData.firstName} ${deliveryData.lastName}, ${deliveryData.address}, ${deliveryData.city}, ${deliveryData.country}. Instructions : ${deliveryData.instructions || "Aucune"}`;

      // Passage à l'état "RECEIVED" (Réclamé)
      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: PurchaseStatus.RECEIVED,
          deliveryAddress: deliveryText,
          recipientFullName: `${deliveryData.firstName} ${deliveryData.lastName}`,
        },
      });

      return updatedPurchase;
    });
  },

  /**
   * Action : Le destinataire refuse le cadeau (Remboursement immédiat FIFO de l'expéditeur)
   */
  rejectGift: async (purchaseId, receiverId) => {
    return await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { gift: true, annonce: true },
      });

      if (!purchase || purchase.receiverId !== receiverId) {
        throw new Error("Opération non autorisée.");
      }

      if (
        purchase.status !== PurchaseStatus.PENDING &&
        purchase.status !== PurchaseStatus.PROCESSING
      ) {
        throw new Error("Ce cadeau a déjà été réclamé, annulé ou refusé.");
      }

      // 1. Passage du statut d'achat à CANCELLED
      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: { status: PurchaseStatus.CANCELLED },
      });

      // 2. Remboursement automatique sous forme de tranche d'ajustement
      const refundAmount = Number(purchase.totalPrice);

      await tx.walletTranche.create({
        data: {
          userId: purchase.senderId,
          trancheId: `REF-GFT-${Date.now()}`,
          type: "AJUSTEMENT",
          principalInitial: refundAmount,
          principalRestant: refundAmount,
          bonusTotal: 0,
          bonusRestant: 0,
          bonusDebloque: 0,
          bonusBloque: 0,
          statut: "ACTIVE",
          description: `Remboursement - Cadeau refusé par le destinataire`,
        },
      });

      // Synchronisation du solde de l'utilisateur
      const summary = await walletService.getWalletSummary(
        purchase.senderId,
        tx,
      );
      await tx.user.update({
        where: { id: purchase.senderId },
        data: { coins: summary.soldeTotalUtilisable },
      });

      return updatedPurchase;
    });
  },

  /**
   * Cron quotidien : Expiration automatique de tous les cadeaux non réclamés de plus de 24h
   */
  autoExpireGifts24h: async () => {
    console.log(
      "Lancement de la vérification des cadeaux expirés (Seuil: 24h)...",
    );
    const limitDate = new Date();
    limitDate.setHours(limitDate.getHours() - 24);

    const pendingGifts = await prisma.purchase.findMany({
      where: {
        status: { in: [PurchaseStatus.PENDING, PurchaseStatus.PROCESSING] },
        createdAt: { lt: limitDate },
      },
    });

    let expiredCount = 0;

    for (const purchase of pendingGifts) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.purchase.update({
            where: { id: purchase.id },
            data: { status: PurchaseStatus.CANCELLED },
          });

          const refundAmount = Number(purchase.totalPrice);

          await tx.walletTranche.create({
            data: {
              userId: purchase.senderId,
              trancheId: `EXP-GFT-${Date.now()}-${purchase.id}`,
              type: "AJUSTEMENT",
              principalInitial: refundAmount,
              principalRestant: refundAmount,
              bonusTotal: 0,
              bonusRestant: 0,
              bonusDebloque: 0,
              bonusBloque: 0,
              statut: "ACTIVE",
              description: `Remboursement - Expiration cadeau non réclamé (24h)`,
            },
          });

          const summary = await walletService.getWalletSummary(
            purchase.senderId,
            tx,
          );
          await tx.user.update({
            where: { id: purchase.senderId },
            data: { coins: summary.soldeTotalUtilisable },
          });

          expiredCount++;
        });
      } catch (err) {
        console.error(
          `Impossible de traiter l'expiration du cadeau #${purchase.id} :`,
          err.message,
        );
      }
    }

    console.log(
      `Traitement achevé. ${expiredCount} cadeaux ont expiré et ont été remboursés.`,
    );
  },

  getReceivedGifts: async (userId) => {
    return await prisma.purchase.findMany({
      where: {
        receiverId: userId,
      },
      include: {
        gift: true,
        annonce: {
          include: {
            company: {
              select: { name: true, logo: true, city: true, country: true },
            },
          },
        },
        sender: {
          select: {
            id: true,
            fullname: true,
            profilePhoto: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  getSentGifts: async (userId) => {
    return await prisma.purchase.findMany({
      where: {
        senderId: userId,
      },
      include: {
        gift: true,
        annonce: {
          include: {
            company: {
              select: { name: true, logo: true, city: true, country: true },
            },
          },
        },
        receiver: {
          select: {
            id: true,
            fullname: true,
            profilePhoto: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
