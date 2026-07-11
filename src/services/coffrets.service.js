import prisma from "./prisma.service.js";
import { walletService } from "./wallet.service.js";

export const coffretsService = {
  
  // ==========================================
  // 1. GESTION ADMINISTRATIVE (ADMIN ONLY)
  // ==========================================

  /**
   * Validation administrative d'un coffret (RG-01).
   * Rend le coffret visible aux yeux des clients.
   */
  verifyCoffret: async (coffretId, isVerified = true) => {
    return await prisma.coffret.update({
      where: { id: coffretId },
      data: { isVerified },
      include: { items: true }
    });
  },

  // ==========================================
  // 2. ESPACE CLIENT & VISIBILITÉ PUBLIQUE
  // ==========================================

  getAvailableCoffrets: async ({ latitude, longitude, searchQuery, maxDistanceKm = 50 }) => {
    const whereCondition = {
      isAvailable: true,
      isVerified: true,
    };

    if (searchQuery) {
      whereCondition.OR = [
        { name: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
        { company: { city: { contains: searchQuery, mode: "insensitive" } } },
        { company: { country: { contains: searchQuery, mode: "insensitive" } } },
      ];
    }

    let coffrets = await prisma.coffret.findMany({
      where: whereCondition,
      include: {
        company: true,
        items: true,
      },
      orderBy: {
        isSpecial: "desc", 
      },
    });

    if (latitude !== undefined && longitude !== undefined) {
      coffrets = coffrets
        .map((coffret) => {
          if (!coffret.company.latitude || !coffret.company.longitude) {
            return { ...coffret, distanceKm: null };
          }
          const R = 6371;
          const dLat = ((parseFloat(coffret.company.latitude) - latitude) * Math.PI) / 180;
          const dLon = ((parseFloat(coffret.company.longitude) - longitude) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((latitude * Math.PI) / 180) *
              Math.cos((parseFloat(coffret.company.latitude) * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanceKm = R * c;

          return { ...coffret, distanceKm };
        })
        .filter((c) => c.distanceKm === null || c.distanceKm <= maxDistanceKm)
        .sort((a, b) => {
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        });
    }

    return coffrets;
  },

  getCoffretById: async (id) => {
    return await prisma.coffret.findFirst({
      where: {
        id: parseInt(id),
        isAvailable: true,
        isVerified: true,
      },
      include: {
        company: true,
        items: true,
      },
    });
  },

  // ==========================================
  // 3. WORKFLOW RÉSERVATION & ANNULATION
  // ==========================================

  createReservation: async (userId, coffretId, startDate, quantity) => {
    return await prisma.$transaction(async (tx) => {
      const coffret = await tx.coffret.findUnique({
        where: { id: coffretId },
      });

      if (!coffret || !coffret.isAvailable || !coffret.isVerified) {
        throw new Error("Ce coffret n'est pas ou plus disponible.");
      }

      // RÈGLE : Le prix est unitaire. La réduction de 10% s'applique à partir d'une qte >= 2.
      let basePrice = parseFloat(coffret.price) * quantity;
      let finalPrice = basePrice;
      if (quantity >= 2) {
        finalPrice = basePrice * 0.9;
      }

      const reference = `NS-COF-${Math.floor(100000 + Math.random() * 900000)}`;

      try {
        await walletService.debitWallet(
          userId,
          finalPrice,
          `Réservation Coffret Romantique - Réf: ${reference}`,
          tx
        );
      } catch (walletError) {
        if (walletError.message.includes("insuffisant")) {
          throw new Error("SOLDE_INSUFFISANT");
        }
        throw walletError;
      }

      const reservation = await tx.coffretReservation.create({
        data: {
          reference,
          coffretId,
          userId,
          startDate: new Date(startDate),
          quantity,
          totalPrice: finalPrice,
          status: "CONFIRMED",
        },
      });

      // Prolongation de la flamme à 15 jours si en couple actif
      const userMatch = await tx.match.findFirst({
        where: {
          status: "ACTIVE",
          OR: [{ fromId: userId }, { toId: userId }],
        },
      });

      if (userMatch) {
        const fifteenDaysFromNow = new Date();
        fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);

        await tx.match.update({
          where: { id: userMatch.id },
          data: { flameExpiresAt: fifteenDaysFromNow },
        });
      }

      await tx.company.update({
        where: { id: coffret.companyId },
        data: { balance: { increment: finalPrice } },
      });

      return reservation;
    });
  },

  cancelCoffretBooking: async (userId, reservationId) => {
    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.coffretReservation.findFirst({
        where: { id: reservationId, userId },
        include: { coffret: true },
      });

      if (!reservation) throw new Error("Réservation introuvable.");
      if (reservation.status === "CANCELLED") throw new Error("Cette réservation est déjà annulée.");

      const now = new Date();
      const startDate = new Date(reservation.startDate);
      const timeDifferenceHours = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      let refundProcessed = false;
      let message = "";

      if (timeDifferenceHours >= 72) {
        refundProcessed = true;
        const refundAmount = parseFloat(reservation.totalPrice);

        await tx.walletTranche.create({
          data: {
            userId,
            trancheId: `REF-${Date.now()}`,
            type: "AJUSTEMENT",
            principalInitial: refundAmount,
            principalRestant: refundAmount,
            bonusTotal: 0, bonusRestant: 0, bonusDebloque: 0, bonusBloque: 0,
            statut: "ACTIVE",
            description: `Remboursement automatique (Annulation > 72h) - Coffret Réf: ${reservation.reference}`,
          },
        });

        const summary = await walletService.getWalletSummary(userId, tx);
        await tx.user.update({
          where: { id: userId },
          data: { coins: summary.soldeTotalUtilisable },
        });

        await tx.company.update({
          where: { id: reservation.coffret.companyId },
          data: { balance: { decrement: refundAmount } },
        });

        message = "Réservation annulée avec succès et remboursée.";
      } else {
        message = "Réservation annulée sans remboursement (Délai des 72h dépassé).";
      }

      // ANTI-FRAUDE / ANTI-ENTRETIEN FLAMME FICTIF :
      // Si la réservation est annulée, on réduit la flamme pour pénaliser la triche.
      const userMatch = await tx.match.findFirst({
        where: {
          status: "ACTIVE",
          OR: [{ fromId: userId }, { toId: userId }],
        },
      });

      if (userMatch && userMatch.flameExpiresAt) {
        const currentExpiration = new Date(userMatch.flameExpiresAt);
        // On retire 15 jours (ou on remet à 'now') pour annuler l'effet du boost fictif.
        currentExpiration.setDate(currentExpiration.getDate() - 15);
        
        // Sécurité : Si le retrait repasse sous la date actuelle, on force l'expiration immédiate ou à 'now'
        const newExpiration = currentExpiration < now ? now : currentExpiration;

        await tx.match.update({
          where: { id: userMatch.id },
          data: { flameExpiresAt: newExpiration },
        });
      }

      const updatedReservation = await tx.coffretReservation.update({
        where: { id: reservationId },
        data: { status: "CANCELLED" },
      });

      const finalSummary = await walletService.getWalletSummary(userId, tx);

      return {
        message,
        reservation: updatedReservation,
        refundProcessed,
        updatedCoins: finalSummary.soldeTotalUtilisable,
      };
    });
  },

  // ==========================================
  // 4. CRUD PAR L'ENTREPRISE PARTENAIRE
  // ==========================================

  createCoffretByCompany: async (companyId, coffretData, items = []) => {
    return await prisma.coffret.create({
      data: {
        name: coffretData.name,
        description: coffretData.description,
        images: coffretData.images, // JSON (Tableau d'URLs)
        price: parseFloat(coffretData.price),
        durationDays: parseInt(coffretData.durationDays || 2),
        isAvailable: coffretData.isAvailable !== undefined ? coffretData.isAvailable : true,
        isSpecial: coffretData.isSpecial !== undefined ? coffretData.isSpecial : false,
        isVerified: false, // Repasse systématiquement à false pour validation admin
        companyId: companyId,
        items: {
          create: items.map(item => ({
            category: item.category,
            name: item.name,
            description: item.description,
            durationHours: item.durationHours ? parseInt(item.durationHours) : null,
          }))
        }
      },
      include: { items: true },
    });
  },

  updateCoffretByCompany: async (coffretId, companyId, updatedData, items = null) => {
    const existingCoffret = await prisma.coffret.findFirst({
      where: { id: coffretId, companyId },
    });

    if (!existingCoffret) {
      throw new Error("Action non autorisée ou coffret introuvable.");
    }

    return await prisma.$transaction(async (tx) => {
      if (items !== null) {
        // Suppression et réinsertion des sous-annonces / items
        await tx.coffretItem.deleteMany({ where: { coffretId } });
      }

      return await tx.coffret.update({
        where: { id: coffretId },
        data: {
          name: updatedData.name,
          description: updatedData.description,
          images: updatedData.images,
          price: updatedData.price ? parseFloat(updatedData.price) : undefined,
          durationDays: updatedData.durationDays ? parseInt(updatedData.durationDays) : undefined,
          isAvailable: updatedData.isAvailable,
          isSpecial: updatedData.isSpecial,
          isVerified: false, // Modification = Nécessite une nouvelle validation de l'admin
          ...(items !== null ? {
            items: {
              create: items.map(item => ({
                category: item.category,
                name: item.name,
                description: item.description,
                durationHours: item.durationHours ? parseInt(item.durationHours) : null,
              }))
            }
          } : {}),
        },
        include: { items: true },
      });
    });
  },

  deleteCoffretByCompany: async (coffretId, companyId) => {
    const existingCoffret = await prisma.coffret.findFirst({
      where: { id: coffretId, companyId },
    });

    if (!existingCoffret) {
      throw new Error("Action non autorisée ou coffret introuvable.");
    }

    return await prisma.$transaction(async (tx) => {
      await tx.coffretItem.deleteMany({ where: { coffretId } });
      return await tx.coffret.delete({ where: { id: coffretId } });
    });
  },

  getCompanyCatalog: async (companyId) => {
    return await prisma.coffret.findMany({
      where: { companyId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
  },
};