import { giftsService } from "../services/gifts.service";
import { GiftCategory } from "../generated/prisma";
export const giftsController = {
    /**
     * Créer un nouveau cadeau dans le catalogue
     */
    create: async (req, res, next) => {
        try {
            const { name, price, points, image, description, category, companyId } = req.body;
            if (!name || !price || !image) {
                return res.status(400).json({ message: "Le nom, le prix et l'image sont requis." });
            }
            const createData = {
                name,
                price: Number(price),
                image,
                ...(description !== undefined && description !== null ? { description } : {}),
                ...(category !== undefined && category !== null ? { category: category } : {}),
                ...(points !== undefined && points !== null ? { points: Number(points) } : {}),
                ...(companyId !== undefined && companyId !== null ? { companyId: Number(companyId) } : {}),
            };
            const gift = await giftsService.create(createData);
            return res.status(201).json({ message: "Cadeau créé avec succès.", data: gift });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Récupérer tous les cadeaux disponibles (avec filtres optionnels)
     */
    getAllAvailable: async (req, res, next) => {
        try {
            const { category, companyId } = req.query;
            const filters = {
                ...(category && { category: category }),
                ...(companyId && { companyId: Number(companyId) }),
            };
            const gifts = await giftsService.getAllAvailable(filters);
            return res.status(200).json({ data: gifts });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Récupérer un cadeau par son ID
     */
    getById: async (req, res, next) => {
        try {
            const id = Number(req.params.id);
            const gift = await giftsService.getById(id);
            return res.status(200).json({ data: gift });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Mettre à jour un cadeau existant
     */
    update: async (req, res, next) => {
        try {
            const id = Number(req.params.id);
            const updatedGift = await giftsService.update(id, req.body);
            return res.status(200).json({ message: "Cadeau mis à jour avec succès.", data: updatedGift });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Suppression logique d'un cadeau (Désactivation)
     */
    delete: async (req, res, next) => {
        try {
            const id = Number(req.params.id);
            await giftsService.delete(id);
            return res.status(200).json({ message: "Cadeau retiré du catalogue avec succès." });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Définir le cadeau virtuel standard préféré de l'utilisateur connecté
     */
    setPreferredGift: async (req, res, next) => {
        try {
            const userId = req.user.id; // Supposant que le middleware d'auth injecte l'user
            const { giftId } = req.body;
            const user = await giftsService.setPreferredGift(userId, giftId ? Number(giftId) : null);
            return res.status(200).json({ message: "Cadeau préféré mis à jour.", data: user });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Définir une Annonce comme intention/souhait de cadeau principal
     */
    setGiftPurposeAnnonce: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { annonceId } = req.body;
            const user = await giftsService.setGiftPurposeAnnonce(userId, annonceId ? Number(annonceId) : null);
            return res.status(200).json({ message: "Objectif cadeau mis à jour.", data: user });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Récupérer l'intégralité des cadeaux reçus (Virtuels ET Annonces d'entreprises)
     */
    getReceivedGifts: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const history = await giftsService.getReceivedGifts(userId);
            return res.status(200).json({ data: history });
        }
        catch (error) {
            next(error);
        }
    }
};
//# sourceMappingURL=gifts.controller.js.map