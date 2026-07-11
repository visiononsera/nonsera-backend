import prisma from "../services/prisma.service.js";
import { EnveloppeService } from "../services/enveloppe.service.js";

export class EnveloppeController {
  /**
   * Récupère l'état d'éligibilité de l'utilisateur pour les 3 types de roues
   * Sert à afficher le cadenas, la roue débloquée ou la barre de progression
   * GET /api/Enveloppes/eligibility
   */
  static async getEligibility(req, res, next) {
    try {
      const userId = req.user.id; // Injecté par ton middleware d'authentification
      const userCountry = req.user.country || "BJ"; // Fallback par défaut

      const eligibility = await EnveloppeService.getUserEligibility(userId, userCountry);

      return res.status(200).json({
        success: true,
        eligibility
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupère l'historique des derniers gagnants (tous pays confondus ou filtré)
   * Affiche le texte dynamique global : "username + montant + date"
   * GET /api/Enveloppes/recent-winners
   */
  static async getRecentWinners(req, res, next) {
    try {
      const { limit } = req.query;

      const winners = await prisma.envelopeWinner.findMany({
        take: limit ? Number(limit) : 10,
        orderBy: { drawnAt: "desc" },
        include: {
          user: {
            select: {
              username: true,
            }
          }
        }
      });

      // Formatage propre pour l'affichage dynamique sur le Front
      const formattedWinners = winners.map(w => ({
        id: w.id,
        username: w.user.username,
        amountWon: w.amountWon,
        drawnAt: w.drawnAt,
        city: w.city
      }));

      return res.status(200).json({
        success: true,
        winners: formattedWinners
      });
    } catch (error) {
      next(error);
    }
  }
}