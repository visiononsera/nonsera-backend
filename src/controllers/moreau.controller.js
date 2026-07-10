import { MoreauService } from '../services/moreau.service.js';

export class MoreauController {
  /**
   * Récupérer l'état complet et dynamique du bouton P. MOREAU
   * GET /api/moreau/button-state
   */
  static async getButtonState(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
      }

      // Récupération de l'état calculé (Single ou Couple) depuis le MoreauService
      const state = await MoreauService.getButtonState(Number(userId));

      return res.status(200).json({
        success: true,
        data: state
      });
    } catch (error) {
      console.error(`[MoreauController.getButtonState] Error:`, error);
      next(error);
    }
  }
}