import { appwriteDb, appwriteConfig } from '../config/appwrite.config';
import logger from '../utils/logger';
export class AppwriteService {
    /**
     * Vérifie la connectivité avec le serveur Appwrite au démarrage
     */
    static async checkConnection() {
        try {
            logger.info(`[APPWRITE] Tentative de connexion à l'environnement : ${appwriteConfig.env}`);
            // Test simple en listant les collections pour valider l'API Key et le Database ID
            await appwriteDb.listCollections(appwriteConfig.databaseId);
            logger.info(`[APPWRITE] Connexion réussie à la base de données : ${appwriteConfig.databaseId}`);
            return true;
        }
        catch (error) {
            logger.error(`[APPWRITE-CRITICAL] Échec de connexion à Appwrite : ${error.message}`);
            return false;
        }
    }
}
//# sourceMappingURL=appwrite.service.js.map