import fs from "fs";
import path from "path";
import { IStorageService } from "./storage.interface.js";
import { APP_URL } from "../../config/env.js"; 

export class LocalStorageService extends IStorageService {
  async uploadFile(file) {

    if (!file.path) {
      throw new Error("Propriété 'path' manquante sur le fichier Multer.");
    }
    const normalizedPath = file.path.replace(/\\/g, "/");
    return `${APP_URL}/${normalizedPath}`;
  }

  async deleteFile(fileUrl) {
    try {
      if (!fileUrl) return;
    
      const relativePath = fileUrl.replace(`${APP_URL}/`, "");
      const absolutePath = path.resolve(relativePath);

      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (error) {
      console.error("Erreur suppression fichier local:", error);
    }
  }
}