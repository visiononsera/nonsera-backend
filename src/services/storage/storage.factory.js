import { STORAGE_PROVIDER } from "../../config/env.js";
import { LocalStorageService } from "./local.storage.js";
import { S3StorageService } from "./s3.storage.js";
import { CloudinaryStorageService } from "./cloudinary.storage.js";

class StorageFactory {
  constructor() {
    this.service = null;
  }

  /**
   * Instancie et retourne le provider de stockage configuré
   */
  getProvider() {
    if (this.service) return this.service;

    switch (STORAGE_PROVIDER?.toUpperCase()) {
      case "S3":
        this.service = new S3StorageService();
        break;
      case "CLOUDINARY":
        this.service = new CloudinaryStorageService();
        break;
      case "LOCAL":
      default:
        this.service = new LocalStorageService();
        break;
    }

    console.log(
      `[Storage] Utilisation du provider : ${STORAGE_PROVIDER || "LOCAL"}`,
    );
    return this.service;
  }
}

// Exportation de l'instance du service prêt à l'emploi
export const storageService = new StorageFactory().getProvider();