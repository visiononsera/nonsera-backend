import { giftsService } from "../services/gifts.service.js";

export const giftsController = {
  create: async (req, res, next) => {
    try {
      const { name, price, points, image, description, category, companyId } =
        req.body;

      if (!name || !price || !image) {
        return res
          .status(400)
          .json({ message: "Le nom, le prix et l'image sont requis." });
      }

      const createData = {
        name,
        price: Number(price),
        image,
        ...(description !== undefined && description !== null
          ? { description }
          : {}),
        ...(category !== undefined && category !== null ? { category } : {}),
        ...(points !== undefined && points !== null
          ? { points: Number(points) }
          : {}),
        ...(companyId !== undefined && companyId !== null
          ? { companyId: Number(companyId) }
          : {}),
      };

      const gift = await giftsService.create(createData);
      return res
        .status(201)
        .json({ message: "Cadeau créé avec succès.", data: gift });
    } catch (error) {
      next(error);
    }
  },

  getAllAvailable: async (req, res, next) => {
    try {
      const { category, companyId } = req.query;

      const filters = {
        ...(category && { category }),
        ...(companyId && { companyId: Number(companyId) }),
      };

      const gifts = await giftsService.getAllAvailable(filters);
      return res.status(200).json({ data: gifts });
    } catch (error) {
      next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const gift = await giftsService.getById(id);
      return res.status(200).json({ data: gift });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const updatedGift = await giftsService.update(id, req.body);
      return res
        .status(200)
        .json({ message: "Cadeau mis à jour avec succès.", data: updatedGift });
    } catch (error) {
      next(error);
    }
  },

  delete: async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      await giftsService.delete(id);
      return res
        .status(200)
        .json({ message: "Cadeau retiré du catalogue avec succès." });
    } catch (error) {
      next(error);
    }
  },

  setPreferredGift: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { giftId } = req.body;

      const user = await giftsService.setPreferredGift(
        userId,
        giftId ? Number(giftId) : null,
      );
      return res
        .status(200)
        .json({ message: "Cadeau préféré mis à jour.", data: user });
    } catch (error) {
      next(error);
    }
  },

  setGiftPurposeAnnonce: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { annonceId } = req.body;

      const user = await giftsService.setGiftPurposeAnnonce(
        userId,
        annonceId ? Number(annonceId) : null,
      );
      return res
        .status(200)
        .json({ message: "Objectif cadeau mis à jour.", data: user });
    } catch (error) {
      next(error);
    }
  },

  // ======================================================
  // GESTION DU CYCLE D'ACCEPTATION & LIVRAISON
  // ======================================================

  markAsOpened: async (req, res, next) => {
    try {
      const receiverId = req.user.id;
      const purchaseId = Number(req.params.id);

      const purchase = await giftsService.markAsOpened(purchaseId, receiverId);
      return res
        .status(200)
        .json({
          success: true,
          message: "Cadeau marqué comme consulté.",
          data: purchase,
        });
    } catch (error) {
      next(error);
    }
  },

  claimGift: async (req, res, next) => {
    try {
      const receiverId = req.user.id;
      const purchaseId = Number(req.params.id);
      const { firstName, lastName, address, city, country, instructions } =
        req.body;

      if (!firstName || !lastName || !address || !city || !country) {
        return res
          .status(400)
          .json({
            message: "Toutes les coordonnées de livraison sont obligatoires.",
          });
      }

      const purchase = await giftsService.claimGift(purchaseId, receiverId, {
        firstName,
        lastName,
        address,
        city,
        country,
        instructions,
      });

      return res.status(200).json({
        success: true,
        message:
          "Votre adresse a bien été transmise. Votre cadeau est en cours de traitement.",
        data: purchase,
      });
    } catch (error) {
      next(error);
    }
  },

  rejectGift: async (req, res, next) => {
    try {
      const receiverId = req.user.id;
      const purchaseId = Number(req.params.id);

      const purchase = await giftsService.rejectGift(purchaseId, receiverId);
      return res.status(200).json({
        success: true,
        message:
          "Ce cadeau a été refusé et l'expéditeur a été intégralement remboursé.",
        data: purchase,
      });
    } catch (error) {
      next(error);
    }
  },

  getReceivedGifts: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const history = await giftsService.getReceivedGifts(userId);
      return res.status(200).json({ data: history });
    } catch (error) {
      next(error);
    }
  },

  getSentGifts: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const history = await giftsService.getSentGifts(userId);
      return res.status(200).json({ data: history });
    } catch (error) {
      next(error);
    }
  },
};
