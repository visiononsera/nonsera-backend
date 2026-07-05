import type { Request, Response } from "express";
export declare const companiesController: {
    /**
     * Créer une nouvelle entreprise
     */
    create: (req: Request, res: Response) => Promise<void>;
    /**
     * Mettre à jour une entreprise existante
     */
    update: (req: Request, res: Response) => Promise<void>;
    /**
     * Récupérer une entreprise par son ID
     */
    getById: (req: Request, res: Response) => Promise<void>;
    /**
     * Lister les entreprises avec filtres, recherche, tri et pagination
     */
    getMany: (req: Request, res: Response) => Promise<void>;
    /**
     * Récupérer les entreprises / annonces par proximité (Haversine)
     */
    getByProximity: (req: Request, res: Response) => Promise<void>;
    /**
     * Workflow d'approbation administrative
     */
    verify: (req: Request, res: Response) => Promise<void>;
    /**
     * Suppression logique
     */
    delete: (req: Request, res: Response) => Promise<void>;
};
//# sourceMappingURL=company.controller.d.ts.map