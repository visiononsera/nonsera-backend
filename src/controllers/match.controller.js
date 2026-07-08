import { MatchService } from "../services/match.service.js";

export class MatchController {
  
  /**
   * GET /matches/status/:userId
   * Vérifier l'état actuel du couple pour un utilisateur
   */
  static async checkCoupleStatus(req, res, next) {
    try {
      const userId = Number(req.params.userId);
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "L'ID utilisateur valide est requis." });
      }

      const currentMatch = await MatchService.getCurrentMatch(userId);

      return res.status(200).json({
        success: true,
        inCouple: !!currentMatch,
        data: currentMatch,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /matches/gifts/send
   * Étape 1 : Envoyer/Acheter un cadeau direct ou une approche annonce
   */
  static async sendDirectGift(req, res, next) {
    try {
      // Priorité à l'ID injecté par le middleware d'auth
      const senderId = req.user?.id || Number(req.body.senderId);
      const { receiverId, giftId, annonceId } = req.body;

      if (!senderId || !receiverId || isNaN(senderId) || isNaN(Number(receiverId))) {
        return res.status(400).json({ error: "L'expéditeur (senderId) et le destinataire (receiverId) valides sont requis." });
      }

      if (!giftId && !annonceId) {
        return res.status(400).json({ error: "Vous devez spécifier soit un cadeau simple (giftId), soit une annonce (annonceId)." });
      }

      const formattedGiftId = giftId ? Number(giftId) : null;
      const formattedAnnonceId = annonceId ? Number(annonceId) : null;

      const result = await MatchService.sendGiftProposal(
        Number(senderId),
        Number(receiverId),
        formattedGiftId,
        formattedAnnonceId
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /matches/gifts/accept
   * Étape 2 : Le destinataire accepte le cadeau / l'annonce
   */
  static async acceptDirectGift(req, res, next) {
    try {
      const receiverId = req.user?.id || Number(req.body.receiverId);
      const { senderId, giftId, annonceId, matchType } = req.body;

      if (!receiverId || !senderId || isNaN(receiverId) || isNaN(Number(senderId))) {
        return res.status(400).json({ error: "Paramètres d'utilisateurs (receiverId, senderId) manquants ou invalides." });
      }

      if (!giftId && !annonceId) {
        return res.status(400).json({ error: "Référence du cadeau (giftId) ou de l'annonce (annonceId) manquante pour l'acceptation." });
      }

      const formattedGiftId = giftId ? Number(giftId) : null;
      const formattedAnnonceId = annonceId ? Number(annonceId) : null;

      const result = await MatchService.acceptDirectGift(
        Number(receiverId),
        Number(senderId),
        formattedGiftId,
        formattedAnnonceId,
        matchType || "NORMAL"
      );

      return res.status(200).json({
        success: true,
        message: "Cadeau accepté avec succès. Le couple est officiel et le salon privé est ouvert.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /matches/break
   * Étape 3 : Rompre un match
   */
  static async breakMatch(req, res, next) {
    try {
      const userId = req.user?.id || Number(req.body.userId);
      const { partnerId } = req.body;

      if (!userId || !partnerId || isNaN(userId) || isNaN(Number(partnerId))) {
        return res.status(400).json({ error: "Paramètres manquants ou invalides (userId, partnerId)." });
      }

      const result = await MatchService.breakMatch(
        Number(userId),
        Number(partnerId)
      );
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}