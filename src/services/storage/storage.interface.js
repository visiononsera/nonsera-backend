export class IStorageService {
  /**
   * Upload un fichier et retourne son URL accessible
   * @param file - Le fichier fourni par Multer
   */
  async uploadFile(file) {
    throw new Error("La méthode 'uploadFile(file)' doit être implémentée.");
  }

  /**
   * Supprime un fichier à partir de son URL publique
   * @param fileUrl - L'URL complète du fichier
   */
  async deleteFile(fileUrl) {
    throw new Error("La méthode 'deleteFile(fileUrl)' doit être implémentée.");
  }
}