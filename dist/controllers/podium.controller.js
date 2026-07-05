import { PodiumService } from '../services/podium.service';
import { MatchService } from '../services/match.service';
import prisma from '../services/prisma.service';
export class PodiumController {
    /**
     * Force manuellement le rechargement/génération des podiums d'un pays
     * POST /podiums/trigger
     */
    static async triggerRounds(req, res, next) {
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
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Récupérer la Star active du podium pour le spectateur connecté
     * GET /podiums/current-star
     */
    static async getCurrentStarForSpectator(req, res, next) {
        try {
            const spectatorId = req.user?.id;
            if (!spectatorId) {
                return res.status(401).json({ success: false, message: "Non authentifié." });
            }
            const liveData = await PodiumService.getLiveStarForUser(Number(spectatorId));
            if (!liveData) {
                return res.status(200).json({
                    success: true,
                    star: null,
                    message: "Aucune Star disponible sur votre podium actuel."
                });
            }
            console.log("Star pour le profile connecté : ", liveData);
            return res.status(200).json({
                success: true,
                roundId: liveData.roundId,
                timeDue: liveData.timeDue,
                spot: liveData.spot,
                star: liveData.star
            });
        }
        catch (error) {
            console.error("[PodiumController.getCurrentStarForSpectator] Error:", error);
            next(error);
        }
    }
    /**
     * Étape 1 : Le spectateur clique sur le bouton Danielle et offre une approche (Present ou Annonce)
     * POST /podiums/danielle/send-present
     */
    static async sendDaniellePresent(req, res, next) {
        try {
            const senderId = req.user?.id || req.body.senderId;
            const { podiumStarId, presentId, annonceId } = req.body;
            if (!podiumStarId || !senderId) {
                return res.status(400).json({ error: 'Paramètres manquants (podiumStarId, senderId).' });
            }
            if (!presentId && !annonceId) {
                return res.status(400).json({ error: "Vous devez spécifier soit un présent simple (presentId), soit une annonce (annonceId)." });
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
            // 2. Utilisation de la méthode métier de MatchService (avec signature à plat)
            const result = await MatchService.sendGiftProposal(Number(senderId), Number(starId), presentId ? Number(presentId) : null, annonceId ? Number(annonceId) : null);
            return res.status(200).json({
                success: true,
                message: 'Proposition et attention envoyées avec succès à la Star. En attente de sa décision.',
                purchaseId: result.purchaseId
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Étape 2 : La Star clique sur "Accepter l'attention"
     * POST /podiums/danielle/accept-present
     */
    static async acceptDaniellePresent(req, res, next) {
        try {
            const { podiumStarId, matchSenderId, presentId, annonceId } = req.body;
            if (!podiumStarId || !matchSenderId) {
                return res.status(400).json({ error: 'Paramètres manquants (podiumStarId, matchSenderId).' });
            }
            if (!presentId && !annonceId) {
                return res.status(400).json({ error: "Référence du présent (presentId) ou de l'annonce (annonceId) manquante." });
            }
            // Exécute la mise en couple avec l'objet de paramètres attendu par PodiumService
            await PodiumService.acceptDaniellePresent({
                podiumStarId: Number(podiumStarId),
                matchSenderId: Number(matchSenderId),
                presentId: presentId ? Number(presentId) : null,
                annonceId: annonceId ? Number(annonceId) : null
            });
            return res.status(200).json({
                success: true,
                message: 'Attention acceptée. Match BOOST validé et passation du podium effectuée.'
            });
        }
        catch (error) {
            next(error);
        }
    }
}
//# sourceMappingURL=podium.controller.js.map