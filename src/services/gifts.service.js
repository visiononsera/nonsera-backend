import prisma from "./prisma.service.js";
import { GiftCategory, PurchaseStatus } from "../generated/prisma/index.js";

export const giftsService = {

  // ======================================================
  // MANAGEMENT DU REFLUX ET CRUD DES CADEAUX (GIFT)
  // ======================================================

  /**
   * Créer un cadeau standard (Assigné ou non à une Company)
   */
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

  /**
   * Récupérer tous les cadeaux actifs/disponibles (Filtres optionnels)
   */
  getAllAvailable: async (filters) => {
    return await prisma.gift.findMany({
      where: {
        isAvailable: true,
        ...(filters?.category && { category: filters.category }),
        ...(filters?.companyId && { companyId: filters.companyId }),
      },
      include: {
        company: { select: { name: true, logo: true } }
      },
      orderBy: { price: "asc" },
    });
  },

  /**
   * Récupérer un cadeau spécifique par son ID
   */
  getById: async (id) => {
    const gift = await prisma.gift.findUnique({
      where: { id },
      include: { company: { select: { name: true, logo: true } } }
    });
    if (!gift) throw new Error("Le cadeau demandé n'existe pas.");
    return gift;
  },

  /**
   * Mettre à jour les informations d'un cadeau
   */
  update: async (id, data) => {
    return await prisma.gift.update({
      where: { id },
      data,
    });
  },

  /**
   * Suppression logique d'un cadeau
   */
  delete: async (id) => {
    return await prisma.gift.update({
      where: { id },
      data: { isAvailable: false },
    });
  },

  // ======================================================
  // CONFIGURATION DES PRÉFÉRENCES UTILISATEURS
  // ======================================================

  /**
   * Définir le cadeau standard préféré d'un utilisateur (Depuis la table gift)
   */
  setPreferredGift: async (userId, giftId) => {
    return await prisma.user.update({
      where: { id: userId },
      data: { preferredGiftId: giftId },
      select: { id: true, fullname: true, preferredGiftId: true }
    });
  },

  /**
   * Définir une Annonce d'entreprise comme souhait/intention de cadeau principal
   */
  setGiftPurposeAnnonce: async (userId, annonceId) => {
    return await prisma.user.update({
      where: { id: userId },
      data: { giftPurposeId: annonceId },
      select: { id: true, fullname: true, giftPurposeId: true }
    });
  },

  // ======================================================
  // CONSULTATION / HISTORIQUE DE L'UTILISATEUR
  // ======================================================

  /**
   * Récupérer exclusivement les annonces types cadeaux reçues par un utilisateur
   */
  getReceivedAnnonceGifts: async (userId) => {
    return await prisma.purchase.findMany({
      where: { 
        receiverId: userId,
        status: { not: PurchaseStatus.CANCELLED }
      },
      include: {
        annonce: {
          include: { 
            company: { select: { name: true, logo: true } } 
          }
        },
        sender: { 
          select: { id: true, fullname: true, profilePhoto: true } 
        }
      },
      orderBy: { createdAt: "desc" }
    });
  },

  /**
   * Récupérer l'intégralité des cadeaux reçus par un utilisateur
   */
  getReceivedGifts: async (userId) => {
    return await prisma.purchase.findMany({
      where: { 
        receiverId: userId,
        status: { not: PurchaseStatus.CANCELLED }
      },
      include: {
        gift: true,
        annonce: {
          include: { 
            company: { select: { name: true, logo: true } } 
          }
        },
        sender: { 
          select: { id: true, fullname: true, profilePhoto: true } 
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }
};