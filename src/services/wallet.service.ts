import { Prisma } from '../generated/prisma/client';
import prisma from "./prisma.service";

interface WalletSummary {
  soldePrincipalGlobal: number;
  bonusDisponibleGlobal: number;
  bonusBloqueGlobal: number;
  bonusVerrouilleGlobal: number;
  soldeTotalUtilisable: number; 
  currencySymbol: string;
  starpoints: number;
}

export const walletService = {

  /**
   * 1. RECHARGER LE COMPTE
   */
  creditWallet: async (
    userId: number, 
    amount: number, 
    provider: 'KKIAPAY' | 'STRIPE' | 'SYSTEM',
    reference: string,
    customCountryCode: string | null = null
  ): Promise<any> => {
    return await prisma.$transaction(async (tx) => {
      // Verrouiller l'utilisateur pour éviter les race conditions de solde synchrone
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { country: true }
      });

      const countryKey = customCountryCode || user?.country || 'BJ';
      let config = await tx.currencyConfig.findUnique({ where: { countryCode: countryKey } });

      if (!config) {
        config = { 
          id: 0, 
          countryCode: countryKey, 
          currencyCode: 'XOF', 
          symbol: 'FCFA', 
          bonusRate: new Prisma.Decimal(0.10), 
          createdAt: new Date(), 
          updatedAt: new Date() 
        };
      }

      const rate = Number(config.bonusRate);
      const bonusGenerated = amount * rate;

      const tranche = await tx.walletTranche.create({
        data: {
          userId: userId,
          trancheId: `TRX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          type: 'RECHARGE',
          principalInitial: amount,
          principalRestant: amount,
          bonusTotal: bonusGenerated,
          bonusRestant: bonusGenerated,
          bonusDebloque: 0,
          bonusBloque: 0,
          currency: config.currencyCode,
          statut: 'ACTIVE',
          description: `Recharge de compte via ${provider}`,
          referenceGate: reference
        },
      });

      await tx.starpointWallet.upsert({
        where: { userId: userId },
        update: { points: { increment: amount } },
        create: { userId: userId, points: amount },
      });

      // Recalcul immédiat via la même transaction
      const summary = await walletService.getWalletSummary(userId, tx);
      await tx.user.update({
        where: { id: userId },
        data: { coins: summary.soldeTotalUtilisable },
      });

      return tranche;
    });
  },

  /**
   * 2. DÉBIT / ACHAT (Ordre FIFO Strict)
   */
  debitWallet: async (
    userId: number, 
    totalAmountToDebit: number, 
    description: string, 
    txClient: any = null,
    isTransferLumiere = false
  ): Promise<any> => {
    const executeLogic = async (tx: any) => {
      // Sécurisation par verrou exclusif au niveau de la BDD si PostgreSQL est utilisé
      await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

      const summary = await walletService.getWalletSummary(userId, tx);
      
      if (summary.soldeTotalUtilisable < totalAmountToDebit) {
        throw new Error('Opération refusée : Solde disponible insuffisant.');
      }

      let remainingToDebit = totalAmountToDebit;

      // --- PHASE 1 : Consommation du Principal (FIFO) ---
      const activeTranches = await tx.walletTranche.findMany({
        where: { userId: userId, statut: 'ACTIVE', principalRestant: { gt: 0 } },
        orderBy: { dateRecharge: 'asc' },
      });

      for (const tranche of activeTranches) {
        if (remainingToDebit <= 0) break;

        const currentPrincipal = Number(tranche.principalRestant);
        const amountConsumed = Math.min(currentPrincipal, remainingToDebit);
        remainingToDebit -= amountConsumed;

        const pInitial = Number(tranche.principalInitial);
        const bTotal = Number(tranche.bonusTotal);
        
        // Calcul du prorata sécurisé contre les divisions par zéro
        const bonusToRelease = (isTransferLumiere || pInitial === 0) ? 0 : (amountConsumed / pInitial) * bTotal;

        let newPrincipalRestant = currentPrincipal - amountConsumed;
        let newStatut: 'ACTIVE' | 'EPUISE' = newPrincipalRestant === 0 ? 'EPUISE' : 'ACTIVE';
        
        let newBonusDebloque = Number(tranche.bonusDebloque) + bonusToRelease;
        let newBonusRestant = Math.max(0, Number(tranche.bonusRestant) - bonusToRelease);

        // Si épuisé, on libère le reliquat non gelé
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

      // --- PHASE 2 : Consommation du Bonus Débloqué (Si nécessaire) ---
      if (remainingToDebit > 0) {
        const tranchesWithBonus = await tx.walletTranche.findMany({
          where: { userId: userId, statut: { in: ['ACTIVE', 'EPUISE'] }, bonusDebloque: { gt: 0 } },
          orderBy: { dateRecharge: 'asc' },
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

      // Enregistrement de l'action de débit dans l'historique
      await tx.walletTranche.create({
        data: {
          userId,
          trancheId: `${isTransferLumiere ? 'LUM_OUT' : 'DEB'}-${Date.now()}`,
          type: isTransferLumiere ? 'LUMIERE_ENVOI' : 'ACHAT',
          principalInitial: 0, principalRestant: 0, bonusTotal: 0, bonusRestant: 0,
          bonusDebloque: 0, bonusBloque: 0,
          statut: 'EPUISE',
          description: `${description} (-${totalAmountToDebit})`,
        }
      });

      const updatedSummary = await walletService.getWalletSummary(userId, tx);
      await tx.user.update({
        where: { id: userId },
        data: { coins: updatedSummary.soldeTotalUtilisable },
      });

      return { success: true };
    };

    return txClient ? await executeLogic(txClient) : await prisma.$transaction(executeLogic);
  },

  /**
   * 3. TRANSFERT P2P LUMIÈRE
   */
  transferLumiere: async (senderId: number, receiverId: number, amountToTransfer: number): Promise<any> => {
    return await prisma.$transaction(async (tx) => {
      await walletService.debitWallet(senderId, amountToTransfer, `Envoi Lumière vers #${receiverId}`, tx, true);

      const senderTranches = await tx.walletTranche.findFirst({
        where: { userId: senderId, type: 'RECHARGE' }
      });
      const currency = senderTranches?.currency || 'XOF';

      const receiveTranche = await tx.walletTranche.create({
        data: {
          userId: receiverId,
          trancheId: `LUM_IN-${Date.now()}`,
          type: 'LUMIERE_RECEPTION',
          principalInitial: amountToTransfer,
          principalRestant: amountToTransfer,
          bonusTotal: 0, bonusRestant: 0, bonusDebloque: 0, bonusBloque: 0,
          currency: currency,
          statut: 'ACTIVE',
          description: `Réception Lumière de l'utilisateur #${senderId}`
        }
      });

      const receiverSummary = await walletService.getWalletSummary(receiverId, tx);
      await tx.user.update({
        where: { id: receiverId },
        data: { coins: receiverSummary.soldeTotalUtilisable },
      });

      return { success: true, incomingTranche: receiveTranche };
    });
  },

  /**
   * 4. GESTION DES REMBOURSEMENTS
   */
  refundWallet: async (userId: number, originalTrancheId: string, amountToRefund: number, reason: string): Promise<any> => {
    return await prisma.$transaction(async (tx) => {
      const tranche = await tx.walletTranche.findUnique({ where: { trancheId: originalTrancheId } });
      if (!tranche) throw new Error("Tranche d'origine introuvable.");

      const pInitial = Number(tranche.principalInitial);
      const bTotal = Number(tranche.bonusTotal);
      const bonusToRelock = pInitial === 0 ? 0 : (amountToRefund / pInitial) * bTotal;

      await tx.walletTranche.update({
        where: { id: tranche.id },
        data: {
          principalRestant: Number(tranche.principalRestant) + amountToRefund,
          bonusDebloque: Math.max(0, Number(tranche.bonusDebloque) - bonusToRelock),
          bonusRestant: Number(tranche.bonusRestant) + bonusToRelock,
          statut: 'ACTIVE'
        }
      });

      await tx.walletTranche.create({
        data: {
          userId,
          trancheId: `REF-${Date.now()}`,
          type: 'AJUSTEMENT',
          principalInitial: 0, principalRestant: 0, bonusTotal: 0, bonusRestant: 0,
          bonusDebloque: 0, bonusBloque: 0,
          statut: 'EPUISE',
          description: `Remboursement : ${reason} (+${amountToRefund} Principal)`
        }
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
  lockBonus: async (userId: number, amountToLock: number, reason: string): Promise<boolean> => {
    return await prisma.$transaction(async (tx) => {
      const summary = await walletService.getWalletSummary(userId, tx);
      if (summary.bonusDisponibleGlobal < amountToLock) throw new Error('Solde bonus insuffisant.');

      let remainingToLock = amountToLock;
      const tranches = await tx.walletTranche.findMany({
        where: { userId, statut: { in: ['ACTIVE', 'EPUISE'] }, bonusDebloque: { gt: 0 } },
        orderBy: { dateRecharge: 'asc' }
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
            bonusBloque: Number(tranche.bonusBloque) + lockQty
          }
        });
      }

      await tx.walletTranche.create({
        data: {
          userId, trancheId: `LCK-${Date.now()}`, type: 'AJUSTEMENT',
          principalInitial: 0, principalRestant: 0, bonusTotal: 0, bonusRestant: 0,
          bonusDebloque: 0, bonusBloque: 0, statut: 'EPUISE',
          description: `Blocage : ${reason} (-${amountToLock} Bonus)`
        }
      });

      const updatedSummary = await walletService.getWalletSummary(userId, tx);
      await tx.user.update({ where: { id: userId }, data: { coins: updatedSummary.soldeTotalUtilisable } });
      return true;
    });
  },

  /**
   * 6. DÉBLOCAGE DE BONUS GELÉ
   */
  unlockBonus: async (userId: number, amountToUnlock: number, reason: string): Promise<boolean> => {
    return await prisma.$transaction(async (tx) => {
      const summary = await walletService.getWalletSummary(userId, tx);
      if (summary.bonusBloqueGlobal < amountToUnlock) throw new Error('Montant supérieur au bonus bloqué.');

      let remainingToUnlock = amountToUnlock;
      const tranches = await tx.walletTranche.findMany({
        where: { userId, statut: { in: ['ACTIVE', 'EPUISE'] }, bonusBloque: { gt: 0 } },
        orderBy: { dateRecharge: 'asc' }
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
            bonusDebloque: Number(tranche.bonusDebloque) + unlockQty
          }
        });
      }

      await tx.walletTranche.create({
        data: {
          userId, trancheId: `UNL-${Date.now()}`, type: 'AJUSTEMENT',
          principalInitial: 0, principalRestant: 0, bonusTotal: 0, bonusRestant: 0,
          bonusDebloque: 0, bonusBloque: 0, statut: 'EPUISE',
          description: `Libération : ${reason} (+${amountToUnlock} Bonus)`
        }
      });

      const updatedSummary = await walletService.getWalletSummary(userId, tx);
      await tx.user.update({ where: { id: userId }, data: { coins: updatedSummary.soldeTotalUtilisable } });
      return true;
    });
  },

  /**
   * 7. EXPIRATION DES BONUS
   */
  expireOldBonus: async (): Promise<void> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expiredTranches = await prisma.walletTranche.findMany({
      where: {
        type: { in: ['RECHARGE', 'LUMIERE_RECEPTION'] },
        dateRecharge: { lte: thirtyDaysAgo },
        statut: { in: ['ACTIVE', 'EPUISE'] },
        OR: [
          { bonusDebloque: { gt: 0 } },
          { bonusRestant: { gt: 0 } }
        ]
      }
    });

    for (const tranche of expiredTranches) {
      await prisma.$transaction(async (tx) => {
        const currentPrincipal = Number(tranche.principalRestant);
        
        await tx.walletTranche.update({
          where: { id: tranche.id },
          data: {
            bonusDebloque: 0,
            bonusRestant: 0,
            // R3 : Si le principal restant est à 0, la tranche est complètement obsolète => EXPIRE
            // Sinon elle reste ACTIVE pour que le client consomme son argent déposé
            statut: currentPrincipal === 0 ? 'EXPIRE' : 'ACTIVE'
          }
        });

        const summary = await walletService.getWalletSummary(tranche.userId, tx);
        await tx.user.update({
          where: { id: tranche.userId },
          data: { coins: summary.soldeTotalUtilisable }
        });
      });
    }
  },

  /**
   * 8. SYNTHÈSE COMPLÈTE DES COMPTEURS (Filtre incluant 'EXPIRE' pour conserver le principal)
   */
  getWalletSummary: async (userId: number, txClient: any = null): Promise<WalletSummary> => {
    const tx = txClient || prisma;

    // Prise en compte de EXPIRE pour ne pas faire disparaître le solde principal des vieilles tranches
    const tranches = await tx.walletTranche.findMany({
      where: { userId: userId, statut: { in: ['ACTIVE', 'EPUISE', 'EXPIRE'] } },
    });

    const starpointRecord = await tx.starpointWallet.findUnique({ where: { userId } });

    let soldePrincipalGlobal = 0;
    let bonusDisponibleGlobal = 0;
    let bonusBloqueGlobal = 0;
    let bonusVerrouilleGlobal = 0;
    let currentCurrencySymbol = 'FCFA';

    tranches.forEach((t: any) => {
      if (t.type === 'RECHARGE' || t.type === 'LUMIERE_RECEPTION') {
        soldePrincipalGlobal += Number(t.principalRestant);
        
        // Si le statut est EXPIRE, les bonus valent réglementairement 0
        if (t.statut !== 'EXPIRE') {
          bonusDisponibleGlobal += Number(t.bonusDebloque);
          bonusBloqueGlobal += Number(t.bonusBloque);
          bonusVerrouilleGlobal += Number(t.bonusRestant);
        }
      }
    });

    const firstTranche = tranches.find((t: any) => t.type === 'RECHARGE');
    if (firstTranche) {
      const config = await tx.currencyConfig.findFirst({ where: { currencyCode: firstTranche.currency } });
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
  getClientHistory: async (userId: number, limit = 20, page = 1) => {
    const skip = (page - 1) * limit;
    const [history, total] = await prisma.$transaction([
      prisma.walletTranche.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: skip,
      }),
      prisma.walletTranche.count({ where: { userId } })
    ]);

    return {
      history,
      meta: { total, page, lastPage: Math.ceil(total / limit) }
    };
  }
};