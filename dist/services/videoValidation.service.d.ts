export declare const videoValidationService: {
    /**
     * Initialise ou réinitialise une session d'appel vidéo (Backend-Driven)
     * Appelé automatiquement à la fin de l'onboarding ou lors d'un ping de relance
     */
    initializeSession(userId: number, forceRefresh?: boolean): Promise<any>;
    /**
     * Traite le ping de présence du client (Relance après 5 minutes)
     */
    handleClientPing(userId: number): Promise<{
        success: boolean;
        message: string;
        roomId?: string;
    }>;
};
//# sourceMappingURL=videoValidation.service.d.ts.map