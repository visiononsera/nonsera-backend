import { PodiumService } from "../services/podium.service.js";
import { MatchService } from "../services/match.service.js";
import prisma from "../services/prisma.service.js";

export class PodiumController {
  /**
   * Force manuellement la régénération globale des podiums d'un pays
   * POST /api/podiums/admin/trigger-podiums
   */
  static async triggerRounds(req, res, next) {
    try {
      const { country } = req.body;
      if (!country) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Le paramètre country est obligatoire.",
          });
      }

      // Génération parallèle pour optimiser le temps de réponse HTTP
      await Promise.all([
        PodiumService.generateCountryRounds(country, "MALE"),
        PodiumService.generateCountryRounds(country, "FEMALE"),
      ]);

      return res.status(200).json({
        success: true,
        message: `Podiums mis à jour avec succès pour le pays : ${country}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupérer la Star active du podium pour le spectateur connecté
   * GET /api/podiums/current-star
   */
  static async getCurrentStarForSpectator(req, res, next) {
    try {
      const spectatorId = req.user?.id;
      if (!spectatorId) {
        return res
          .status(401)
          .json({ success: false, message: "Non authentifié." });
      }

      const liveData = await PodiumService.getLiveStarForUser(
        Number(spectatorId),
      );

      if (!liveData) {
        return res.status(200).json({
          success: true,
          star: null,
          message: "Aucune Star disponible sur votre podium actuel.",
        });
      }

      return res.status(200).json({
        success: true,
        roundId: liveData.roundId,
        timeDue: liveData.timeDue,
        spot: liveData.spot,
        star: liveData.star,
      });
    } catch (error) {
      console.error(
        "[PodiumController.getCurrentStarForSpectator] Error:",
        error,
      );
      next(error);
    }
  }

  /**
   * Étape 1 : Offrir une approche (Bouton Danielle)
   * POST /api/podiums/danielle/send-gift
   */
  static async sendDaniellePresent(req, res, next) {
    try {
      const senderId = req.user?.id || req.body.senderId;
      const { podiumStarId, presentId, annonceId } = req.body;

      if (!podiumStarId || !senderId) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Paramètres manquants (podiumStarId, senderId).",
          });
      }

      if (!presentId && !annonceId) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Spécifiez un présent simple (presentId) ou une annonce (annonceId).",
          });
      }

      const round = await prisma.podiumStar.findUnique({
        where: { id: Number(podiumStarId) },
        select: { userId: true, isActive: true },
      });

      if (!round || !round.isActive) {
        return res
          .status(410)
          .json({
            success: false,
            error: "Ce round de podium n'est plus actif ou a expiré.",
          });
      }

      const result = await MatchService.sendGiftProposal(
        Number(senderId),
        Number(round.userId),
        presentId ? Number(presentId) : null,
        annonceId ? Number(annonceId) : null,
      );

      return res.status(200).json({
        success: true,
        message: "Proposition transmise avec succès à la Star.",
        purchaseId: result.purchaseId,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Étape 2 : La Star accepte l'attention (Déclenche le remplacement immédiat en arrière-plan)
   * POST /api/podiums/danielle/accept-gift
   */
  static async acceptDaniellePresent(req, res, next) {
    try {
      const { podiumStarId, matchSenderId, presentId, annonceId } = req.body;

      if (!podiumStarId || !matchSenderId) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Paramètres manquants (podiumStarId, matchSenderId).",
          });
      }

      await PodiumService.acceptDaniellePresent({
        podiumStarId: Number(podiumStarId),
        matchSenderId: Number(matchSenderId),
        presentId: presentId ? Number(presentId) : null,
        annonceId: annonceId ? Number(annonceId) : null,
      });

      return res.status(200).json({
        success: true,
        message:
          "Attention acceptée. Match BOOST validé et passation instantanée effectuée.",
      });
    } catch (error) {
      next(error);
    }
  }
}
