export declare abstract class IStorageService {
    /**
     * Upload un fichier et retourne son URL accessible
     * @param file - Le fichier fourni par Multer (Express.Multer.File)
     */
    abstract uploadFile(file: Express.Multer.File): Promise<string>;
    /**
     * Supprime un fichier à partir de son URL publique
     * @param fileUrl - L'URL complète du fichier
     */
    abstract deleteFile(fileUrl: string): Promise<void>;
}
//# sourceMappingURL=storage.interface.d.ts.map