import prisma from "../services/prisma.service.js";

export const loadContext = async (req, res, next) => {
  if (!req.tokenPayload) {
    return res.status(500).json({ success: false, message: "Contexte JWT absent du flux de traitement." });
  }

  const { userId, type } = req.tokenPayload;

  try {
    if (type === "USER" || type === "STAFF") {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: {
          id: true, phoneNumber: true, username: true, role: true,
          isBanned: true, onboardingStep: true, isCertified: true
        }
      });

      if (!user) {
        return res.status(401).json({ success: false, message: `L'utilisateur associé à ce token n'existe plus.` });
      }

      if (user.isBanned) {
        return res.status(403).json({ success: false, message: "Ce compte a été suspendu." });
      }

      req.user = user;
      req.authContext = { type, entity: user };
    } 
    else if (type === "PARTNER") {
      const company = await prisma.company.findUnique({
        where: { id: parseInt(userId) },
        select: {
          id: true, phoneNumber: true, username: true, email: true, solde: true
        }
      });

      if (!company) {
        return res.status(401).json({ success: false, message: `L'entreprise associée à ce token n'existe plus.` });
      }

      req.company = company;
      req.authContext = { type: "PARTNER", entity: company };
    } else {
      return res.status(401).json({ success: false, message: "Type de contexte d'authentification inconnu." });
    }

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal Server Error" });
  }
};

export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.authContext || !req.authContext.entity) {
      return res.status(403).json({ success: false, message: "Accès refusé. Non authentifié." });
    }

    // Le rôle peut provenir de l'enum Prisma User.role (USER, ADMIN, AGENT) ou du type d'entité (PARTNER)
    const currentRole = req.authContext.entity.role || req.authContext.type;

    if (!allowedRoles.includes(currentRole)) {
      return res.status(403).json({ 
        success: false, 
        message: `Accès interdit. Rôles autorisés: [${allowedRoles.join(", ")}]. Votre rôle actuel: ${currentRole}` 
      });
    }
    next();
  };
};