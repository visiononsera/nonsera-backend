import cron from 'node-cron';
import logger from '../utils/logger.js';
// Importer le futur contrôleur ou service contenant ta logique métier
// import { calculateAndUpdateStars } from "../controllers/podium.controllers.js";

// Planification automatique : S'exécute chaque jour à 12:00 GMT
cron.schedule("0 12 * * *", () => {
  logger.info("Déclenchement automatique de la tâche Cron : Mise à jour des étoiles.");
  try {
    // calculateAndUpdateStars();
    console.log("star cron tous les jours à 00h00")
  } catch (error) {
    logger.error("Erreur durant l'exécution de la tâche d'arrière-plan des étoiles :", error);
  }
});