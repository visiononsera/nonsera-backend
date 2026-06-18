import type { Request, Response, NextFunction } from "express";
import * as jwtUtils from "../utils/jwt.utils";

declare global {
  namespace Express {
    interface Request {
      tokenPayload?: any;
    }
  }
}

export const jwtMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message:
        "En-tête d'authentification manquant ou mal formé. Format attendu: Bearer <token>",
    });
  }

  const token = authHeader.split(" ")[1] as string;
  const decodedToken = jwtUtils.verifyToken(token);

  if (!decodedToken) {
    return res
      .status(401)
      .json({ success: false, msg: "Invalid or expired token" });
  }

  req.tokenPayload = decodedToken;
  next();
}
