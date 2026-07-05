import fs from "fs";
import path from "path";
import { IStorageService } from "./storage.interface";
import { APP_URL } from "../../config/env";
export class LocalStorageService extends IStorageService {
    async uploadFile(file) {
        // Avec Multer diskStorage, le fichier possède une propriété file.path
        if (!file.path) {
            throw new Error("Propriété 'path' manquante sur le fichier Multer.");
        }
        const normalizedPath = file.path.replace(/\\/g, "/"); // Fix pour Windows
        return `${APP_URL}/${normalizedPath}`;
    }
    async deleteFile(fileUrl) {
        try {
            if (!fileUrl)
                return;
            // Extraire le chemin relatif depuis l'URL publique
            const relativePath = fileUrl.replace(`${APP_URL}/`, "");
            const absolutePath = path.resolve(relativePath);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }
        catch (error) {
            console.error("Erreur suppression fichier local:", error);
        }
    }
}
//# sourceMappingURL=local.storage.js.map