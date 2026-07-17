import prisma from "../services/prisma.service.js";
import { EnveloppeService } from "../services/enveloppe.service.js";

export class EnveloppeController {
  /**
   * GET /api/envelopes/eligibility
   */
  static async getEligibility(req, res, next) {
    try {
      const userId = Number(req.user.id); // Conversion explicite en entier[cite: 1]
      const userCountry = req.user.country || "BJ";

      const eligibility = await EnveloppeService.getUserEligibility(userId, userCountry);

      return res.status(200).json({
        success: true,
        ...eligibility
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/envelopes/heartbeat
   */
  static async sendHeartbeat(req, res, next) {
    try {
      const userId = Number(req.user.id); 
      const userCountry = req.user.country || "BJ";

      await EnveloppeService.recordHeartbeat(userId, userCountry);

      return res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/envelopes/spin
   */
  static async spin(req, res, next) {
    try {
      const userId = Number(req.user.id); 
      const userCountry = req.user.country || "BJ";
      
      // Extraction de l'instance io attachée à votre serveur Express
      const io = req.app.get("io"); 

      const result = await EnveloppeService.spinWheel(userId, userCountry, io);

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/envelopes/recent-winners
   */
  static async getRecentWinners(req, res, next) {
    try {
      const userCountry = req.user.country || "BJ";

      const winners = await prisma.envelopeWinner.findMany({
        take: 30,
        where: {
          user: { country: userCountry }
        },
        orderBy: { drawnAt: "desc" }, 
        include: {
          user: {
            select: { username: true } 
          }
        }
      });

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