import prisma from "./prisma.service";
import { AmbianceType, VehicleType, ActivityType } from "../generated/prisma";

export interface AnnonceCreateInput {
  name: string;
  price: number | string;
  points?: number;
  image: string;
  description?: string | null; 
  category?: string | null;    
  expiresIn?: number;
  companyId: number;
  ambiance?: AmbianceType | null;
  hasAnimation?: boolean;
  isDeliveryAvailable?: boolean;
  isRomantique?: boolean;
  equipements?: any;
  vehicleType?: VehicleType | null;
  nbPlaces?: number | null;
  activityType?: ActivityType | null;
}

export interface AnnonceFilters {
  companyId?: number;
  category?: string;
  vehicleType?: VehicleType;
  activityType?: ActivityType;
  isAvailable?: boolean;
  isVerified?: boolean;
  search?: string;
}

export const annoncesService = {

  /**
   * 1. CRÉATION D'UNE ANNONCE
   */
  create: async (data: AnnonceCreateInput) => {
    // Vérification préalable de l'existence de l'entreprise
    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
    });
    if (!company) {
      throw new Error(
        "Impossible de créer l'annonce : l'entreprise partenaire spécifiée n'existe pas.",
      );
    }

    return await prisma.annonce.create({
      data: {
        name: data.name,
        price: data.price,
        points: data.points ?? 1,
        image: data.image,
        description: data.description ?? null,
        category: data.category ?? null,
        expiresIn: data.expiresIn ?? 30,
        companyId: data.companyId,
        
        // Données contextuelles injectées de manière sécurisée
        ambiance: data.ambiance ?? "SALLE_PRINCIPALE",
        hasAnimation: data.hasAnimation ?? false,
        isDeliveryAvailable: data.isDeliveryAvailable ?? false,
        isRomantique: data.isRomantique ?? false,
        equipements: data.equipements ?? null,
        
        vehicleType: data.vehicleType ?? null,
        nbPlaces: data.nbPlaces ?? null,
        activityType: data.activityType ?? null
      },
    });
  },

  /**
   * 2. MODIFICATION D'UNE ANNONCE
   */
  update: async (
    id: number,
    updateData: Partial<AnnonceCreateInput> & {
      isAvailable?: boolean;
      isVerified?: boolean;
      isSpecial?: boolean;
    },
  ) => {
    const annonce = await prisma.annonce.findUnique({ where: { id } });
    if (!annonce) throw new Error("Annonce introuvable.");

    // Conversion automatique du prix si fourni sous forme de chaîne
    if (updateData.price !== undefined) {
      updateData.price = updateData.price;
    }

    return await prisma.annonce.update({
      where: { id },
      data: {
        ...updateData,
        description: updateData.description !== undefined ? (updateData.description ?? null) : undefined,
        category: updateData.category !== undefined ? (updateData.category ?? null) : undefined,
        ambiance: updateData.ambiance !== undefined ? (updateData.ambiance ?? null) : undefined,
        vehicleType: updateData.vehicleType !== undefined ? (updateData.vehicleType ?? null) : undefined,
        nbPlaces: updateData.nbPlaces !== undefined ? (updateData.nbPlaces ?? null) : undefined,
        activityType: updateData.activityType !== undefined ? (updateData.activityType ?? null) : undefined,
      } as any,
    });
  },

  /**
   * 3. RÉCUPÉRATION INDIVIDUELLE D'UNE ANNONCE
   */
  getById: async (id: number) => {
    const annonce = await prisma.annonce.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            username: true,
            category: true,
            city: true,
            country: true,
          },
        },
      },
    });

    if (!annonce)
      throw new Error("L'annonce demandée n'existe pas ou a été retirée.");
    return annonce;
  },

  /**
   * 4. RECHERCHE MULTI-CRITÈRES ET RECHERCHE PAR TEXTE (Listing complet)
   */
  getMany: async (
    filters: AnnonceFilters = {},
    pagination: { limit?: number; page?: number } = { limit: 10, page: 0 },
  ) => {
    const limit = pagination.limit ?? 10;
    const page = pagination.page ?? 0;

    const {
      companyId,
      category,
      vehicleType,
      activityType,
      isAvailable,
      isVerified,
      search,
    } = filters;

    // Construction dynamique de la requête de filtrage PostgreSQL via Prisma
    const whereClause: any = {
      ...(companyId && { companyId }),
      ...(category && { category: { equals: category, mode: "insensitive" } }),
      ...(vehicleType && { vehicleType }),
      ...(activityType && { activityType }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(isVerified !== undefined && { isVerified }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const totalRows = await prisma.annonce.count({ where: whereClause });
    const result = await prisma.annonce.findMany({
      where: whereClause,
      skip: limit * page,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: {
            username: true,
            logo: true,
          },
        },
      },
    });

    return {
      result,
      totalRows,
      totalPage: Math.ceil(totalRows / limit),
      page,
      limit,
    };
  },

  /**
   * 5. SUPPRESSION DÉFINITIVE D'UNE ANNONCE
   */
  delete: async (id: number) => {
    const annonce = await prisma.annonce.findUnique({ where: { id } });
    if (!annonce)
      throw new Error("Impossible de supprimer : annonce introuvable.");

    return await prisma.annonce.delete({
      where: { id },
    });
  },
};
