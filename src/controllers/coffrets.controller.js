import { coffretsService } from "../services/coffrets.service.js";

export const coffretsController = {
  // ==========================================
  // PANNEAU ADMINISTRATEUR (ADMIN)
  // ==========================================

  /**
   * PUT /api/v1/admin/coffrets/:id/verify
   * Valider ou bloquer un coffret administrativement (RG-01).
   */
  verifyCoffret: async (req, res) => {
    try {
      const { id } = req.params;
      const { isVerified } = req.body; // boolean

      const coffret = await coffretsService.verifyCoffret(
        parseInt(id),
        isVerified,
      );

      return res.status(200).json({
        success: true,
        message: isVerified
          ? "Le coffret a été validé et est désormais en ligne."
          : "Le coffret a été suspendu.",
        data: coffret,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la validation du coffret.",
        error: error.message,
      });
    }
  },

  // ==========================================
  // ESPACE PUBLIC & RÉSIDERVATION CLIENT
  // ==========================================

  getAvailableCoffrets: async (req, res) => {
    try {
      const { latitude, longitude, searchQuery, maxDistanceKm } = req.query;

      const params = {
        ...(latitude ? { latitude: parseFloat(latitude) } : {}),
        ...(longitude ? { longitude: parseFloat(longitude) } : {}),
        ...(searchQuery ? { searchQuery: String(searchQuery).trim() } : {}),
        ...(maxDistanceKm ? { maxDistanceKm: parseFloat(maxDistanceKm) } : {}),
      };

      const coffrets = await coffretsService.getAvailableCoffrets(params);

      return res.status(200).json({
        success: true,
        data: coffrets,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des coffrets.",
        error: error.message,
      });
    }
  },

  getCoffretById: async (req, res) => {
    try {
      const { id } = req.params;
      const coffret = await coffretsService.getCoffretById(id);

      if (!coffret) {
        return res.status(404).json({
          success: false,
          message: "Coffret introuvable ou indisponible.",
        });
      }

      return res.status(200).json({
        success: true,
        data: coffret,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération du détail du coffret.",
        error: error.message,
      });
    }
  },

  bookCoffret: async (req, res) => {
    try {
      const userId = req.user.id;
      const { coffretId, startDate, quantity } = req.body;

      if (!coffretId || !startDate || !quantity) {
        return res.status(400).json({
          success: false,
          message:
            "Le coffret, la date de début et le nombre de personnes sont requis.",
        });
      }

      const result = await coffretsService.createReservation(
        userId,
        parseInt(coffretId),
        startDate,
        parseInt(quantity),
      );

      return res.status(201).json({
        success: true,
        message:
          "🎉 Votre Coffret est réservé ! Retrouvez tous les détails dans vos Réservations.",
        data: result,
      });
    } catch (error) {
      if (error.message === "SOLDE_INSUFFISANT") {
        return res.status(402).json({
          success: false,
          code: "SOLDE_INSUFFISANT",
          message:
            "Solde insuffisant. Veuillez recharger votre portefeuille principal Nonsera pour continuer.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Erreur lors de la création de la réservation.",
        error: error.message,
      });
    }
  },

  cancelCoffretBooking: async (req, res) => {
    try {
      const userId = req.user.id;
      const { reservationId } = req.body;

      if (!reservationId) {
        return res.status(400).json({
          success: false,
          message: "L'identifiant de la réservation est requis.",
        });
      }

      const result = await coffretsService.cancelCoffretBooking(
        userId,
        parseInt(reservationId),
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          reservation: result.reservation,
          refundProcessed: result.refundProcessed,
          updatedCoins: result.updatedCoins,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Impossible de traiter l'annulation de la réservation.",
        error: error.message,
      });
    }
  },

  // ==========================================
  // ESPACE PARTENAIRES (CRUD ENTREPRISES)
  // ==========================================

  createCoffret: async (req, res) => {
    try {
      const companyId = req.company?.id || req.user?.companyId;
      const { items, ...coffretData } = req.body;

      if (!companyId) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Profil entreprise requis ou introuvable.",
          });
      }

      if (!coffretData.name || !coffretData.price || !coffretData.images) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Le nom, le prix et les images du coffret sont requis.",
          });
      }

      const newCoffret = await coffretsService.createCoffretByCompany(
        companyId,
        coffretData,
        items || [],
      );

      return res.status(201).json({
        success: true,
        message:
          "Coffret créé avec succès. Il sera visible dès sa validation administrative.",
        data: newCoffret,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la création du coffret.",
        error: error.message,
      });
    }
  },

  updateCoffret: async (req, res) => {
    try {
      const companyId = req.company?.id || req.user?.companyId;
      const { id } = req.params;
      const { items, ...updatedData } = req.body;

      if (!companyId) {
        return res
          .status(403)
          .json({ success: false, message: "Profil entreprise requis." });
      }

      const updatedCoffret = await coffretsService.updateCoffretByCompany(
        parseInt(id),
        companyId,
        updatedData,
        items,
      );

      return res.status(200).json({
        success: true,
        message:
          "Coffret mis à jour avec succès et envoyé en attente de re-validation.",
        data: updatedCoffret,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la mise à jour du coffret.",
        error: error.message,
      });
    }
  },

  deleteCoffret: async (req, res) => {
    try {
      const companyId = req.company?.id || req.user?.companyId;
      const { id } = req.params;

      if (!companyId) {
        return res
          .status(403)
          .json({ success: false, message: "Profil entreprise requis." });
      }

      await coffretsService.deleteCoffretByCompany(parseInt(id), companyId);

      return res.status(200).json({
        success: true,
        message:
          "Le coffret et ses éléments liés ont été supprimés avec succès.",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la suppression du coffret.",
        error: error.message,
      });
    }
  },

  getCompanyCatalog: async (req, res) => {
    try {
      const companyId = req.company?.id || req.user?.companyId;

      if (!companyId) {
        return res
          .status(403)
          .json({ success: false, message: "Profil entreprise requis." });
      }

      const catalog = await coffretsService.getCompanyCatalog(companyId);

      return res.status(200).json({
        success: true,
        data: catalog,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération de votre catalogue.",
        error: error.message,
      });
    }
  },
};
