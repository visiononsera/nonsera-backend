import prisma from "../services/prisma.service.js";

export const globalSearch = async (req, res) => {
  try {
    const { query, country } = req.query; // On attend le nom du pays en clair (ex: Benin, Togo)
    const currentUserId = req.user?.id;

    // Règle métier : Minimum 4 caractères
    if (!query || String(query).trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: "La recherche nécessite un minimum de 4 caractères.",
      });
    }

    const searchString = String(query).trim();
    // Normalisation du pays pour éviter les problèmes de casse
    const targetCountry = country ? String(country).trim().toLowerCase() : null;

    // 1. Récupération des Utilisateurs Célibataires (sans match ACTIVE en cours)
    const dbUsers = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        role: "USER",
        isCompleted: true,
        isBanned: false,
        // Un utilisateur est célibataire s'il n'a AUCUN match ACTIVE (émis ou reçu)
        MatchSender: {
          none: { status: "ACTIVE" }
        },
        MatchReceiver: {
          none: { status: "ACTIVE" }
        },
        // Recherche textuelle
        OR: [
          { fullname: { contains: searchString, mode: "insensitive" } },
          { username: { contains: searchString, mode: "insensitive" } },
        ],
      },
      // Pas de select restrictif pour tout charger. On nettoiera le passCode juste après.
    });

    // Nettoyage des données sensibles des utilisateurs
    const cleanUsers = dbUsers.map(user => {
      const { passCode, coins, ...secureUser } = user; // Ajuste selon le nom exact de ton champ sensible
      return secureUser;
    });

    // 2. Partenaires Commerciaux + Toutes leurs annonces actives
    const dbCompanies = await prisma.company.findMany({
      where: {
        deletedAt: null,
        isVerified: true,
        category: {
          in: ["RESTAURANT", "HOTEL", "ACTIVITY", "OTHER", "BEAUTY", "GIFT"], 
        },
        OR: [
          { name: { contains: searchString, mode: "insensitive" } },
          { username: { contains: searchString, mode: "insensitive" } },
          { description: { contains: searchString, mode: "insensitive" } },
        ],
      },
      include: {
        annonces: {
          where: { isAvailable: true },
        },
      },
    });

    // 3. Codes Promo / Annonces + Informations de l'établissement complet
    const dbAnnonces = await prisma.annonce.findMany({
      where: {
        isAvailable: true,
        category: {
          notIn: ["Cadeau", "GIFT", "Gifts"], 
        },
        OR: [
          { name: { contains: searchString, mode: "insensitive" } },
          { description: { contains: searchString, mode: "insensitive" } },
        ],
      },
      include: {
        company: true,
      },
    });

    // 4. Algorithme d'ordonnancement par Pays (Texte complet)
    const sortWithCountryPriority = (list, countryKey) => {
      if (!targetCountry) return list;
      return list.sort((a, b) => {
        const aIsLocal = a[countryKey]?.toLowerCase() === targetCountry;
        const bIsLocal = b[countryKey]?.toLowerCase() === targetCountry;
        return aIsLocal === bIsLocal ? 0 : aIsLocal ? -1 : 1;
      });
    };

    const sortedUsers = sortWithCountryPriority(cleanUsers, "country");
    const sortedCompanies = sortWithCountryPriority(dbCompanies, "country");

    const sortedAnnonces = !targetCountry
      ? dbAnnonces
      : dbAnnonces.sort((a, b) => {
          const aIsLocal = a.company?.country?.toLowerCase() === targetCountry;
          const bIsLocal = b.company?.country?.toLowerCase() === targetCountry;
          return aIsLocal === bIsLocal ? 0 : aIsLocal ? -1 : 1;
        });

    // 5. Formatage de la réponse unifiée
    return res.status(200).json({
      success: true,
      data: {
        users: sortedUsers.map((u) => ({
          ...u,
          type: "USER",
          title: u.fullname || u.username,
          subtitle: u.city ? `${u.city}, ${u.country}` : u.country,
          isLocalCountry: u.country?.toLowerCase() === targetCountry,
        })),
        partners: sortedCompanies.map((c) => ({
          ...c,
          type: "PARTNER",
          title: c.name || c.username,
          subtitle: c.city ? `${c.city}, ${c.country}` : c.country,
          isLocalCountry: c.country?.toLowerCase() === targetCountry,
        })),
        promos: sortedAnnonces.map((a) => ({
          ...a,
          type: "PROMO",
          title: a.name,
          subtitle: a.description,
          isLocalCountry: a.company?.country?.toLowerCase() === targetCountry,
        })),
      },
    });
  } catch (error) {
    console.error("Erreur Search API :", error);
    return res.status(500).json({
      success: false,
      message: "Une erreur interne est survenue lors de la recherche.",
      error: error.message,
    });
  }
};