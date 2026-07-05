import type { Request, Response, NextFunction } from 'express';
export declare class PodiumController {
    /**
     * Force manuellement le rechargement/génération des podiums d'un pays
     * POST /podiums/trigger
     */
    static triggerRounds(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Récupérer la Star active du podium pour le spectateur connecté
     * GET /podiums/current-star
     */
    static getCurrentStarForSpectator(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Étape 1 : Le spectateur clique sur le bouton Danielle et offre une approche (Present ou Annonce)
     * POST /podiums/danielle/send-present
     */
    static sendDaniellePresent(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Étape 2 : La Star clique sur "Accepter l'attention"
     * POST /podiums/danielle/accept-present
     */
    static acceptDaniellePresent(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=podium.controller.d.ts.map