import type { Request, Response } from "express";
export declare const usersController: {
    /**
     * Met à jour le profil étape par étape durant le parcours d'Onboarding ou en mode classique
     */
    updateOnboardingProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Récupère le profil complet de l'utilisateur connecté avec ses droits associés
     */
    getMyProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Désactive temporairement le compte de l'utilisateur (Option de mise en veille)
     */
    deactivateAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Suppression définitive du compte (Exigence de conformité Google Play Store)
     */
    deleteAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Assigne ou révoque des permissions à un USER ou un AGENT
     */
    assignPermissionsToUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Enregistre une nouvelle clé de permission dans le dictionnaire général du système
     */
    createSystemPermission: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Initialisation directe d'un compte AGENT, ADMIN ou IT par le personnel habilité
     */
    createStaffAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Action de l'administration sur une demande d'onboarding en attente (Validation, Rejet ou Bannissement)
     * Protégé par un middleware d'autorisation restreint aux rôles AGENT, ADMIN ou IT
     */
    reviewPendingAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Récupère la liste paginée des utilisateurs en attente de validation par un agent
     * Sécurisé : Accessible uniquement par le STAFF (AGENT, ADMIN, IT)
     */
    getPendingOnboardings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=users.controller.d.ts.map