import type { Request, Response } from "express";
export declare const videoValidationController: {
    /**
     * ENDPOINT CLIENT : Permet de relancer l'attente (Ping des 5 minutes)
     */
    pingStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * ENDPOINT AGENT : Récupère le prochain dossier disponible et l'assigne à l'agent connecté
     */
    fetchNextAwaitingUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * ENDPOINT AGENT : Clôture l'appel et applique la sanction ou la validation finale
     */
    handleAgentDecision: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=videoValidation.controller.d.ts.map