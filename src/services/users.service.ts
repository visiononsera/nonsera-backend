import bcrypt from "bcrypt";
import prisma from "./prisma.service.js";
import type { Gender, Role } from "../generated/prisma/index.js";
import { SALT_ROUND } from "../config/env.js";

export const usersService = {
  getMany: async (
    filters: any = {},
    pagination: any = { limit: 8, page: 0 },
  ) => {
    const limit = parseInt(pagination.limit, 10) || 8;
    const page = parseInt(pagination.page, 10) || 0;
    const {
      phoneNumber,
      role,
      isCertified,
      isOnline,
      pays,
      villes,
      genre,
      excludeUserId,
      search,
    } = filters;

    const whereClause: any = { isBanned: false };

    if (role !== undefined && role !== null && role !== "")
      whereClause.role = role as Role;
    if (phoneNumber && phoneNumber.trim() !== "")
      whereClause.phoneNumber = phoneNumber.trim();

    if (excludeUserId) {
      const exId =
        typeof excludeUserId === "string"
          ? parseInt(excludeUserId, 10)
          : excludeUserId;
      if (!isNaN(exId)) whereClause.NOT = { id: exId };
    }

    if (isCertified !== undefined && isCertified !== null)
      whereClause.isCertified = !!isCertified;
    if (isOnline !== undefined && isOnline !== null)
      whereClause.isOnline = !!isOnline;
    if (pays && pays.trim() !== "")
      whereClause.country = { equals: pays.trim(), mode: "insensitive" };
    if (villes && villes.trim() !== "")
      whereClause.city = { contains: villes.trim(), mode: "insensitive" };
    if (genre) whereClause.gender = genre as Gender;

    if (search && search.trim() !== "") {
      const cleanSearch = search.trim();
      whereClause.OR = [
        { username: { contains: cleanSearch, mode: "insensitive" } },
        { phoneNumber: { contains: cleanSearch, mode: "insensitive" } },
        { fullname: { contains: cleanSearch, mode: "insensitive" } },
      ];
    }

    try {
      const totalRows = await prisma.user.count({ where: whereClause });
      const result = await prisma.user.findMany({
        where: whereClause,
        skip: limit * page,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { preferredGift: true },
      });

      return {
        result,
        totalRows,
        totalPage: Math.ceil(totalRows / limit),
        page,
        limit,
      };
    } catch (error: any) {
      console.dir(error, { depth: null }); // Affiche l'objet complet sans troncature
      throw error;
    }
  },

  getAccountByPhone: async (phoneNumber: string) => {
    try {
      const cleanPhone = phoneNumber ? phoneNumber.trim() : "";
      return await prisma.user.findFirst({
        where: { phoneNumber: cleanPhone },
      });
    } catch (error: any) {
      console.dir(error, { depth: null });
      throw error;
    }
  },
  /**
   * Récupère un utilisateur par son ID
   */
  findById: async (id: number) => {
    return await prisma.user.findUnique({ where: { id } });
  },

  /**
   * Crée un compte utilisateur (Standard ou Staff)
   */
  create: async (data: any) => {
    return await prisma.user.create({ data });
  },

  /**
   * Génère un username unique basé sur le fullname fourni
   * Format : minuscules, sans accents, sans caractères spéciaux + suffixe numérique en cas de doublon
   */
  generateUniqueUsername: async (fullname: string): Promise<string> => {
    const baseUsername = fullname
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
      .replace(/[^a-z0-9]/g, ""); // Supprime les caractères spéciaux et espaces

    let finalUsername = baseUsername || "user";
    let isUnique = false;
    let counter = 1;

    while (!isUnique) {
      const existing = await prisma.user.findUnique({
        where: { username: finalUsername },
      });

      if (!existing) {
        isUnique = true;
      } else {
        finalUsername = `${baseUsername}${counter}`;
        counter++;
      }
    }
    return finalUsername;
  },

  /**
   * Met à jour les données de l'utilisateur (Onboarding et Standard)
   * Intègre la contrainte de cooldown de 2 jours et la permutation des photos (Max 3)
   */
  updateOnboardingData: async (userId: number, inputData: any) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Utilisateur introuvable.");

    // Bloquer les modifications si le compte est restreint
    if (user.isBanned || user.deletedAt) {
      throw new Error("Action impossible. Ce compte n'est pas actif.");
    }

    const updatePayload: any = {};

    // 1. Mise à jour du Fullname -> Génération d'un nouvel username unique associé
    if (inputData.fullname) {
      updatePayload.fullname = inputData.fullname;
      updatePayload.username = await usersService.generateUniqueUsername(
        inputData.fullname,
      );
    }

    // 2. Logique de permutation des photos avec limite stricte à 3 images au total
    if (inputData.profilePhoto) {
      // Restriction temporelle des 2 jours : Ignorée si l'onboarding n'est pas encore complété
      if (user.isCompleted && user.lastPhotoUpdated) {
        const lastUpdate = new Date(user.lastPhotoUpdated);
        const nextAllowedUpdate = new Date(
          lastUpdate.getTime() + 2 * 24 * 60 * 60 * 1000,
        );

        if (new Date() < nextAllowedUpdate) {
          throw new Error(
            "Sécurité : Vous ne pouvez modifier votre photo de profil que tous les 2 jours.",
          );
        }
      }

      // Algorithme de glissement de la file d'attente des photos (Max 3)
      // L'ancienne Photo Principale (1) glisse vers l'Image 2 (firstOtherPhoto)
      // L'ancienne Image 2 (firstOtherPhoto) glisse vers l'Image 3 (secondOtherPhoto)
      // L'ancienne Image 3 (thirdOtherPhoto) est automatiquement évincée
      if (user.profilePhoto) {
        updatePayload.firstOtherPhoto = user.profilePhoto;

        if (user.firstOtherPhoto) {
          updatePayload.secondOtherPhoto = user.firstOtherPhoto;
        }
      }

      // La nouvelle image devient l'image principale (1)
      updatePayload.profilePhoto = inputData.profilePhoto;
      updatePayload.lastPhotoUpdated = new Date();
    }

    // 3. Traitement des autres attributs
    if (inputData.email) updatePayload.email = inputData.email;
    if (inputData.birthday)
      updatePayload.birthday = new Date(inputData.birthday);
    if (inputData.gender) updatePayload.gender = inputData.gender;

    const incomingPin = inputData.pin || inputData.code || inputData.passCode;

    if (incomingPin) {
      const salt = await bcrypt.genSalt(SALT_ROUND);
      updatePayload.passCode = await bcrypt.hash(incomingPin, salt);
    }
    
    // 5. Nouvelles données issues de ProfileDetailsScreen
    if (inputData.religion) {
      updatePayload.religion = inputData.religion;
    }

    // Gestion du champ 'passion' (Prisma attend une String, le front envoie un Array ou un JSON stringifié)
    if (inputData.passions) {
      let passionsArray = inputData.passions;
      if (typeof inputData.passions === "string") {
        try {
          passionsArray = JSON.parse(inputData.passions);
        } catch {
          passionsArray = [inputData.passions];
        }
      }
      // On sépare par des virgules pour stocker les passions dans le champ String du modèle
      updatePayload.passion = Array.isArray(passionsArray) ? passionsArray.join(", ") : passionsArray;
    }

    // Gestion de la taille (height) et structuration dans le champ Json 'preferences'
    if (inputData.height) {
      const heightCm = parseInt(inputData.height, 10);
      if (!isNaN(heightCm)) {
        // Récupération des préférences existantes pour ne rien écraser
        const existingPreferences = user.preferences ? (user.preferences as Record<string, any>) : {};
        updatePayload.preferences = {
          ...existingPreferences,
          height: heightCm,
        };
      }
    }

    if (inputData.nextStep) updatePayload.onboardingStep = inputData.nextStep;
    updatePayload.lastProfileUpdated = new Date();

    return await prisma.user.update({
      where: { id: userId },
      data: updatePayload,
    });
  },

  /**
   * Recharge ou met à jour le solde (coins) de l'utilisateur
   * Enveloppé dans une transaction Prisma sécurisée pour l'audit financier
   */
  creditUserCoins: async (
    userId: number,
    amount: number,
    reference?: string,
  ) => {
    if (amount <= 0) {
      throw new Error(
        "Le montant du rechargement doit être strictement supérieur à 0.",
      );
    }

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("Utilisateur introuvable.");

      // Incrémentation atomique du solde de jetons
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          coins: { increment: amount },
        },
      });

      return updatedUser;
    });
  },

  /**
   * Désactivation temporaire (Masquage logique du compte)
   */
  deactivateAccount: async (userId: number) => {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: false,
        deviceToken: null, // Révocation des notifications push immédiate
      },
    });
  },

  /**
   * Suppression définitive (Conformité stricte Google Play Store)
   * Nettoie les sessions actives, les sockets associés et supprime l'entité
   */
  deleteAccountCompletely: async (userId: number) => {
    return await prisma.$transaction(async (tx) => {
      // 1. Purge des sessions de connexions et mappages volatils
      await tx.socketMapping.deleteMany({ where: { userId } });
      await tx.userSession.deleteMany({ where: { userId } });

      // 2. Suppression définitive du nœud utilisateur
      return await tx.user.delete({
        where: { id: userId },
      });
    });
  },

  /**
   * Mise à jour générique brute (Administration / Outils internes)
   */
  update: async (id: number, data: any) => {
    return await prisma.user.update({
      where: { id },
      data,
    });
  },
};
