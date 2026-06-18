import prisma from "./prisma.service";

/**
 * Génère un nom d'utilisateur unique à partir du fullname
 * @param {string} fullname
 * @returns {Promise<string>} username unique généré
 */
async function generateUniqueUsername(fullname: string) {
  // Nettoyage de la chaîne : minuscules, suppression des accents et caractères spéciaux
  let baseUsername = fullname
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^a-z0-9\s]/g, "") // Conserve uniquement l'alphanumérique et les espaces
    .trim()
    .replace(/\s+/g, "."); // Remplace les espaces par des points

  if (!baseUsername) {
    baseUsername = "user";
  }

  let username = baseUsername;
  let isUnique = false;
  let counter = 0;

  // Boucle de vérification d'unicité en base de données
  while (!isUnique) {
    if (counter > 0) {
      username = `${baseUsername}.${counter}`;
    }

    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (!existing) {
      isUnique = true;
    } else {
      counter++;
    }
  }

  return username;
}

export const usersService = {
  create: async (userData: any) => {
    const { phoneNumber, fullname, passCode, role, onboardingStep } = userData;

    const existingPhone = await prisma.user.findUnique({
      where: { phoneNumber },
    });
    if (existingPhone)
      throw new Error("Ce numéro de téléphone est déjà associé à un compte.");

    let generatedUsername = null;
    if (fullname) {
      generatedUsername = await generateUniqueUsername(fullname);
    }

    return await prisma.user.create({
      data: {
        phoneNumber,
        fullname: fullname || "Utilisateur",
        username: generatedUsername,
        passCode,
        role: role || "USER",
        onboardingStep: onboardingStep || "GENERAL_INFO",
      },
    });
  },

  update: async (id: string, updateData: any) => {
    const userId = parseInt(id);

    // Si mise à jour de l'username, on vérifie l'unicité globale
    if (updateData.username) {
      const uniqueCheck = await prisma.user.findFirst({
        where: { username: updateData.username, NOT: { id: userId } },
      });
      if (uniqueCheck)
        throw new Error(
          "Ce nom d'utilisateur est déjà utilisé par un autre compte.",
        );
    }

    return await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  },

  getById: async (id: string) => {
    return await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        preferredGift: true,
        giftPurpose: true,
      },
    });
  },

  getMany: async (
    filters: any = {},
    pagination: any = { limit: 8, page: 0 },
  ) => {
    const limit = parseInt(pagination.limit as string) || 8;
    const page = parseInt(pagination.page) || 0;

    const {
      role,
      isCertified,
      isOnline,
      pays,
      villes,
      genre,
      excludeUserId,
      search,
    } = filters;

    const whereClause: any = {
      isBanned: false,
      ...(role ? { role } : { role: "USER" }),
      ...(excludeUserId && { NOT: { id: parseInt(excludeUserId) } }),
      ...(isCertified !== undefined && { isCertified }),
      ...(isOnline !== undefined && { isOnline }),
      ...(pays && { pays: { equals: pays, mode: "insensitive" } }),
      ...(villes && { villes: { contains: villes, mode: "insensitive" } }),
      ...(genre && { genre: genre }),
      ...(search && {
        OR: [
          { username: { contains: search, mode: "insensitive" } },
          { phoneNumber: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const totalRows = await prisma.user.count({ where: whereClause });
    const result = await prisma.user.findMany({
      where: whereClause,
      skip: limit * page,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        preferredGift: true,
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

  getAccountByPhone: async (phoneNumber: string) => {
    return await prisma.user.findFirst({
      where: { phoneNumber },
    });
  },

  delete: async (id: string) => {
    return await prisma.user.delete({
      where: { id: parseInt(id) },
    });
  },
};
