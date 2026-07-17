import prisma from "./prisma.service.js";

const emitCoinsUpdate = (io, userId, newCoinsBalance) => {
  if (!io) return;

  io.to(`user:${Number(userId)}`).emit("wallet:coins-updated", {
    coins: Number(newCoinsBalance),
  });
};

export const walletService = {
  /**
   * 1. RECHARGER LE COMPTE
   */
  creditWallet: async (
    userId,
    amount,
    provider,
    reference,
    customCountryCode = null,
  ) => {
    return await prisma.$transaction(async (tx) => {
      
      const summaryBefore = await walletService.getWalletSummary(userId, tx);
      const balanceBefore = summaryBefore.soldeTotalUtilisable;

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { country: true },
      });

      const userCountry = await tx.country.findUnique({
        where: { name: user.country },
      });

      const countryKey = customCountryCode || userCountry.code || "BJ";
      let config = await tx.currencyConfig.findUnique({
        where: { countryCode: countryKey },
      });

      if (!config) {
        config = {
          id: 0,
          countryCode: countryKey,
          currencyCode: "XOF",
          symbol: "FCFA",
          bonusRate: 0.1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      const rate = Number(config.bonusRate);
      const bonusGenerated = amount * rate;

      const tranche = await tx.walletTranche.create({
        data: {
          userId: userId,
          trancheId: `TRX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          type: "RECHARGE",
          principalInitial: amount,
          principalRestant: amount,
          bonusTotal: bonusGenerated,
          bonusRestant: bonusGenerated,
          bonusDebloque: 0,
          bonusBloque: 0,
          currency: config.currencyCode,
          statut: "ACTIVE",
          description: `Recharge de compte via ${provider}`,
          referenceGate: reference,
        },
      });

      await tx.starpointWallet.upsert({
        where: { userId: userId },
        update: { points: { increment: amount } },
        create: { userId: userId, points: amount },
      });

      const summary = await walletService.getWalletSummary(userId, tx);
      const balanceAfter = summary.soldeTotalUtilisable;

      await tx.user.update({
        where: { id: userId },
        data: { coins: balanceAfter },
      });

      emitCoinsUpdate(io, userId, balanceAfter);

      return {
        success: true,
        operationType: "CREDIT",
        amount: amount,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        tranche,
      };
    });
  },

  /**
   * 2. DÉBIT / ACHAT (Ordre FIFO Strict)
   */
  debitWallet: async (
    userId,
    totalAmountToDebit,
    description,
    txClient = null,
    isTransferLumiere = false,
  ) => {
    const uId = Number(userId);

    const executeLogic = async (tx) => {
      await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${uId} FOR UPDATE`;

      // 1. Calcul du solde AVANT l'opération à partir des tranches[cite: 1]
      const summaryBefore = await walletService.getWalletSummary(uId, tx);
      const balanceBefore = summaryBefore.soldeTotalUtilisable;

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { country: true },
      });

      const userCountry = await tx.country.findUnique({
        where: { name: user.country },
      });

      const countryKey = customCountryCode || userCountry.code || "BJ";
      let config = await tx.currencyConfig.findUnique({
        where: { countryCode: countryKey },
      });

      if (!config) {
        config = {
          id: 0,
          countryCode: countryKey,
          currencyCode: "XOF",
          symbol: "FCFA",
          bonusRate: 0.1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      if (balanceBefore < totalAmountToDebit) {
        throw new Error("Opération refusée : Solde disponible insuffisant.");
      }

      let remainingToDebit = totalAmountToDebit;

      // --- PHASE 1 : Consommation du Principal ---
      const activeTranches = await tx.walletTranche.findMany({
        where: { userId: uId, statut: "ACTIVE", principalRestant: { gt: 0 } },
        orderBy: { dateRecharge: "asc" },
      });

      for (const tranche of activeTranches) {
        if (remainingToDebit <= 0) break;

        const currentPrincipal = Number(tranche.principalRestant);
        const amountConsumed = Math.min(currentPrincipal, remainingToDebit);
        remainingToDebit -= amountConsumed;

        const pInitial = Number(tranche.principalInitial);
        const bTotal = Number(tranche.bonusTotal);
        const bonusToRelease =
          isTransferLumiere || pInitial === 0
            ? 0
            : (amountConsumed / pInitial) * bTotal;

        const newPrincipalRestant = currentPrincipal - amountConsumed;
        const newStatut = newPrincipalRestant === 0 ? "EPUISE" : "ACTIVE";

        let newBonusDebloque = Number(tranche.bonusDebloque) + bonusToRelease;
        let newBonusRestant = Math.max(
          0,
          Number(tranche.bonusRestant) - bonusToRelease,
        );

        if (newPrincipalRestant === 0 && !isTransferLumiere) {
          newBonusDebloque = Math.max(0, bTotal - Number(tranche.bonusBloque));
          newBonusRestant = 0;
        }

        await tx.walletTranche.update({
          where: { id: tranche.id },
          data: {
            principalRestant: newPrincipalRestant,
            bonusDebloque: newBonusDebloque,
            bonusRestant: newBonusRestant,
            statut: newStatut,
          },
        });
      }

      // --- PHASE 2 : Consommation du Bonus Débloqué  ---
      if (remainingToDebit > 0) {
        const tranchesWithBonus = await tx.walletTranche.findMany({
          where: {
            userId: uId,
            statut: { in: ["ACTIVE", "EPUISE"] },
            bonusDebloque: { gt: 0 },
          },
          orderBy: { dateRecharge: "asc" },
        });

        for (const tranche of tranchesWithBonus) {
          if (remainingToDebit <= 0) break;

          const availableBonus = Number(tranche.bonusDebloque);
          const bonusConsumed = Math.min(availableBonus, remainingToDebit);
          remainingToDebit -= bonusConsumed;

          await tx.walletTranche.update({
            where: { id: tranche.id },
            data: { bonusDebloque: availableBonus - bonusConsumed },
          });
        }
      }

      // Historisation du débit
      await tx.walletTranche.create({
        data: {
          userId: uId,
          trancheId: `${isTransferLumiere ? "LUM_OUT" : "DEB"}-${Date.now()}`,
          type: isTransferLumiere ? "LUMIERE_ENVOI" : "ACHAT",
          principalInitial: 0,
          principalRestant: 0,
          bonusTotal: 0,
          bonusRestant: 0,
          bonusDebloque: 0,
          bonusBloque: 0,
          currency: config.currencyCode,
          statut: "EPUISE",
          description: `${description} (-${totalAmountToDebit})`,
        },
      });

      // 2. Calcul du solde APRÈS l'opération
      const updatedSummary = await walletService.getWalletSummary(uId, tx);
      const balanceAfter = updatedSummary.soldeTotalUtilisable;

      // Sync dans le cache User
      await tx.user.update({
        where: { id: uId },
        data: { coins: balanceAfter },
      });

      // Émission temps réel
      emitCoinsUpdate(io, uId, balanceAfter);

      return {
        success: true,
        operationType: isTransferLumiere ? "TRANSFER_SEND" : "DEBIT",
        amount: totalAmountToDebit,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
      };
    };

    return txClient
      ? await executeLogic(txClient)
      : await prisma.$transaction(executeLogic);
  },

  /**
   * 3. TRANSFERT P2P LUMIÈRE
   */
  transferLumiere: async (
    senderId,
    receiverId,
    amountToTransfer,
  ) => {
    const sId = Number(senderId);
    const rId = Number(receiverId);

    return await prisma.$transaction(async (tx) => {

      const senderResult = await walletService.debitWallet(
        sId,
        amountToTransfer,
        `Envoi Lumière vers #${rId}`,
        tx,
        true,
      );

      const user = await tx.user.findUnique({
        where: { id: sId },
        select: { country: true },
      });

      const userCountry = await tx.country.findUnique({
        where: { name: user.country },
      });

      const countryKey = customCountryCode || userCountry.code || "BJ";
      let config = await tx.currencyConfig.findUnique({
        where: { countryCode: countryKey },
      });

      if (!config) {
        config = {
          id: 0,
          countryCode: countryKey,
          currencyCode: "XOF",
          symbol: "FCFA",
          bonusRate: 0.1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Récupérer le solde initial du RECEVEUR avant impact
      const receiverSummaryBefore = await walletService.getWalletSummary(rId,tx);
      const receiverBalanceBefore = receiverSummaryBefore.soldeTotalUtilisable;
      
      const senderTranches = await tx.walletTranche.findFirst({
        where: { userId: sId, type: "RECHARGE" },
      });
      const currency = senderTranches?.currency || "XOF";

      // Créer la ligne de réception pour l'ami
      await tx.walletTranche.create({
        data: {
          userId: rId,
          trancheId: `LUM_IN-${Date.now()}`,
          type: "LUMIERE_RECEPTION",
          principalInitial: amountToTransfer,
          principalRestant: amountToTransfer,
          bonusTotal: 0,
          bonusRestant: 0,
          bonusDebloque: 0,
          bonusBloque: 0,
          currency: currency,
          statut: "ACTIVE",
          description: `Réception Lumière de l'utilisateur #${sId}`,
        },
      });

      // Recalculer le solde final du RECEVEUR
      const receiverSummaryAfter = await walletService.getWalletSummary(rId, tx);
      const receiverBalanceAfter = receiverSummaryAfter.soldeTotalUtilisable;

      await tx.user.update({
        where: { id: rId },
        data: { coins: receiverBalanceAfter },
      });

      emitCoinsUpdate(io, rId, receiverBalanceAfter);

      return {
        success: true,
        amount: amountToTransfer,
        sender: {
          id: sId,
          balanceBefore: senderResult.balanceBefore,
          balanceAfter: senderResult.balanceAfter,
        },
        receiver: {
          id: rId,
          balanceBefore: receiverBalanceBefore,
          balanceAfter: receiverBalanceAfter,
        },
      };
    });
  },

  /**
   * 4. GESTION DES REMBOURSEMENTS
   */
  refundWallet: async (userId, originalTrancheId, amountToRefund, reason) => {
    return await prisma.$transaction(async (tx) => {
      const tranche = await tx.walletTranche.findUnique({
        where: { trancheId: originalTrancheId },
      });
      if (!tranche) throw new Error("Tranche d'origine introuvable.");

      const pInitial = Number(tranche.principalInitial);
      const bTotal = Number(tranche.bonusTotal);
      const bonusToRelock =
        pInitial === 0 ? 0 : (amountToRefund / pInitial) * bTotal;

      await tx.walletTranche.update({
        where: { id: tranche.id },
        data: {
          principalRestant: Number(tranche.principalRestant) + amountToRefund,
          bonusDebloque: Math.max(
            0,
            Number(tranche.bonusDebloque) - bonusToRelock,
          ),
          bonusRestant: Number(tranche.bonusRestant) + bonusToRelock,
          statut: "ACTIVE",
        },
      });

      await tx.walletTranche.create({
        data: {
          userId,
          trancheId: `REF-${Date.now()}`,
          type: "AJUSTEMENT",
          principalInitial: 0,
          principalRestant: 0,
          bonusTotal: 0,
          bonusRestant: 0,
          bonusDebloque: 0,
          bonusBloque: 0,
          statut: "EPUISE",
          description: `Remboursement : ${reason} (+${amountToRefund} Principal)`,
        },
      });

      const updatedSummary = await walletService.getWalletSummary(userId, tx);
      await tx.user.update({
        where: { id: userId },
        data: { coins: updatedSummary.soldeTotalUtilisable },
      });

      return { success: true };
    });
  },

  /**
   * 5. GEL DE BONUS
   */
  lockBonus: async (userId, amountToLock, reason) => {
    return await prisma.$transaction(async (tx) => {
      const summary = await walletService.getWalletSummary(userId, tx);
      if (summary.bonusDisponibleGlobal < amountToLock)
        throw new Error("Solde bonus insuffisant.");

      let remainingToLock = amountToLock;
      const tranches = await tx.walletTranche.findMany({
        where: {
          userId,
          statut: { in: ["ACTIVE", "EPUISE"] },
          bonusDebloque: { gt: 0 },
        },
        orderBy: { dateRecharge: "asc" },
      });

      for (const tranche of tranches) {
        if (remainingToLock <= 0) break;

        const availableBonus = Number(tranche.bonusDebloque);
        const lockQty = Math.min(availableBonus, remainingToLock);
        remainingToLock -= lockQty;

        await tx.walletTranche.update({
          where: { id: tranche.id },
          data: {
            bonusDebloque: availableBonus - lockQty,
            bonusBloque: Number(tranche.bonusBloque) + lockQty,
          },
        });
      }

      await tx.walletTranche.create({
        data: {
          userId,
          trancheId: `LCK-${Date.now()}`,
          type: "AJUSTEMENT",
          principalInitial: 0,
          principalRestant: 0,
          bonusTotal: 0,
          bonusRestant: 0,
          bonusDebloque: 0,
          bonusBloque: 0,
          statut: "EPUISE",
          description: `Blocage : ${reason} (-${amountToLock} Bonus)`,
        },
      });

      const updatedSummary = await walletService.getWalletSummary(userId, tx);
      await tx.user.update({
        where: { id: userId },
        data: { coins: updatedSummary.soldeTotalUtilisable },
      });
      return true;
    });
  },

  /**
   * 6. DÉBLOCAGE DE BONUS GELÉ
   */
  unlockBonus: async (userId, amountToUnlock, reason) => {
    return await prisma.$transaction(async (tx) => {
      const summary = await walletService.getWalletSummary(userId, tx);
      if (summary.bonusBloqueGlobal < amountToUnlock)
        throw new Error("Montant supérieur au bonus bloqué.");

      let remainingToUnlock = amountToUnlock;
      const tranches = await tx.walletTranche.findMany({
        where: {
          userId,
          statut: { in: ["ACTIVE", "EPUISE"] },
          bonusBloque: { gt: 0 },
        },
        orderBy: { dateRecharge: "asc" },
      });

      for (const tranche of tranches) {
        if (remainingToUnlock <= 0) break;

        const currentLocked = Number(tranche.bonusBloque);
        const unlockQty = Math.min(currentLocked, remainingToUnlock);
        remainingToUnlock -= unlockQty;

        await tx.walletTranche.update({
          where: { id: tranche.id },
          data: {
            bonusBloque: currentLocked - unlockQty,
            bonusDebloque: Number(tranche.bonusDebloque) + unlockQty,
          },
        });
      }

      await tx.walletTranche.create({
        data: {
          userId,
          trancheId: `UNL-${Date.now()}`,
          type: "AJUSTEMENT",
          principalInitial: 0,
          principalRestant: 0,
          bonusTotal: 0,
          bonusRestant: 0,
          bonusDebloque: 0,
          bonusBloque: 0,
          statut: "EPUISE",
          description: `Libération : ${reason} (+${amountToUnlock} Bonus)`,
        },
      });

      const updatedSummary = await walletService.getWalletSummary(userId, tx);
      await tx.user.update({
        where: { id: userId },
        data: { coins: updatedSummary.soldeTotalUtilisable },
      });
      return true;
    });
  },

  /**
   * 7. EXPIRATION DES BONUS
   */
  expireOldBonus: async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expiredTranches = await prisma.walletTranche.findMany({
      where: {
        type: { in: ["RECHARGE", "LUMIERE_RECEPTION"] },
        dateRecharge: { lte: thirtyDaysAgo },
        statut: { in: ["ACTIVE", "EPUISE"] },
        OR: [{ bonusDebloque: { gt: 0 } }, { bonusRestant: { gt: 0 } }],
      },
    });

    for (const tranche of expiredTranches) {
      await prisma.$transaction(async (tx) => {
        const currentPrincipal = Number(tranche.principalRestant);

        await tx.walletTranche.update({
          where: { id: tranche.id },
          data: {
            bonusDebloque: 0,
            bonusRestant: 0,
            statut: currentPrincipal === 0 ? "EXPIRE" : "ACTIVE",
          },
        });

        const summary = await walletService.getWalletSummary(
          tranche.userId,
          tx,
        );
        await tx.user.update({
          where: { id: tranche.userId },
          data: { coins: summary.soldeTotalUtilisable },
        });
      });
    }
  },

  /**
   * 8. SYNTHÈSE COMPLÈTE DES COMPTEURS (Filtre incluant 'EXPIRE' pour conserver le principal)
   */
  getWalletSummary: async (userId, txClient = null) => {
    const tx = txClient || prisma;

    const tranches = await tx.walletTranche.findMany({
      where: { userId: userId, statut: { in: ["ACTIVE", "EPUISE", "EXPIRE"] } },
    });

    const starpointRecord = await tx.starpointWallet.findUnique({
      where: { userId },
    });

    let soldePrincipalGlobal = 0;
    let bonusDisponibleGlobal = 0;
    let bonusBloqueGlobal = 0;
    let bonusVerrouilleGlobal = 0;
    let currentCurrencySymbol = "FCFA";

    tranches.forEach((t) => {
      if (t.type === "RECHARGE" || t.type === "LUMIERE_RECEPTION") {
        soldePrincipalGlobal += Number(t.principalRestant);

        if (t.statut !== "EXPIRE") {
          bonusDisponibleGlobal += Number(t.bonusDebloque);
          bonusBloqueGlobal += Number(t.bonusBloque);
          bonusVerrouilleGlobal += Number(t.bonusRestant);
        }
      }
    });

    const firstTranche = tranches.find((t) => t.type === "RECHARGE");
    if (firstTranche) {
      const config = await tx.currencyConfig.findFirst({
        where: { currencyCode: firstTranche.currency },
      });
      if (config) currentCurrencySymbol = config.symbol;
    }

    return {
      soldePrincipalGlobal,
      bonusDisponibleGlobal,
      bonusBloqueGlobal,
      bonusVerrouilleGlobal,
      soldeTotalUtilisable: soldePrincipalGlobal + bonusDisponibleGlobal,
      currencySymbol: currentCurrencySymbol,
      starpoints: starpointRecord ? Number(starpointRecord.points) : 0,
    };
  },

  /**
   * 9. HISTORIQUE
   */
  getClientHistory: async (userId, limit = 20, page = 1) => {
    const skip = (page - 1) * limit;
    const [history, total] = await prisma.$transaction([
      prisma.walletTranche.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
      }),
      prisma.walletTranche.count({ where: { userId } }),
    ]);

    return {
      history,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  },
};
