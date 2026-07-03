import type { Request, Response } from 'express';
import { PodiumService } from '../services/podium.service';
import { MatchService } from '../services/match.service';
import prisma from '../services/prisma.service';

export class PodiumController {
  /**
   * Force manuellement le rechargement/génération des podiums d'un pays
   * POST /podiums/trigger
   */
  static async triggerRounds(req: Request, res: Response) {
    try {
      const { country } = req.body;
      if (!country) {
        return res.status(400).json({ error: 'Le paramètre country est obligatoire.' });
      }

      // Génère les flux pour les Hommes et pour les Femmes en parallèle
      await Promise.all([
        PodiumService.generateCountryRounds(country, 'MALE'),
        PodiumService.generateCountryRounds(country, 'FEMALE')
      ]);

      return res.status(200).json({ message: `Podiums mis à jour avec succès pour le pays : ${country}` });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Récupérer la Star active du podium pour le spectateur connecté
   * GET /podiums/current-star
   */
  static async getCurrentStarForSpectator(req: Request, res: Response) {
    try {
      const spectatorId = req.user?.id; // Injecté par loadContext
      if (!spectatorId) {
        return res.status(401).json({ success: false, message: "Non authentifié." });
      }

      const liveData = await PodiumService.getLiveStarForUser(spectatorId);
      
      if (!liveData) {
        return res.status(200).json({ 
          success: true, 
          star: null, 
          message: "Aucune Star disponible sur votre podium actuel." 
        });
      }

      console.log("Star pour le profile connecté : ", liveData)

      return res.status(200).json({
        success: true,
        roundId: liveData.roundId,
        timeDue: liveData.timeDue,
        spot: liveData.spot,
        star: liveData.star
      });
    } catch (error: any) {
      console.error("[PodiumController.getCurrentStarForSpectator] Error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Étape 1 : Le spectateur clique sur le bouton Danielle et offre un cadeau
   * POST /podiums/danielle/send-gift
   */
  static async sendDanielleGift(req: Request, res: Response) {
    try {
      const { podiumStarId, senderId, giftId } = req.body;

      if (!podiumStarId || !senderId || !giftId) {
        return res.status(400).json({ error: 'Paramètres manquants (podiumStarId, senderId, giftId).' });
      }

      // 1. Récupérer la star du podium pour valider son ID
      const round = await prisma.podiumStar.findUnique({
        where: { id: Number(podiumStarId) },
        select: { userId: true, isActive: true }
      });

      if (!round || !round.isActive) {
        return res.status(410).json({ error: "Ce round de podium n'est plus actif ou a expiré." });
      }

      const starId = round.userId;

      // 2. Utiliser MatchService pour valider les statuts célibataires et notifier la Star
      // (Bénéficie de la validation et de l'émission socket de sendDirectGift)
      await MatchService.sendDirectGift(Number(senderId), starId, Number(giftId));

      return res.status(200).json({ 
        success: true, 
        message: 'Proposition et cadeau envoyés avec succès à la Star. En attente de sa décision.' 
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Étape 2 : La Star clique sur "Accepter le cadeau"
   * POST /podiums/danielle/accept-gift
   */
  static async acceptDanielleGift(req: Request, res: Response) {
    try {
      const { podiumStarId, matchSenderId, giftId } = req.body; // <--- Récupération essentielle du giftId ici

      if (!podiumStarId || !matchSenderId || !giftId) {
        return res.status(400).json({ error: 'Paramètres manquants (podiumStarId, matchSenderId, giftId).' });
      }

      // Exécute la mise en couple via MatchService + la passation automatique gérée par le service
      await PodiumService.acceptDanielleGift(
        Number(podiumStarId), 
        Number(matchSenderId), 
        Number(giftId)
      );

      return res.status(200).json({ 
        success: true, 
        message: 'Cadeau accepté. Match validé et passation du podium effectuée.' 
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}