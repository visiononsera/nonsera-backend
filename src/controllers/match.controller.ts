import type { Request, Response } from "express";
import { MatchService } from "../services/match.service";

export class MatchController {
  static async checkCoupleStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      if (!userId)
        return res.status(400).json({ error: "L'ID utilisateur est requis." });

      const currentMatch = await MatchService.getCurrentMatch(Number(userId));

      return res.status(200).json({
        success: true,
        inCouple: !!currentMatch,
        data: currentMatch,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
  /**
   * Étape 1 : Envoyer un cadeau direct (Hors Podium)
   * POST /matches/gifts/send
   */
  static async sendDirectGift(req: Request, res: Response) {
    try {
      const { senderId, receiverId, giftId } = req.body;

      if (!senderId || !receiverId || !giftId) {
        return res
          .status(400)
          .json({
            error: "Paramètres manquants (senderId, receiverId, giftId).",
          });
      }

      const result = await MatchService.sendDirectGift(
        Number(senderId),
        Number(receiverId),
        Number(giftId),
      );

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Étape 2 : Accepter un cadeau direct (Hors Podium)
   * POST /matches/gifts/accept
   */
  static async acceptDirectGift(req: Request, res: Response) {
    try {
      const { receiverId, senderId, giftId } = req.body;

      if (!receiverId || !senderId || !giftId) {
        return res
          .status(400)
          .json({
            error: "Paramètres manquants (receiverId, senderId, giftId).",
          });
      }

      const result = await MatchService.acceptDirectGift(
        Number(receiverId),
        Number(senderId),
        Number(giftId),
        "NORMAL",
      );

      return res.status(200).json({
        success: true,
        message:
          "Cadeau accepté avec succès. Le couple est créé et le salon privé est ouvert.",
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Étape 3 : Rompre un match (Unmatch)
   * POST /matches/break
   */
  static async breakMatch(req: Request, res: Response) {
    try {
      const { userId, partnerId } = req.body;

      if (!userId || !partnerId) {
        return res
          .status(400)
          .json({ error: "Paramètres manquants (userId, partnerId)." });
      }

      const result = await MatchService.breakMatch(
        Number(userId),
        Number(partnerId),
      );
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
