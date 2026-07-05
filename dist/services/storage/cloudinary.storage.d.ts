import { IStorageService } from "./storage.interface.js";
export declare class CloudinaryStorageService extends IStorageService {
    constructor();
    /**
     * Upload un fichier sur Cloudinary et retourne son URL sécurisée
     */
    uploadFile(file: Express.Multer.File): Promise<string>;
    /**
     * Supprime un fichier sur Cloudinary à partir de son public_id
     * (public_id est extrait de l'URL sécurisée)
     */
    deleteFile(fileUrl: string | null | undefined): Promise<void>;
}
//# sourceMappingURL=cloudinary.storage.d.ts.map