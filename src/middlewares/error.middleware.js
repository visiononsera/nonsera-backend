import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(err.message || err);
  
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 404 ? "Cette route n'existe pas" : "Une erreur interne est survenue sur le serveur"
  });
};