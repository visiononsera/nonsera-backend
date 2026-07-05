import prisma from "./prisma.service";
import { CompanyCategory, Role } from "../generated/prisma";
import { storageService } from "./storage/storage.factory";
export const companiesService = {
    // 1. CRÉATION D'UNE ENTREPRISE PARTENAIRE
    create: async (companyData, files) => {
        const { phoneNumber, username, email, category, country, city, description, mapAddress, numeroSocial, latitude, longitude, isSurplaceAvailable, } = companyData;
        // Unicité du numéro de téléphone
        const existingPhone = await prisma.company.findUnique({
            where: { phoneNumber },
        });
        if (existingPhone) {
            throw new Error("Une entreprise avec ce numéro de téléphone existe déjà.");
        }
        // Unicité du username (Nom d'entreprise)
        if (username) {
            const existingUsername = await prisma.company.findUnique({
                where: { username },
            });
            if (existingUsername) {
                throw new Error("Ce nom d'entreprise est déjà enregistré.");
            }
        }
        let logoUrl = null;
        let bannerUrl = null;
        if (files) {
            if (files.logo && files.logo[0]) {
                logoUrl = await storageService.uploadFile(files.logo[0]);
            }
            if (files.banner && files.banner[0]) {
                bannerUrl = await storageService.uploadFile(files.banner[0]);
            }
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
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                logo: logoUrl,
                bannerPicture: bannerUrl,
                isSurplaceAvailable: isSurplaceAvailable ?? true,
                balance: 0.0, // Aligné avec le champ 'balance' du schéma Prisma actuel
                isVerified: false, // Non validée par défaut à la création
            },
        });
    },
    // 2. MODIFICATION DES DONNÉES DE L'ENTREPRISE
    update: async (id, updateData, files) => {
        const companyId = parseInt(id);
        const existingCompany = await prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!existingCompany)
            throw new Error("Entreprise introuvable.");
        if (updateData.phoneNumber) {
            const phoneCheck = await prisma.company.findFirst({
                where: { phoneNumber: updateData.phoneNumber, NOT: { id: companyId } },
            });
            if (phoneCheck) {
                throw new Error("Ce numéro de téléphone est déjà utilisé par une autre entreprise.");
            }
        }
        if (updateData.username) {
            const usernameCheck = await prisma.company.findFirst({
                where: { username: updateData.username, NOT: { id: companyId } },
            });
            if (usernameCheck) {
                throw new Error("Ce nom d'entreprise est déjà utilisé.");
            }
        }
        if (files) {
            // Gestion du Logo
            if (files.logo && files.logo[0]) {
                // Upload nouvelle image
                updateData.logo = await storageService.uploadFile(files.logo[0]);
                // Supprimer l'ancienne image si elle existe
                if (existingCompany.logo) {
                    storageService.deleteFile(existingCompany.logo).catch(console.error);
                }
            }
            // Gestion de la Bannière
            if (files.banner && files.banner[0]) {
                updateData.bannerPicture = await storageService.uploadFile(files.banner[0]);
                if (existingCompany.bannerPicture) {
                    storageService
                        .deleteFile(existingCompany.bannerPicture)
                        .catch(console.error);
                }
            }
        }
        // Conversion des coordonnées si présentes
        if (updateData.latitude)
            updateData.latitude = parseFloat(updateData.latitude);
        if (updateData.longitude)
            updateData.longitude = parseFloat(updateData.longitude);
        return await prisma.company.update({
            where: { id: companyId },
            data: updateData,
        });
    },
    // 3. AFFICHAGE INDIVIDUEL COMPLEMENTAIRE
    getById: async (id) => {
        const company = await prisma.company.findFirst({
            where: { id: parseInt(id), deletedAt: null },
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
        if (!company) {
            throw new Error("Entreprise introuvable ou supprimée.");
        }
        return company;
    },
    // 4. FILTRE, RECHERCHE MULTI-CRITÈRES, LISTING ET TRI DYNAMIQUE
    getMany: async (filters = {}, pagination = { limit: 8, page: 0 }, sorting = { sortBy: "createdAt", sortOrder: "desc" }) => {
        const limit = parseInt(pagination.limit) || 8;
        const page = parseInt(pagination.page) || 0;
        const { category, city, country, search, isVerified } = filters;
        const { sortBy, sortOrder } = sorting;
        // Construction de la clause de filtrage dynamique
        const whereClause = {
            deletedAt: null, // Exclure les entreprises soft-deleted
            ...(category && { category }),
            ...(city && { city: { contains: city, mode: "insensitive" } }),
            ...(country && { country: { equals: country, mode: "insensitive" } }),
            ...(isVerified !== undefined && { isVerified }),
            ...(search && {
                OR: [
                    { username: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phoneNumber: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } },
                ],
            }),
        };
        // Construction dynamique du tri
        const orderByClause = {};
        if (sortBy === "name") {
            orderByClause["username"] = sortOrder || "asc";
        }
        else if (sortBy === "balance") {
            orderByClause["balance"] = sortOrder || "desc";
        }
        else {
            orderByClause["createdAt"] = sortOrder || "desc";
        }
        const totalRows = await prisma.company.count({ where: whereClause });
        const result = await prisma.company.findMany({
            where: whereClause,
            skip: limit * page,
            take: limit,
            orderBy: orderByClause,
            include: {
                _count: {
                    select: { annonces: { where: { isAvailable: true } } },
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
    // 5. RECHERCHE PAR GÉOLOCALISATIONS LA PLUS PROCHE (Formule de Haversine intégrée)
    getAnnoncesByProximity: async (params) => {
        const { latitude, longitude, category, maxDistanceKm } = params;
        const companies = await prisma.company.findMany({
            where: {
                deletedAt: null,
                isVerified: true,
                ...(category && { category }),
                annonces: {
                    some: { isAvailable: true },
                },
            },
            include: {
                annonces: {
                    where: { isAvailable: true },
                },
            },
        });
        // Application de la formule de Haversine en mémoire
        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // Rayon de la Terre en kilomètres
            const dLat = ((lat2 - lat1) * Math.PI) / 180;
            const dLon = ((lon2 - lon1) * Math.PI) / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((lat1 * Math.PI) / 180) *
                    Math.cos((lat2 * Math.PI) / 180) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };
        const sortedCompanies = companies
            .map((company) => {
            const distance = calculateDistance(latitude, longitude, company.latitude ? Number(company.latitude) : 0, company.longitude ? Number(company.longitude) : 0);
            return { ...company, distanceInKm: parseFloat(distance.toFixed(2)) };
        })
            .filter((company) => maxDistanceKm ? company.distanceInKm <= maxDistanceKm : true);
        // Tri par ordre croissant de proximité (du plus proche au plus lointain)
        return sortedCompanies.sort((a, b) => a.distanceInKm - b.distanceInKm);
    },
    // 6. WORKFLOW DE VALIDATION / APPROBATION PAR LES ADMINS ET AGENTS
    verify: async (executorId, companyId, approved) => {
        // Récupération de l'utilisateur qui exécute l'action avec ses permissions
        const executor = await prisma.user.findUnique({
            where: { id: executorId },
            select: {
                role: true,
                permissions: {
                    where: { code: "VALIDATE_COMPANY" },
                    select: { code: true },
                },
            },
        });
        if (!executor) {
            throw new Error("Utilisateur exécuteur introuvable.");
        }
        const isSuperUser = executor.role === Role.ADMIN || executor.role === Role.IT;
        const isAgent = executor.role === Role.AGENT;
        if (isAgent) {
            // Si c'est un agent, il doit obligatoirement posséder la permission appropriée
            const hasPermission = executor.permissions.length > 0;
            if (!hasPermission) {
                throw new Error("Accès refusé : Cet agent ne possède pas la permission requise.");
            }
        }
        else if (!isSuperUser) {
            throw new Error("Accès refusé : Droits insuffisants pour valider une entreprise.");
        }
        return await prisma.company.update({
            where: { id: companyId },
            data: { isVerified: approved },
        });
    },
    // 7. SUPPRESSION LOGIQUE DE LA COMPAGNIE (Soft Delete)
    delete: async (id) => {
        return await prisma.company.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() },
        });
    },
};
//# sourceMappingURL=companies.service.js.map