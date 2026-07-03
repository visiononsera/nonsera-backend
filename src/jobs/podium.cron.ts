import cron from 'node-cron';
import prisma from '../services/prisma.service';
import { PodiumService } from '../services/podium.service';

// Planification de la tâche : S'exécute toutes les 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('[CRON] Déclenchement de la rotation automatique du Podium Engine...');

  try {
    // 1. NETTOYAGE DES SPECTATEURS DES ROUNDS EXPIRÉS
    const purgeResult = await prisma.podiumSpectator.deleteMany({
      where: { podiumStar: { timeDue: { lt: new Date() } } }
    });
    console.log(`[CRON] Purge effectuée : ${purgeResult.count} spectateurs archivés.`);

    // 2. Récupérer la liste de tous les pays opérationnels
    const activeCountries = await prisma.country.findMany({
      select: { code: true }
    });

    // 3. Génération parallèle par pays
    for (const country of activeCountries) {
      Promise.all([
        PodiumService.generateCountryRounds(country.code, 'MALE'),
        PodiumService.generateCountryRounds(country.code, 'FEMALE')
      ]).catch(err => {
        console.error(`[CRON ERROR] Échec lors du traitement pour le pays ${country.code}:`, err);
      });
    }

  } catch (error) {
    console.error('[CRON CRITICAL ERROR] Impossible de mener à bien la rotation :', error);
  }
});