import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.message || err);
  
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 404 ? "Cette route n'existe pas" : "Une erreur interne est survenue sur le serveur"
  });
};