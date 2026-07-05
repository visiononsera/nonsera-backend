import type { Request, Response } from "express";
export declare const reservationsController: {
    /**
     * Créer une réservation
     */
    create: (req: Request, res: Response) => Promise<void>;
    /**
     * Confirmer une réservation
     */
    confirm: (req: Request, res: Response) => Promise<void>;
    /**
     * Lancer une course | Début de prestation
     */
    startTrip: (req: Request, res: Response) => Promise<void>;
    /**
     * Finaliser la prestation
     */
    completeOrProcess: (req: Request, res: Response) => Promise<void>;
    /**
     * Ouvrir un litige
     */
    openDispute: (req: Request, res: Response) => Promise<void>;
    /**
     * Résolution de litige
     */
    resolveDispute: (req: Request, res: Response) => Promise<void>;
    /**
     * Annuler une réservation
     */
    cancel: (req: Request, res: Response) => Promise<void>;
};
//# sourceMappingURL=reservation.controller.d.ts.map