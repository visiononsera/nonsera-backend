import type { Request, Response, NextFunction } from "express";
/**
 * Helper interne pour vérifier si un utilisateur détient une permission spécifique.
 * Les rôles ADMIN et IT renvoient systématiquement TRUE,  car tous les droits.
 */
export declare function __hasPermission(userId: number, requiredPermissionCode: string): Promise<boolean>;
/**
 * Middleware d'autorisation basé sur les permissions du dictionnaire
 */
export declare const authorize: (requiredPermissionCode?: string) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=authorize.middleware.d.ts.map