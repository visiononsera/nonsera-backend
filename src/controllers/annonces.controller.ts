import type { Request, Response, NextFunction } from "express";
import { annoncesService, type AnnonceCreateInput } from "../services/annonces.service.js";

export const annoncesController = {
  /**
   * CRÉER UNE NOUVELLE ANNONCE
   * POST /annonces
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Multer a peuplé req.body et req.file
      const bodyData = req.body as AnnonceCreateInput;
      const file = req.file; 

      // Validation basique (à compléter selon vos besoins)
      if (!bodyData.name || !bodyData.price || !bodyData.companyId) {
        return res.status(400).json({ error: "Les champs nom, prix et ID d'entreprise sont requis." });
      }

      // Appel du service en passant les données et le fichier facultatif
      const annonce = await annoncesService.create(bodyData, file);

      return res.status(201).json({
        message: "Annonce créée avec succès.",
        data: annonce,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * METTRE À JOUR UNE ANNONCE EXISTANTE
   * PATCH /annonces/:id
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idParam = req.params.id;
      if (typeof idParam !== "string") {
        return res.status(400).json({ error: "ID d'annonce invalide." });
      }
      const id = parseInt(idParam, 10);
      const updateData = req.body;
      const file = req.file; // Récupération du fichier image facultatif

      if (isNaN(id)) {
        return res.status(400).json({ error: "ID d'annonce invalide." });
      }

      // Appel du service de mise à jour avec le fichier facultatif
      const updatedAnnonce = await annoncesService.update(id, updateData, file);

      return res.status(200).json({
        message: "Annonce mise à jour avec succès.",
        data: updatedAnnonce,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * RÉCUPÉRER UNE ANNONCE PAR SON ID
   * GET /annonces/:id
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idParam = req.params.id;
      if (typeof idParam !== "string") {
        return res.status(400).json({ error: "ID d'annonce invalide." });
      }
      const id = parseInt(idParam, 10);

      if (isNaN(id)) {
        return res.status(400).json({ error: "ID d'annonce invalide." });
      }

      const annonce = await annoncesService.getById(id);

      return res.status(200).json({ data: annonce });
    } catch (error) {
      next(error);
    }
  },

  /**
   * LISTER LES ANNONCES AVEC FILTRES ET PAGINATION
   * GET /annonces
   */
  getMany: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extraction et formatage des filtres depuis la query string
      const filters = {
        ...(req.query.companyId ? { companyId: parseInt(req.query.companyId as string, 10) } : {}),
        ...(req.query.category ? { category: req.query.category as string } : {}),
        ...(req.query.vehicleType ? { vehicleType: req.query.vehicleType as any } : {}), // Typage énum Prisma à valider
        ...(req.query.activityType ? { activityType: req.query.activityType as any } : {}),
        ...(req.query.isAvailable === 'true' ? { isAvailable: true } : req.query.isAvailable === 'false' ? { isAvailable: false } : {}),
        ...(req.query.isVerified === 'true' ? { isVerified: true } : req.query.isVerified === 'false' ? { isVerified: false } : {}),
        ...(req.query.search ? { search: req.query.search as string } : {}),
      };

      // Extraction et formatage de la pagination
      const pagination = {
        ...(req.query.limit ? { limit: parseInt(req.query.limit as string, 10) } : {}),
        ...(req.query.page ? { page: parseInt(req.query.page as string, 10) } : {}),
      };

      const result = await annoncesService.getMany(filters, pagination);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * SUPPRIMER DÉFINITIVEMENT UNE ANNONCE
   * DELETE /annonces/:id
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idParam = req.params.id;
      if (typeof idParam !== "string") {
        return res.status(400).json({ error: "ID d'annonce invalide." });
      }
      const id = parseInt(idParam, 10);

      if (isNaN(id)) {
        return res.status(400).json({ error: "ID d'annonce invalide." });
      }

      await annoncesService.delete(id);

      return res.status(200).json({ message: "Annonce supprimée avec succès (y compris son image)." });
    } catch (error) {
      next(error);
    }
  },
};