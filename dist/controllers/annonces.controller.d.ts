import type { Request, Response, NextFunction } from "express";
export declare const annoncesController: {
    /**
     * CRÉER UNE NOUVELLE ANNONCE
     * POST /annonces
     */
    create: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * METTRE À JOUR UNE ANNONCE EXISTANTE
     * PATCH /annonces/:id
     */
    update: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * RÉCUPÉRER UNE ANNONCE PAR SON ID
     * GET /annonces/:id
     */
    getById: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * LISTER LES ANNONCES AVEC FILTRES ET PAGINATION
     * GET /annonces
     */
    getMany: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * SUPPRIMER DÉFINITIVEMENT UNE ANNONCE
     * DELETE /annonces/:id
     */
    delete: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=annonces.controller.d.ts.map