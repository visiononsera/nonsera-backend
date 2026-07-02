import prisma from "./prisma.service";
import { ReservationStatus, CompanyCategory } from "../generated/prisma";
import { walletService } from "./wallet.service"; 

export interface CreateReservationInput {
  userId: number;
  annonceId: number;
  startDate: Date;
  endDate?: Date | null;
  quantity?: number;
  receiverId?: number | null; 
  
  // Options logistiques / Restaurant
  isDelivery?: boolean;
  deliveryAddress?: string | null;
  deliveryPhone?: string | null;

  // Spécifique Transport & Activités complexes
  startLatitude?: number | null;
  startLongitude?: number | null;
  endLatitude?: number | null;
  endLongitude?: number | null;
  startAddressText?: string | null;
}

export const reservationsService = {

  /**
   * 1. CRÉATION D'UNE RÉSERVATION (Débit via le wallet)
   */
  create: async (data: CreateReservationInput) => {
    const annonce = await prisma.annonce.findUnique({
      where: { id: data.annonceId },
      include: { company: true }
    });

    if (!annonce) throw new Error("L'annonce spécifiée n'existe pas.");
    if (!annonce.isAvailable) throw new Error("Cette annonce n'est plus disponible.");
    if (!annonce.company) throw new Error("L'annonce n'est rattachée à aucune entreprise valide.");

    const companyCategory = annonce.company.category;
    const quantity = data.quantity ?? 1;

    // --- VALIDATIONS PAR CATÉGORIE ---
    if (companyCategory === CompanyCategory.TRANSPORT) {
      if (!data.startLatitude || !data.startLongitude) {
        throw new Error("Les coordonnées GPS de départ sont obligatoires pour un trajet.");
      }
      if (annonce.nbPlaces !== null && annonce.nbPlaces < quantity) {
        throw new Error("Nombre de places insuffisantes pour ce trajet.");
      }
    }

    if (companyCategory === CompanyCategory.HOTEL && !data.endDate) {
      throw new Error("La date de fin est obligatoire pour réserver une chambre d'Hôtel.");
    }

    // --- CALCUL DU PRIX ---
    let basePrice = Number(annonce.price);
    if (companyCategory === CompanyCategory.HOTEL && data.endDate) {
      const diffTime = Math.abs(new Date(data.endDate).getTime() - new Date(data.startDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      basePrice = basePrice * (diffDays > 0 ? diffDays : 1);
    }

    const totalPrice = basePrice * quantity;
    const reference = `RES-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // --- INITIATION DE LA TRANSACTION ---
    return await prisma.$transaction(async (tx) => {
      
      // Utilisation de ton debitWallet (Remboursement / FIFO automatique)
      await walletService.debitWallet(
        data.userId,
        totalPrice,
        `Réservation ${reference} - ${annonce.name}`,
        tx // Partage de la transaction Prisma
      );

      // Si c'est un transport, on réserve les places
      if (companyCategory === CompanyCategory.TRANSPORT && annonce.nbPlaces !== null) {
        await tx.annonce.update({
          where: { id: annonce.id },
          data: { nbPlaces: { decrement: quantity } }
        });
      }

      // Création du record de réservation
      return await tx.reservation.create({
        data: {
          reference,
          userId: data.userId,
          receiverId: data.receiverId ?? null,
          annonceId: data.annonceId,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          totalPrice,
          quantity,
          status: ReservationStatus.PENDING,
          isDelivery: data.isDelivery ?? false,
          deliveryAddress: data.deliveryAddress ?? null,
          deliveryPhone: data.deliveryPhone ?? null,
          startLatitude: data.startLatitude ?? null,
          startLongitude: data.startLongitude ?? null,
          endLatitude: data.endLatitude ?? null,
          endLongitude: data.endLongitude ?? null,
          startAddressText: data.startAddressText ?? null,
          cancellationDeadline: companyCategory === CompanyCategory.HOTEL 
            ? new Date(new Date(data.startDate).getTime() - 24 * 60 * 60 * 1000) // 24h avant pour Hôtel
            : new Date(new Date(data.startDate).getTime() - 2 * 60 * 60 * 1000)  // 2h par défaut (Resto, Activité...)
        }
      });
    });
  },

  /**
   * 2. CONFIRMATION DE LA RÉSERVATION (Acceptation par le partenaire)
   * Règle d'encaissement intelligente selon le domaine d'activité.
   */
  confirm: async (id: number) => {
    const reservation = await prisma.reservation.findUnique({ 
      where: { id },
      include: { annonce: { include: { company: true } } }
    });

    if (!reservation) throw new Error("Réservation introuvable.");
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new Error(`Action impossible. Statut actuel : ${reservation.status}`);
    }

    const companyCategory = reservation.annonce.company?.category;

    // Étape 1 : Passer le statut global à CONFIRMED
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CONFIRMED }
    });

    // Étape 2 : Encaissement immédiat pour Hôtel, Resto et Activité.
    // Pour le Transport, les fonds restent bloqués en séquestre jusqu'à la fin de la course.
    if (companyCategory !== CompanyCategory.TRANSPORT) {
      return await reservationsService.completeOrProcess(id);
    }

    return updatedReservation;
  },

  /**
   * 3. LANCER LE TRIP / COURSE (Spécifique au Transport)
   */
  startTrip: async (id: number) => {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { annonce: { include: { company: true } } }
    });

    if (!reservation) throw new Error("Réservation introuvable.");
    if (reservation.annonce.company?.category !== CompanyCategory.TRANSPORT) {
      throw new Error("Cette action est réservée pour le suivi des trajets de Transport.");
    }
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new Error("La course ne peut démarrer que si la réservation est confirmée.");
    }

    return { success: true, message: "Le voyage a commencé.", reservation };
  },

  /**
   * 4. PRESTATION TERMINÉE & LIQUIDATION DE LA BALANCE PARTENAIRE
   * Pour le Transport : Déclenché à la fin de la course.
   * Pour les autres typologies : Déclenché automatiquement à la confirmation.
   */
  completeOrProcess: async (id: number) => {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { annonce: { include: { company: true } } }
    });

    if (!reservation) throw new Error("Réservation introuvable.");
    
    // On tolère PENDING ici pour absorber l'appel chaîné de la méthode `confirm`
    if (!(reservation.status === ReservationStatus.CONFIRMED || reservation.status === ReservationStatus.PENDING)) {
      throw new Error("Seule une réservation en cours ou confirmée peut être finalisée.");
    }

    const company = reservation.annonce.company;
    if (!company) throw new Error("Entreprise introuvable.");

    return await prisma.$transaction(async (tx) => {
      // 1. Créditer la balance réelle de la Company
      await tx.company.update({
        where: { id: company.id },
        data: { balance: { increment: Number(reservation.totalPrice) } }
      });

      // 2. Clôturer la réservation au statut final PROCESSED
      return await tx.reservation.update({
        where: { id },
        data: { status: ReservationStatus.PROCESSED }
      });
    });
  },

  /**
   * 5. OUVERTURE D'UN LITIGE (Par l'utilisateur ou la compagnie)
   */
  openDispute: async (id: number, openedBy: "USER" | "COMPANY", reason: string) => {
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new Error("Réservation introuvable.");

    if (reservation.status === ReservationStatus.CANCELLED || reservation.status === ReservationStatus.PROCESSED) {
      throw new Error("Impossible d'ouvrir un litige sur une réservation déjà clôturée.");
    }

    return await prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.LITIGE,
        litigeReason: `Litige ouvert par le ${openedBy}. Motif : ${reason}`
      }
    });
  },

  /**
   * 6. RÉSOLUTION DU LITIGE (Arbitrage exclusif Admin)
   */
  resolveDispute: async (id: number, decision: "REFUND_CLIENT" | "PAY_COMPANY", adminNotes: string) => {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { annonce: { include: { company: true } } }
    });

    if (!reservation) throw new Error("Réservation introuvable.");
    if (reservation.status !== ReservationStatus.LITIGE) {
      throw new Error("Cette réservation n'est pas marquée en litige.");
    }

    // Option A : Remboursement intégral du client
    if (decision === "REFUND_CLIENT") {
      let historicalTrancheId = `REF-LITIGE-${Date.now()}`;

      await prisma.$transaction(async (tx) => {
        if (reservation.annonce.company?.category === CompanyCategory.TRANSPORT && reservation.annonce.nbPlaces !== null) {
          await tx.annonce.update({
            where: { id: reservation.annonceId },
            data: { nbPlaces: { increment: reservation.quantity } }
          });
        }

        const historicalDebit = await tx.walletTranche.findFirst({
          where: { userId: reservation.userId, description: { contains: reservation.reference } }
        });
        if (historicalDebit) historicalTrancheId = historicalDebit.trancheId;
      });

      await walletService.refundWallet(
        reservation.userId,
        historicalTrancheId,
        Number(reservation.totalPrice),
        `Remboursement arbitrage litige : ${adminNotes}`
      );

      return await prisma.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CANCELLED,
          litigeReason: `Tranché par Admin (Remboursement Client). Notes : ${adminNotes}`
        }
      });
    }

    // Option B : Transfert forcé des fonds vers la compagnie
    if (decision === "PAY_COMPANY") {
      const company = reservation.annonce.company;
      if (!company) throw new Error("Entreprise introuvable.");

      await prisma.$transaction(async (tx) => {
        await tx.company.update({
          where: { id: company.id },
          data: { balance: { increment: Number(reservation.totalPrice) } }
        });
      });

      return await prisma.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.PROCESSED,
          litigeReason: `Tranché par Admin (Versement Partenaire). Notes : ${adminNotes}`
        }
      });
    }
  },

  /**
   * 7. ANNULATION ET REMBOURSEMENT PAR SOUSTRACTION 
   */
  cancel: async (id: number, actor: "USER" | "COMPANY", reason?: string) => {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { annonce: { include: { company: true } } }
    });

    if (!reservation) throw new Error("Réservation introuvable.");
    if (
      reservation.status === ReservationStatus.CANCELLED ||
      reservation.status === ReservationStatus.PROCESSED
    ) {
      throw new Error("Cette réservation est déjà clôturée ou annulée.");
    }
    if (reservation.status === ReservationStatus.LITIGE) {
      throw new Error("Un litige est en cours sur cette réservation. Utilisez l'arbitrage Admin.");
    }

    let shouldRefund = false;

    if (actor === "COMPANY") {
      shouldRefund = true; 
    } else if (actor === "USER") {
      if (reservation.status === ReservationStatus.PENDING) {
        shouldRefund = true;
      } else if (reservation.status === ReservationStatus.CONFIRMED) {
        if (!reservation.cancellationDeadline || new Date() <= new Date(reservation.cancellationDeadline)) {
          shouldRefund = true;
        } else {
          throw new Error("Le délai de rétractation gratuite pour cette réservation est dépassé.");
        }
      }
    }

    let historicalTrancheId = `REF-FALLBACK-${Date.now()}`;

    // Étape 1 : Libération des verrous et stocks dans la transaction principale
    await prisma.$transaction(async (tx) => {
      if (reservation.annonce.company?.category === CompanyCategory.TRANSPORT && reservation.annonce.nbPlaces !== null) {
        await tx.annonce.update({
          where: { id: reservation.annonceId },
          data: { nbPlaces: { increment: reservation.quantity } }
        });
      }

      const historicalDebit = await tx.walletTranche.findFirst({
        where: { 
          userId: reservation.userId,
          description: { contains: reservation.reference }
        }
      });

      if (historicalDebit) {
        historicalTrancheId = historicalDebit.trancheId;
      }
    });

    // Étape 2 : Appel isolé à refundWallet (qui initie sa propre transaction interne)
    if (shouldRefund && reservation.totalPrice) {
      await walletService.refundWallet(
        reservation.userId,
        historicalTrancheId,
        Number(reservation.totalPrice),
        `Annulation réservation ${reservation.reference}`,
      );
    }

    // Étape 3 : Mutation de statut finale
    return await prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        litigeReason: reason ?? `Annulée par le profil : ${actor}`
      }
    });
  }
};