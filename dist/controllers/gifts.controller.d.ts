import type { Request, Response, NextFunction } from "express";
export declare const giftsController: {
    /**
     * Créer un nouveau cadeau dans le catalogue
     */
    create: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Récupérer tous les cadeaux disponibles (avec filtres optionnels)
     */
    getAllAvailable: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Récupérer un cadeau par son ID
     */
    getById: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Mettre à jour un cadeau existant
     */
    update: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Suppression logique d'un cadeau (Désactivation)
     */
    delete: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Définir le cadeau virtuel standard préféré de l'utilisateur connecté
     */
    setPreferredGift: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Définir une Annonce comme intention/souhait de cadeau principal
     */
    setGiftPurposeAnnonce: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Récupérer l'intégralité des cadeaux reçus (Virtuels ET Annonces d'entreprises)
     */
    getReceivedGifts: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=gifts.controller.d.ts.map