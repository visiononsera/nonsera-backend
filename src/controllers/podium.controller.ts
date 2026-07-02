import type { Request, Response } from 'express';
import { PodiumService } from '../services/podium.service';

export class PodiumController {
  /**
   * Force manuellement le rechargement/génération des podiums d'un pays
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
   * Action déclenchée lorsque le Bouton Danielle est cliqué
   */
  static async actionDanielle(req: Request, res: Response) {
    try {
      const { podiumStarId, senderId } = req.body;

      if (!podiumStarId || !senderId) {
        return res.status(400).json({ error: 'Paramètres manquants.' });
      }

      await PodiumService.handleDanielleInterruption(Number(podiumStarId), Number(senderId));

      return res.status(200).json({ message: 'Interruption Danielle validée, redistribution en cours.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}