import { coffretsService } from "../services/coffrets.service.js";

export const coffretsController = {
  /**
   * GET /api/v1/coffrets
   * Récupère la liste des coffrets disponibles.
   * Filtre dynamiquement par proximité (coordonnées GPS) ou par recherche textuelle (loupe).
   */
  getAvailableCoffrets: async (req, res) => {
    try {
      const { latitude, longitude, searchQuery, maxDistanceKm } = req.query;

      // Construction sécurisée des paramètres d'interrogation du service
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

  /**
   * GET /api/v1/coffrets/:id
   * Récupère les détails exhaustifs d'un coffret spécifique par son identifiant unique.
   */
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

  /**
   * POST /api/v1/coffrets/book
   * Initie la réservation et le paiement par wallet d'un coffret romantique.
   */
  bookCoffret: async (req, res) => {
    try {
      const userId = req.user.id; // Injecté par le middleware d'authentification JWT
      const { coffretId, startDate, quantity } = req.body;

      if (!coffretId || !startDate || !quantity) {
        return res.status(400).json({
          success: false,
          message: "Le coffret, la date de début et la quantité d'invités sont requis.",
        });
      }

      const result = await coffretsService.createReservation(
        userId,
        parseInt(coffretId),
        startDate,
        parseInt(quantity)
      );

      return res.status(201).json({
        success: true,
        message: "🎉 Votre Coffret est réservé ! Retrouvez tous les détails dans vos Réservations.",
        data: result,
      });
    } catch (error) {
      // Interceptage du code d'erreur spécifique au solde insuffisant du wallet
      if (error.message === "SOLDE_INSUFFISANT") {
        return res.status(402).json({
          success: false,
          code: "SOLDE_INSUFFISANT",
          message: "Solde insuffisant. Veuillez recharger votre portefeuille principal Nonsera pour continuer.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Erreur lors de la création de la réservation.",
        error: error.message,
      });
    }
  },

  /**
   * POST /api/v1/coffrets/cancel
   * Permet d'annuler une réservation et d'appliquer le remboursement automatique sous 72h (RG-05).
   */
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
        parseInt(reservationId)
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
};