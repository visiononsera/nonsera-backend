import { v2 as cloudinary } from "cloudinary";
import { IStorageService } from "./storage.interface.js";
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } from "../../config/env.js";
export class CloudinaryStorageService extends IStorageService {
    constructor() {
        super();
        if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !CLOUDINARY_CLOUD_NAME) {
            throw new Error("Les variables d'environnement Cloudinary ne sont pas définies.");
        }
        cloudinary.config({
            cloud_name: CLOUDINARY_CLOUD_NAME,
            api_key: CLOUDINARY_API_KEY,
            api_secret: CLOUDINARY_API_SECRET,
        });
    }
    /**
     * Upload un fichier sur Cloudinary et retourne son URL sécurisée
     */
    async uploadFile(file) {
        // Le fichier est stocké dans le buffer Multer
        if (!file.buffer) {
            throw new Error("Le buffer du fichier est manquant.");
        }
        // Retourne une Promise qui résout l'URL de l'upload
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream({ folder: "profiles" }, (error, result) => {
                if (error) {
                    console.error("Erreur d'upload Cloudinary :", error);
                    reject(error);
                }
                else {
                    resolve(result.secure_url);
                }
            });
            // Écrit le buffer dans le stream Cloudinary
            uploadStream.write(file.buffer);
            uploadStream.end();
        });
    }
    /**
     * Supprime un fichier sur Cloudinary à partir de son public_id
     * (public_id est extrait de l'URL sécurisée)
     */
    async deleteFile(fileUrl) {
        try {
            if (!fileUrl)
                return;
            // Extrait le public_id de l'URL sécurisée
            const parts = fileUrl.split("/");
            const fileName = parts[parts.length - 1] ?? "";
            const publicId = fileName.split(".")[0];
            // Ajoute le dossier "profiles" si nécessaire
            const publicIdWithFolder = `profiles/${publicId}`;
            // Supprime le fichier sur Cloudinary
            await cloudinary.uploader.destroy(publicIdWithFolder);
        }
        catch (error) {
            console.error("Erreur suppression fichier Cloudinary :", error);
            throw error;
        }
    }
}
//# sourceMappingURL=cloudinary.storage.js.map