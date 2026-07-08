import prisma from "./prisma.service.js";

export const videoValidationService = {
  /**
   * Initialise ou réinitialise une session d'appel vidéo (Backend-Driven)
   * Appelé automatiquement à la fin de l'onboarding ou lors d'un ping de relance
   */
  async initializeSession(userId, forceRefresh = false) {
    const now = new Date();

    if (!forceRefresh) {
      const existing = await prisma.videoSession.findUnique({ where: { userId } });
      if (existing && existing.status === "AWAITING") {
        return existing;
      }
    }

    const streamRoomId = `room_user_${userId}_${Math.floor(1000 + Math.random() * 9000)}`;
    
    const session = await prisma.videoSession.upsert({
      where: { userId },
      update: {
        status: "AWAITING",
        roomId: streamRoomId,
        agentId: null, 
        updatedAt: now
      },
      create: {
        userId,
        status: "AWAITING",
        roomId: streamRoomId
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { onboardingStep: "AWAITING_VIDEO_CALL" }
    });

    return session;
  },

  /**
   * Traite le ping de présence du client (Relance après 5 minutes)
   */
  async handleClientPing(userId) {
    const now = new Date();
    const session = await prisma.videoSession.findUnique({ where: { userId } });

    if (!session) {
      return { success: false, message: "Aucune session active trouvée. Veuillez soumettre votre profil." };
    }

    const diffInMinutes = (now.getTime() - session.updatedAt.getTime()) / (1000 * 60);

    if (session.status === "AWAITING" && diffInMinutes < 5) {
      const remaining = Math.ceil(5 - diffInMinutes);
      return { 
        success: false, 
        message: `Votre demande est déjà prioritaire. Prochaine relance possible dans ${remaining} min.` 
      };
    }

    await prisma.videoSession.update({
      where: { userId },
      data: {
        status: "AWAITING",
        agentId: null, 
        updatedAt: now 
      }
    });

    return { success: true, message: "Présence confirmée. File d'attente actualisée.", roomId: session.roomId };
  }
};