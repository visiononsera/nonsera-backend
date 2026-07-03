import { STORAGE_PROVIDER } from "../../config/env";
import { IStorageService } from "./storage.interface";
import { LocalStorageService } from "./local.storage";
import { S3StorageService } from "./s3.storage";

class StorageFactory {
  // Typage via l'interface commune pour accepter n'importe quel provider implémenté
  private service: IStorageService | null = null;

  /**
   * Instancie et retourne le provider de stockage configuré
   */
  getProvider(): IStorageService {
    if (this.service) return this.service;

    switch (STORAGE_PROVIDER?.toUpperCase()) {
      case "S3":
        this.service = new S3StorageService();
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

// Exportation de l'instance du service typé prêt à l'emploi
export const storageService: IStorageService =
  new StorageFactory().getProvider();
