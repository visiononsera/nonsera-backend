import type { Request, Response } from "express";
interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        [key: string]: any;
    };
}
export declare const walletController: {
    /**
     * GET /api/wallet/summary
     */
    getSummary: (req: AuthenticatedRequest, res: Response) => Promise<Response>;
    /**
     * GET /api/wallet/history
     */
    getHistory: (req: AuthenticatedRequest, res: Response) => Promise<Response>;
    /**
     * POST /api/wallet/debit
     */
    debit: (req: AuthenticatedRequest, res: Response) => Promise<Response>;
    /**
     * POST /api/wallet/lumiere-transfer
     */
    transferLumiere: (req: AuthenticatedRequest, res: Response) => Promise<Response>;
    /**
     * POST /api/wallet/refund
     * Gestion des remboursements (généralement restreint au support/admin)
     */
    refundWallet: (req: AuthenticatedRequest, res: Response) => Promise<Response>;
    /**
     * POST /api/wallet/bonus/lock
     * Gel de sécurité sur un bonus disponible
     */
    lockBonus: (req: AuthenticatedRequest, res: Response) => Promise<Response>;
    /**
     * POST /api/wallet/bonus/unlock
     * Déblocage d'un bonus gelé
     */
    unlockBonus: (req: AuthenticatedRequest, res: Response) => Promise<Response>;
    /**
     * POST /api/wallet/bonus/trigger-expiration
     * Déclenchement de la purge des bonus obsolètes
     */
    expireOldBonus: (req: Request, res: Response) => Promise<Response>;
    /**
     * POST /api/wallet/webhook/kkiapay (PROD)
     */
    handleKkiapayWebhook: (req: Request, res: Response) => Promise<Response>;
    /**
     * POST /api/wallet/test-sandbox-recharge (BAC À SABLE SIMULATION)
     */
    simulateTestRecharge: (req: AuthenticatedRequest, res: Response) => Promise<Response>;
};
export {};
//# sourceMappingURL=wallet.controller.d.ts.map