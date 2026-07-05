import bcrypt from "bcrypt";
import prisma from "./prisma.service.js";
import type { Gender, Role } from "../generated/prisma/index";
import { SALT_ROUND } from "../config/env.js";
import { storageService } from "./storage/storage.factory";

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
   * Intègre la contrainte de cooldown de 2 jours, la permutation des photos (Max 3)
   * et la sauvegarde de la biographie, vision, religion et passions.
   */
  updateOnboardingData: async (userId: number, inputData: any) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Utilisateur introuvable.");

    // Bloquer les modifications si le compte est restreint ou supprimé
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

    // 2. Logique de permutation et contrôle de la photo de profil (Contrainte de 2 jours)
    if (inputData.profilePhoto) {
      // Restriction temporelle de 2 jours : Active uniquement si le profil est complété
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

      const newPhotoUrl = await storageService.uploadFile(inputData.profilePhoto);

      // Algorithme de décalage de la file d'attente (Max 3 photos secondaires)
      // L'ancienne Photo Principale devient l'Image 2 (firstOtherPhoto)
      // L'ancienne Image 2 devient l'Image 3 (secondOtherPhoto)
      // L'ancienne Image 3 (thirdOtherPhoto) est évincée du flux circulaire
      if (user.profilePhoto) {
        updatePayload.firstOtherPhoto = user.profilePhoto;

        if (user.firstOtherPhoto) {
          updatePayload.secondOtherPhoto = user.firstOtherPhoto;
        }
      }

      // La nouvelle image devient l'image principale
      updatePayload.profilePhoto = newPhotoUrl;
      updatePayload.lastPhotoUpdated = new Date();
    }

    // 3. Traitement des attributs textuels de l'application (Nouveaux champs d'édition)
    if (inputData.biography !== undefined)
      updatePayload.biography = inputData.biography;
    if (inputData.vision !== undefined) updatePayload.vision = inputData.vision;
    if (inputData.religion !== undefined)
      updatePayload.religion = inputData.religion;

    // 4. Traitement des attributs standards et authentification
    if (inputData.email) updatePayload.email = inputData.email;
    if (inputData.birthday)
      updatePayload.birthday = new Date(inputData.birthday);
    if (inputData.gender) updatePayload.gender = inputData.gender;

    const incomingPin = inputData.pin || inputData.code || inputData.passCode;
    if (incomingPin) {
      const salt = await bcrypt.genSalt(SALT_ROUND);
      updatePayload.passCode = await bcrypt.hash(incomingPin, salt);
    }

    // 5. Gestion du champ 'passion' (Prisma attend une String, convertit si Array reçu du Front)
    if (inputData.passions) {
      let passionsArray = inputData.passions;
      if (typeof inputData.passions === "string") {
        try {
          passionsArray = JSON.parse(inputData.passions);
        } catch {
          passionsArray = [inputData.passions];
        }
      }
      // Séparation par virgule pour le stockage en String
      updatePayload.passion = Array.isArray(passionsArray)
        ? passionsArray.join(", ")
        : passionsArray;
    }

    // 6. Gestion de la taille (height) structurée dans le JSON 'preferences'
    if (inputData.height) {
      const heightCm = parseInt(inputData.height, 10);
      if (!isNaN(heightCm)) {
        const existingPreferences = user.preferences
          ? (user.preferences as Record<string, any>)
          : {};
        updatePayload.preferences = {
          ...existingPreferences,
          height: heightCm,
        };
      }
    }

    // Navigation flow onboarding & meta-données de modification
    if (inputData.nextStep) updatePayload.onboardingStep = inputData.nextStep;
    updatePayload.lastProfileUpdated = new Date();

    return await prisma.user.update({
      where: { id: userId },
      data: updatePayload,
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
