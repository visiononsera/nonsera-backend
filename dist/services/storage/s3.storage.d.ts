import { IStorageService } from "./storage.interface.js";
export declare class S3StorageService extends IStorageService {
    private s3;
    constructor();
    /**
     * Upload un fichier sur AWS S3 et retourne son URL publique
     */
    uploadFile(file: Express.Multer.File): Promise<string>;
    /**
     * Supprime un fichier sur AWS S3 à partir de son URL
     */
    deleteFile(fileUrl: string | null | undefined): Promise<void>;
}
//# sourceMappingURL=s3.storage.d.ts.map