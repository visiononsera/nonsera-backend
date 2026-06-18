import type { Request, Response, NextFunction } from "express";
import prisma from "../services/prisma.service.js";

/**
 * Helper interne pour vérifier si un utilisateur détient une permission spécifique.
 * Les rôles ADMIN et IT renvoient systématiquement TRUE,  car tous les droits.
 */
export async function __hasPermission(userId: number, requiredPermissionCode: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permissions: true },
  });

  if (!user || user.isBanned) return false;

  // BYPASS TOTAL : L'ADMIN et l'IT ont tous les droits natifs
  if (user.role === "ADMIN" || user.role === "IT") return true;

  // Vérification de la présence du code de la permission chez l'AGENT ou l'USER
  return user.permissions.some((perm) => perm.code === requiredPermissionCode);
}

/**
 * Middleware d'autorisation basé sur les permissions du dictionnaire
 */
export const authorize = (requiredPermissionCode?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.user est injecté en amont par ton middleware d'authentification JWT
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
      }

      // Autorisation immédiate pour les rôles structurels absolus
      if (userRole === "ADMIN" || userRole === "IT") {
        return next();
      }

      // Si la route requiert une permission spécifique
      if (requiredPermissionCode) {
        const authorized = await __hasPermission(userId, requiredPermissionCode);
        if (!authorized) {
          return res.status(403).json({
            success: false,
            message: `Accès refusé. La permission [${requiredPermissionCode}] est requise pour cette action.`,
          });
        }
      }

      return next();
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };
};