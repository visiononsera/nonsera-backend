import prisma from "./prisma.service.js";
import { AmbianceType } from "../generated/prisma/index.js";
import { storageService } from "./storage/storage.factory.js";

export const annoncesService = {
  /**
   * 1. CRÉATION D'UNE ANNONCE
   */
  create: async (data, file) => {
    // Vérification préalable de l'existence de l'entreprise
    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
    });
    if (!company) {
      throw new Error(
        "Impossible de créer l'annonce : l'entreprise partenaire spécifiée n'existe pas.",
      );
    }

    // Gestion de l'upload d'image si un fichier est fourni
    let imageUrl = data.image; // Par défaut, on utilise l'image existante si elle est fournie
    if (file) {
      // Appel du service de stockage pour uploader le fichier
      imageUrl = await storageService.uploadFile(file);
    } else if (!imageUrl && !data.description && !data.points) {
      // Si aucune image n'est fournie et que d'autres champs obligatoires sont manquants, lever une erreur
      throw new Error("Une image est requise pour créer une annonce.");
    }

    return await prisma.annonce.create({
      data: {
        name: data.name,
        price: data.price,
        points: data.points ?? 1,
        image: imageUrl,
        description: data.description ?? null,
        category: data.category ?? null,
        expiresIn: data.expiresIn ?? 30,
        companyId: data.companyId,

        // Données contextuelles injectées de manière sécurisée
        ambiance: data.ambiance ?? AmbianceType.SALLE_PRINCIPALE,
        hasAnimation: data.hasAnimation ?? false,
        isDeliveryAvailable: data.isDeliveryAvailable ?? false,
        isRomantique: data.isRomantique ?? false,
        equipements: data.equipements ?? null,

        vehicleType: data.vehicleType ?? null,
        nbPlaces: data.nbPlaces ?? null,
        activityType: data.activityType ?? null,
      },
    });
  },

  /**
   * 2. MODIFICATION D'UNE ANNONCE
   */
  update: async (id, updateData, file) => {
    const annonce = await prisma.annonce.findUnique({ where: { id } });
    if (!annonce) throw new Error("Annonce introuvable.");

    if (updateData.price !== undefined) {
      updateData.price = parseFloat(updateData.price);
    }

    let imageUrl = updateData.image;
    // Gérer l'upload si un nouveau fichier est fourni
    if (file) {
      // Uploader la nouvelle image
      imageUrl = await storageService.uploadFile(file);

      // Nettoyage : Supprimer l'ancienne image si elle existe et n'est pas la même que la nouvelle
      if (annonce.image && annonce.image !== imageUrl) {
        // Suppression asynchrone pour ne pas bloquer l'utilisateur, avec capture d'erreur
        storageService
          .deleteFile(annonce.image)
          .catch((err) =>
            console.error(
              `Impossible de supprimer l'ancienne image de l'annonce ${id} :`,
              err,
            ),
          );
      }
    }
    return await prisma.annonce.update({
      where: { id },
      data: {
        ...updateData,
        image: imageUrl,
        description:
          updateData.description !== undefined
            ? (updateData.description ?? null)
            : undefined,
        category:
          updateData.category !== undefined
            ? (updateData.category ?? null)
            : undefined,
        ambiance:
          updateData.ambiance !== undefined
            ? (updateData.ambiance ?? null)
            : undefined,
        vehicleType:
          updateData.vehicleType !== undefined
            ? (updateData.vehicleType ?? null)
            : undefined,
        nbPlaces:
          updateData.nbPlaces !== undefined
            ? (updateData.nbPlaces ?? null)
            : undefined,
        activityType:
          updateData.activityType !== undefined
            ? (updateData.activityType ?? null)
            : undefined,
      },
    });
  },

  /**
   * 3. RÉCUPÉRATION INDIVIDUELLE D'UNE ANNONCE
   */
  getById: async (id) => {
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
    filters = {},
    pagination = { limit: 10, page: 0 },
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
    const whereClause = {
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
  delete: async (id) => {
    const annonce = await prisma.annonce.findUnique({ where: { id } });
    if (!annonce)
      throw new Error("Impossible de supprimer : annonce introuvable.");

    return await prisma.annonce.delete({
      where: { id },
    });
  },
};