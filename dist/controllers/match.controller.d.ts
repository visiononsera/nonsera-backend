import type { Request, Response, NextFunction } from "express";
export declare class MatchController {
    /**
     * GET /matches/status/:userId
     * Vérifier l'état actuel du couple pour un utilisateur
     */
    static checkCoupleStatus(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * POST /matches/gifts/send
     * Étape 1 : Envoyer/Acheter un cadeau direct ou une approche annonce (Hors Podium)
     */
    static sendDirectGift(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * POST /matches/gifts/accept
     * Étape 2 : Le destinataire accepte le cadeau / l'annonce (Match actif & ChatRoom)
     */
    static acceptDirectGift(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * POST /matches/break
     * Étape 3 : Rompre un match (Unmatch)
     */
    static breakMatch(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=match.controller.d.ts.map