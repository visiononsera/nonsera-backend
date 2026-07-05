import { companiesService } from "../services/companies.service";
import { CompanyCategory } from "../generated/prisma";
export const companiesController = {
    /**
     * Créer une nouvelle entreprise
     */
    create: async (req, res) => {
        try {
            const newCompany = await companiesService.create(req.body);
            res.status(201).json({
                success: true,
                message: "Entreprise créée avec succès.",
                data: newCompany,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },
    /**
     * Mettre à jour une entreprise existante
     */
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const updatedCompany = await companiesService.update(id, req.body);
            res.status(200).json({
                success: true,
                message: "Données de l'entreprise mises à jour.",
                data: updatedCompany,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },
    /**
     * Récupérer une entreprise par son ID
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const company = await companiesService.getById(id);
            res.status(200).json({ success: true, data: company });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    },
    /**
     * Lister les entreprises avec filtres, recherche, tri et pagination
     */
    getMany: async (req, res) => {
        try {
            const filters = {};
            if (req.query.category) {
                filters.category = req.query.category;
            }
            if (req.query.city) {
                filters.city = req.query.city;
            }
            if (req.query.country) {
                filters.country = req.query.country;
            }
            if (req.query.search) {
                filters.search = req.query.search;
            }
            if (req.query.isVerified !== undefined) {
                filters.isVerified = req.query.isVerified === "true";
            }
            // Extraction des paramètres de pagination
            const pagination = {
                limit: req.query.limit ? parseInt(req.query.limit) : 8,
                page: req.query.page ? parseInt(req.query.page) : 0,
            };
            // Extraction des paramètres de tri
            const sorting = {};
            if (req.query.sortBy) {
                sorting.sortBy = req.query.sortBy;
            }
            if (req.query.sortOrder) {
                sorting.sortOrder = req.query.sortOrder;
            }
            const companiesData = await companiesService.getMany(filters, pagination, sorting);
            res.status(200).json({ success: true, ...companiesData });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    /**
     * Récupérer les entreprises / annonces par proximité (Haversine)
     */
    getByProximity: async (req, res) => {
        try {
            const { latitude, longitude, category, maxDistanceKm } = req.query;
            if (!latitude || !longitude) {
                res.status(400).json({
                    success: false,
                    message: "Les coordonnées GPS (latitude et longitude) sont requises.",
                });
                return;
            }
            const proximityParams = {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                ...(category !== undefined ? { category: category } : {}),
                ...(maxDistanceKm !== undefined ? { maxDistanceKm: parseFloat(maxDistanceKm) } : {}),
            };
            const closeCompanies = await companiesService.getAnnoncesByProximity(proximityParams);
            res.status(200).json({ success: true, data: closeCompanies });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    /**
     * Workflow d'approbation administrative
     */
    verify: async (req, res) => {
        try {
            const { id } = req.params;
            const { approved } = req.body;
            // req.user doit être injecté en amont par ton middleware d'authentification (ex: isAuthenticated)
            const executorId = req.user?.id;
            if (!executorId) {
                res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
                return;
            }
            if (approved === undefined) {
                res.status(400).json({ success: false, message: "Le statut d'approbation (approved) est requis." });
                return;
            }
            const verifiedCompany = await companiesService.verify(parseInt(executorId), parseInt(id), approved === true || approved === "true");
            res.status(200).json({
                success: true,
                message: approved ? "Entreprise validée avec succès." : "Entreprise invalidée / suspendue.",
                data: verifiedCompany,
            });
        }
        catch (error) {
            res.status(403).json({ success: false, message: error.message });
        }
    },
    /**
     * Suppression logique
     */
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            await companiesService.delete(id);
            res.status(200).json({
                success: true,
                message: "L'entreprise a été supprimée avec succès (Soft-delete).",
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },
};
//# sourceMappingURL=company.controller.js.map