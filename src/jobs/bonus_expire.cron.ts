import cron from "node-cron";

import { walletService } from "../services/wallet.service";

// Planification de la tâche : S'exécute toutes les 5 minutes
cron.schedule("0 0 * * *", async () => {
  console.log(
    `[CRON] [${new Date().toISOString()}] Démarrage de la purge des bonus expirés...`,
  );
  try {
    await walletService.expireOldBonus();
    console.log(
      `[CRON] [${new Date().toISOString()}] Purge des bonus terminée avec succès.`,
    );
  } catch (error: any) {
    console.error(
      `[CRON] [${new Date().toISOString()}] Échec lors de la purge des bonus :`,
      error.message,
    );
  }
});
