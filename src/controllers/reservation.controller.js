import { reservationsService } from "../services/reservations.service.js";
import { ReservationStatus } from "../generated/prisma/index.js";

export const reservationsController = {
  /**
   * Créer une réservation
   */
  create: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
        return;
      }

      const inputData = {
        ...req.body,
        userId: parseInt(userId),
      };

      const reservation = await reservationsService.create(inputData);
      res.status(201).json({
        success: true,
        message: "Réservation créée avec succès et fonds mis en séquestre.",
        data: reservation,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  /**
   * Confirmer une réservation
   */
  confirm: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedReservation = await reservationsService.confirm(parseInt(id));
      
      const message = updatedReservation.status === ReservationStatus.PROCESSED
        ? "Réservation confirmée et fonds reversés sur votre balance."
        : "Réservation confirmée. Les fonds seront débloqués à la fin de la course.";

      res.status(200).json({
        success: true,
        message,
        data: updatedReservation,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  /**
   * Lancer une course | Début de prestation
   */
  startTrip: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await reservationsService.startTrip(parseInt(id));
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  /**
   * Finaliser la prestation
   */
  completeOrProcess: async (req, res) => {
    try {
      const { id } = req.params;
      const processedReservation = await reservationsService.completeOrProcess(parseInt(id));
      res.status(200).json({
        success: true,
        message: "Prestation terminée avec succès. Fonds transférés sur la balance partenaire.",
        data: processedReservation,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  /**
   * Ouvrir un litige
   */
  openDispute: async (req, res) => {
    try {
      const { id } = req.params;
      const { actor, reason } = req.body; 

      if (!actor || !reason) {
        res.status(400).json({
          success: false,
          message: "L'auteur du litige et le motif sont obligatoires.",
        });
        return;
      }

      const disputeReservation = await reservationsService.openDispute(parseInt(id), actor, reason);
      res.status(200).json({
        success: true,
        message: "Litige enregistré. Les fonds sont gelés jusqu'à l'arbitrage d'un administrateur.",
        data: disputeReservation,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  /**
   * Résolution de litige
   */
  resolveDispute: async (req, res) => {
    try {
      const { id } = req.params;
      const { decision, adminNotes } = req.body; 

      if (!decision || !adminNotes) {
        res.status(400).json({
          success: false,
          message: "La décision (decision) et les notes d'arbitrage (adminNotes) sont obligatoires.",
        });
        return;
      }

      const resolvedReservation = await reservationsService.resolveDispute(
        parseInt(id),
        decision,
        adminNotes
      );

      res.status(200).json({
        success: true,
        message: "Le litige a été tranché et clôturé par l'administration.",
        data: resolvedReservation,
      });
    } catch (error) {
      res.status(403).json({ success: false, message: error.message });
    }
  },

  /**
   * Annuler une réservation
   */
  cancel: async (req, res) => {
    try {
      const { id } = req.params;
      const { actor, reason } = req.body;

      if (!actor) {
        res.status(400).json({ success: false, message: "Le profil de l'auteur de l'annulation (actor) est requis." });
        return;
      }

      const cancelledReservation = await reservationsService.cancel(parseInt(id), actor, reason);
      res.status(200).json({
        success: true,
        message: "La réservation a bien été annulée (Prise en compte des règles de remboursement).",
        data: cancelledReservation,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};