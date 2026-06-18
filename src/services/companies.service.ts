import prisma from "./prisma.service";

export const companiesService = {
  // CRÉATION D'UNE ENTREPRISE PARTENAIRE
  create: async (companyData: any) => {
    const {
      phoneNumber,
      username,
      email,
      category,
      country,
      city,
      description,
      mapAddress,
      numeroSocial,
    } = companyData;

    const existingPhone = await prisma.company.findUnique({
      where: { phoneNumber },
    });
    if (existingPhone)
      throw new Error(
        "Une entreprise avec ce numéro de téléphone existe déjà.",
      );

    if (username) {
      const existingUsername = await prisma.company.findUnique({
        where: { username },
      });
      if (existingUsername)
        throw new Error("Ce nom d'entreprise est déjà enregistré.");
    }

    return await prisma.company.create({
      data: {
        phoneNumber,
        username,
        email,
        category,
        country,
        city,
        description,
        mapAddress,
        numeroSocial,
        solde: 0.0,
      },
    });
  },

  // MODIFICATION DES DONNÉES DE L'ENTREPRISE
  update: async (id: string, updateData: any) => {
    const companyId = parseInt(id);

    if (updateData.phoneNumber) {
      const phoneCheck = await prisma.company.findFirst({
        where: { phoneNumber: updateData.phoneNumber, NOT: { id: companyId } },
      });
      if (phoneCheck)
        throw new Error(
          "Ce numéro de téléphone est déjà utilisé par une autre entreprise.",
        );
    }

    if (updateData.username) {
      const usernameCheck = await prisma.company.findFirst({
        where: { username: updateData.username, NOT: { id: companyId } },
      });
      if (usernameCheck)
        throw new Error("Ce nom d'entreprise est déjà utilisé.");
    }

    return await prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });
  },

  // AFFICHAGE INDIVIDUEL COMPLEMENTAIRE
  getById: async (id: string) => {
    return await prisma.company.findUnique({
      where: { id: parseInt(id) },
      include: {
        annonces: true,
        gifts: true,
        subscriptions: {
          include: {
            subscription: true,
          },
        },
      },
    });
  },

  // FILTRE, RECHERCHE MUTLI-CRITÈRES ET LISTING DES COMPAGNIES
  getMany: async (filters: any = {}, pagination: any = { limit: 8, page: 0 }) => {
    const limit = parseInt(pagination.limit as string) || 8;
    const page = parseInt(pagination.page as string) || 0;

    const { category, city, country, search } = filters;

    const whereClause: any = {
      ...(category && { category: { equals: category, mode: "insensitive" } }),
      ...(city && { city: { contains: city, mode: "insensitive" } }),
      ...(country && { country: { equals: country, mode: "insensitive" } }),
      ...(search && {
        OR: [
          { username: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phoneNumber: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const totalRows = await prisma.company.count({ where: whereClause });
    const result = await prisma.company.findMany({
      where: whereClause,
      skip: limit * page,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return {
      result,
      totalRows,
      totalPage: Math.ceil(totalRows / limit),
      page,
      limit,
    };
  },

  // SUPPRESSION DE LA COMPAGNIE
  delete: async (id: string) => {
    return await prisma.company.delete({
      where: { id: parseInt(id) },
    });
  },
};
