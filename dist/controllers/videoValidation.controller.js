import prisma from "../services/prisma.service.js";
import { videoValidationService } from "../services/videoValidation.service.js";
export const videoValidationController = {
    /**
     * ENDPOINT CLIENT : Permet de relancer l'attente (Ping des 5 minutes)
     */
    pingStatus: async (req, res) => {
        try {
            const userId = req.user.id;
            const result = await videoValidationService.handleClientPing(userId);
            if (!result.success) {
                return res.status(400).json({ success: false, message: result.message });
            }
            return res.status(200).json({ success: true, message: result.message, data: { roomId: result.roomId } });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },
    /**
     * ENDPOINT AGENT : Récupère le prochain dossier disponible et l'assigne à l'agent connecté
     */
    fetchNextAwaitingUser: async (req, res) => {
        try {
            const agentId = req.user.id;
            // TRANSACTION ATOMIQUE : Résout le problème de concurrence de N agents simultanés
            const callAssignment = await prisma.$transaction(async (tx) => {
                const nextCall = await tx.videoSession.findFirst({
                    where: { status: "AWAITING" },
                    orderBy: { updatedAt: "asc" } // Priorité aux plus anciens ou relancés récemment
                });
                if (!nextCall)
                    return null;
                // Verrouillage immédiat de la session pour cet agent
                return await tx.videoSession.update({
                    where: { id: nextCall.id },
                    data: {
                        status: "IN_CALL",
                        agentId: agentId
                    },
                    // Injection automatique des informations de l'utilisateur pour les vérifications de l'agent
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullname: true,
                                username: true,
                                phoneNumber: true,
                                role: true,
                                onboardingStep: true
                                // Ajoute ici tes relations si tu as des tables de documents d'identité ou d'entreprises
                            }
                        }
                    }
                });
            });
            if (!callAssignment) {
                return res.status(200).json({ success: true, message: "Aucun utilisateur en attente de validation." });
            }
            return res.status(200).json({
                success: true,
                message: "Session vidéo et dossier utilisateur assignés.",
                data: {
                    sessionId: callAssignment.id,
                    roomId: callAssignment.roomId,
                    clientProfile: callAssignment.user // L'agent reçoit tout sur son dashboard
                }
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },
    /**
     * ENDPOINT AGENT : Clôture l'appel et applique la sanction ou la validation finale
     */
    handleAgentDecision: async (req, res) => {
        try {
            const { sessionId, decision } = req.body; // 'VALIDATED' | 'REJECTED' | 'BANNED'
            if (!sessionId || !decision) {
                return res.status(400).json({ success: false, message: "Le sessionId et la décision sont requis." });
            }
            const session = await prisma.videoSession.findUnique({ where: { id: parseInt(sessionId) } });
            if (!session) {
                return res.status(404).json({ success: false, message: "Session de validation introuvable." });
            }
            const clientId = session.userId;
            await prisma.$transaction(async (tx) => {
                if (decision === "VALIDATED") {
                    await tx.user.update({
                        where: { id: clientId },
                        data: { isCompleted: true, onboardingStep: "COMPLETED" }
                    });
                }
                else if (decision === "REJECTED") {
                    await tx.user.update({
                        where: { id: clientId },
                        data: { isCompleted: false, onboardingStep: "GENERAL_INFO" } // Renvoi au début pour correction
                    });
                }
                else if (decision === "BANNED") {
                    await tx.user.update({
                        where: { id: clientId },
                        data: { isBanned: true }
                    });
                }
                // Fin du cycle de vie de la session : suppression de la file active
                await tx.videoSession.delete({ where: { id: session.id } });
            });
            return res.status(200).json({
                success: true,
                message: `Traitement terminé. Action [${decision}] appliquée avec succès.`
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
};
//# sourceMappingURL=videoValidation.controller.js.map