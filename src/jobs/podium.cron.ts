import cron from 'node-cron';
import prisma from '../services/prisma.service';
import { PodiumService } from '../services/podium.service';
// import { io } from '../server'; 

let isRunning = false;

// CORRECTION : Syntaxe pour s'exécuter toutes les 5 minutes ('*/5 * * * *')
cron.schedule('*/5 * * * *', async () => {
  if (isRunning) {
    console.warn('[CRON] Cycle précédent non terminé, saut de l\'exécution pour éviter le chevauchement.');
    return;
  }

  isRunning = true;
  console.log('\n--- [CRON 5MIN] Déclenchement du Podium Engine ---');

  try {
    const maintenant = new Date();

    // 1. PURGE (Toujours en premier)
    const purgeResult = await prisma.podiumStar.updateMany({
      where: { timeDue: { lt: maintenant }, isActive: true },
      data: { isActive: false }
    });
    console.log(`[CRON] Rounds expirés clôturés : ${purgeResult.count}`);

    // 2. RÉCUPÉRATION DES PAYS
    const activeCountries = await prisma.country.findMany({ select: { name: true, code: true } });
    
    console.log('[CRON] Pays actifs récupérés :', activeCountries);
    
    // 3. GÉNÉRATION SÉQUENTIELLE
    for (const country of activeCountries) {
      // Correction : Utilisation du code pays (ex: "BJ")
      const countryCode = country.name || country.code;

      console.log(`[CRON] Traitement pour le pays : ${countryCode} (${country.name})`);

      // /!\ IMPORTANT : Dans PodiumService, assure-toi que futureTime est bien configuré à (+ 5 * 60 * 1000)
      await PodiumService.generateCountryRounds(countryCode, 'MALE');
      await PodiumService.generateCountryRounds(countryCode, 'FEMALE');

      // 4. SIGNAL TEMPS RÉEL
      const roomPays = `country_${countryCode}`;
      if (typeof io !== 'undefined') {
        io.to(roomPays).emit('podium:refresh');
      }
    }

    console.log('[CRON 5MIN] Fin du cycle.');
  } catch (error) {
    console.error('[CRON CRITICAL ERROR] :', error);
  } finally {
    isRunning = false;
  }
});