import type { Request, Response } from "express";
import prisma from "../services/prisma.service";

export const globalSearch = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { query, countryCode } = req.query;
    const currentUserId = req.user?.id;

    // Règle métier : Minimum 4 caractères
    if (!query || String(query).trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: "La recherche nécessite un minimum de 4 caractères.",
      });
    }

    const searchString = String(query).trim();
    const userCountry = countryCode ? String(countryCode).toUpperCase() : null;

    // 2. Utilisateurs Célibataires
    const dbUsers = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        role: "USER",
        isCompleted: true,
        isBanned: false,
        OR: [
          { fullname: { contains: searchString, mode: "insensitive" } },
          { username: { contains: searchString, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        fullname: true,
        username: true,
        profilePhoto: true,
        country: true,
        city: true,
        birthday: true,
      },
    });

    // 3. Partenaires Commerciaux
    const dbCompanies = await prisma.company.findMany({
      where: {
        deletedAt: null,
        category: {
          in: ["RESTAURANT", "HOTEL", "ACTIVITY", "OTHER"], 
        },
        OR: [
          { username: { contains: searchString, mode: "insensitive" } },
          { description: { contains: searchString, mode: "insensitive" } },
          // Si le nom commercial est stocké dans username ou si tu as une autre colonne
        ],
      },
      select: {
        id: true,
        username: true,
        logo: true,
        category: true,
        country: true,
        city: true,
      },
    });

    // Codes Promo / Annonces 
    const dbAnnonces = await prisma.annonce.findMany({
      where: {
        isAvailable: true,
        category: {
          notIn: ["Cadeau", "GIFT", "Gifts"], // Sécurité sur les chaînes selon ton implémentation textuelle
        },
        OR: [
          { name: { contains: searchString, mode: "insensitive" } },
          { description: { contains: searchString, mode: "insensitive" } },
        ],
      },
      include: {
        company: {
          select: {
            country: true,
            city: true,
          },
        },
      },
    });

    // 5. Règle métier : Ordonnancement par Pays 
    const sortWithCountryPriority = (list: any[], countryKey: string) => {
      if (!userCountry) return list;
      return list.sort((a, b) => {
        const aIsLocal = a[countryKey]?.toUpperCase() === userCountry;
        const bIsLocal = b[countryKey]?.toUpperCase() === userCountry;
        return aIsLocal === bIsLocal ? 0 : aIsLocal ? -1 : 1;
      });
    };

    const sortedUsers = sortWithCountryPriority(dbUsers, "country");
    const sortedCompanies = sortWithCountryPriority(dbCompanies, "country");

    // Pour les annonces, le pays est extrait de la relation avec la Company
    const sortedAnnonces = !userCountry
      ? dbAnnonces
      : dbAnnonces.sort((a, b) => {
          const aIsLocal = a.company?.country?.toUpperCase() === userCountry;
          const bIsLocal = b.company?.country?.toUpperCase() === userCountry;
          return aIsLocal === bIsLocal ? 0 : aIsLocal ? -1 : 1;
        });

    // 6. Formatage de la réponse unifiée
    return res.status(200).json({
      success: true,
      data: {
        users: sortedUsers.map((u) => ({
          id: u.id,
          type: "USER",
          title: u.fullname || u.username,
          subtitle: u.city ? `${u.city}, ${u.country}` : u.country,
          avatar: u.profilePhoto,
          isLocalCountry: u.country?.toUpperCase() === userCountry,
        })),
        partners: sortedCompanies.map((c) => ({
          id: c.id,
          type: "PARTNER",
          title: c.username || "Partenaire",
          subtitle: c.city ? `${c.city}, ${c.country}` : c.country,
          category: c.category === "RESTAUANT" ? "Restaurant" : c.category, 
          isLocalCountry: c.country?.toUpperCase() === userCountry,
        })),
        promos: sortedAnnonces.map((a) => ({
          id: a.id,
          type: "PROMO",
          title: a.name,
          subtitle: `${a.price} | ${a.description?.substring(0, 60)}...`,
          avatar: a.image,
          isLocalCountry: a.company?.country?.toUpperCase() === userCountry,
        })),
      },
    });
  } catch (error: any) {
    console.error("Erreur Search API :", error);
    return res.status(500).json({
      success: false,
      message: "Une erreur interne est survenue lors de la recherche.",
      error: error.message,
    });
  }
};
