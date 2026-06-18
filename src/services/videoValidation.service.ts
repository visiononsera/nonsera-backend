import prisma from "./prisma.service.js";

export const videoValidationService = {
  /**
   * Initialise ou réinitialise une session d'appel vidéo (Backend-Driven)
   * Appelé automatiquement à la fin de l'onboarding ou lors d'un ping de relance
   */
  async initializeSession(userId: number, forceRefresh = false): Promise<any> {
    const now = new Date();

    if (!forceRefresh) {
      // Vérification si une session valide existe déjà pour éviter les doublons inutiles
      const existing = await prisma.videoSession.findUnique({ where: { userId } });
      if (existing && existing.status === "AWAITING") {
        return existing;
      }
    }

    // Identifiant unique de la room (ex: utilisé par Stream)
    const streamRoomId = `room_user_${userId}_${Math.floor(1000 + Math.random() * 9000)}`;
    
    // NOTE : C'est ici que tu intègres ton twilioService ou streamService pour générer les tokens si nécessaire
    // const token = streamService.createToken(userId);

    // Sécurisation de la file d'attente : upsert garantit l'unicité par utilisateur
    const session = await prisma.videoSession.upsert({
      where: { userId },
      update: {
        status: "AWAITING",
        roomId: streamRoomId,
        agentId: null, // On libère l'appel si un agent l'avait bloqué
        updatedAt: now
      },
      create: {
        userId,
        status: "AWAITING",
        roomId: streamRoomId
      }
    });

    // On s'assure que l'utilisateur est marqué dans la bonne étape d'onboarding
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingStep: "AWAITING_VIDEO_CALL" }
    });

    return session;
  },

  /**
   * Traite le ping de présence du client (Relance après 5 minutes)
   */
  async handleClientPing(userId: number): Promise<{ success: boolean; message: string; roomId?: string }> {
    const now = new Date();
    const session = await prisma.videoSession.findUnique({ where: { userId } });

    if (!session) {
      return { success: false, message: "Aucune session active trouvée. Veuillez soumettre votre profil." };
    }

    const diffInMinutes = (now.getTime() - session.updatedAt.getTime()) / (1000 * 60);

    // Anti-spam : Refuser si le client clique avant les 5 minutes réglementaires
    if (session.status === "AWAITING" && diffInMinutes < 5) {
      const remaining = Math.ceil(5 - diffInMinutes);
      return { 
        success: false, 
        message: `Votre demande est déjà prioritaire. Prochaine relance possible dans ${remaining} min.` 
      };
    }

    // Si la session est en cours ('IN_CALL') mais bloquée (ex: l'agent a fermé son onglet sans valider),
    // le ping du client après 5 minutes libère le ticket pour les autres agents.
    await prisma.videoSession.update({
      where: { userId },
      data: {
        status: "AWAITING",
        agentId: null, // Libération du verrou agent
        updatedAt: now // Remet le timestamp à jour pour la file d'attente
      }
    });

    return { success: true, message: "Présence confirmée. File d'attente actualisée.", roomId: session.roomId };
  }
};