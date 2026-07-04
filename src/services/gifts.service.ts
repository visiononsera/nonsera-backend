import prisma from "./prisma.service";
import { GiftCategory, PurchaseStatus } from "../generated/prisma";

export const giftsService = {

  // ======================================================
  // 1. MANAGEMENT DU REFLUX ET CRUD DES CADEAUX (GIFT)
  // ======================================================

  /**
   * Créer un cadeau standard (Assigné ou non à une Company)
   */
  create: async (data: {
    name: string;
    price: number;
    points?: number;
    image: string;
    description?: string;
    category?: GiftCategory;
    companyId?: number;
  }) => {
    return await prisma.gift.create({
      data: {
        name: data.name,
        price: data.price,
        points: data.points || 0,
        image: data.image ,
        description: data.description || null,
        category: data.category || GiftCategory.ROSE,
        companyId: data.companyId || null,
      },
    });
  },

  /**
   * Récupérer tous les cadeaux actifs/disponibles (Filtres optionnels)
   */
  getAllAvailable: async (filters?: { category?: GiftCategory; companyId?: number }) => {
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
  getById: async (id: number) => {
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
  update: async (id: number, data: Partial<{
    name: string;
    price: number;
    points: number;
    image: string;
    description: string;
    category: GiftCategory;
    isAvailable: boolean;
  }>) => {
    return await prisma.gift.update({
      where: { id },
      data,
    });
  },

  /**
   * Suppression logique d'un cadeau
   */
  delete: async (id: number) => {
    return await prisma.gift.update({
      where: { id },
      data: { isAvailable: false },
    });
  },

  // ======================================================
  // 2. CONFIGURATION DES PRÉFÉRENCES UTILISATEURS
  // ======================================================

  /**
   * Définir le cadeau standard préféré d'un utilisateur (Depuis la table gift)
   */
  setPreferredGift: async (userId: number, giftId: number | null) => {
    return await prisma.user.update({
      where: { id: userId },
      data: { preferredGiftId: giftId },
      select: { id: true, fullname: true, preferredGiftId: true }
    });
  },

  /**
   * Définir une Annonce d'entreprise comme souhait/intention de cadeau principal
   */
  setGiftPurposeAnnonce: async (userId: number, annonceId: number | null) => {
    return await prisma.user.update({
      where: { id: userId },
      data: { giftPurposeId: annonceId },
      select: { id: true, fullname: true, giftPurposeId: true }
    });
  },

  // ======================================================
  // 3. CONSULTATION / HISTORIQUE DE L'UTILISATEUR
  // ======================================================

  /**
   * Récupérer exclusivement les annonces types cadeaux reçues par un utilisateur
   */
  getReceivedAnnonceGifts: async (userId: number) => {
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
   * Récupérer l'intégralité des cadeaux reçus par un utilisateur (Polymorphisme complet)
   */
  getReceivedGifts: async (userId: number) => {
    return await prisma.purchase.findMany({
      where: { 
        receiverId: userId,
        status: { not: PurchaseStatus.CANCELLED }
      },
      include: {
        gift: true, // Relation mise à jour vers Gift
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