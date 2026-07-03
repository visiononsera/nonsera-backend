import type { Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { STORAGE_PROVIDER } from "../config/env.js";

let storage: multer.StorageEngine;

if (STORAGE_PROVIDER?.toUpperCase() === "S3") {
  // Pour S3, on garde le fichier en mémoire vive (buffer)
  storage = multer.memoryStorage();
} else {
  const uploadDir = "uploads/profiles";
  
  // Création du dossier sécurisée au démarrage du script
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req: any, file, cb) => {
      // Pour parer au problème de req.user indéfini à ce stade, 
      // on génère une clé hautement unique et on y attache l'ID s'il est dispo, sinon fallback propre
      const userId = req.user?.id || req.body?.userId || "profile";
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });
}

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    // Utiliser un callback propre plutôt que de lever une exception non gérée globalement
    cb(new Error("Le fichier doit être une image."));
  }
};

export const uploadProfilePhoto = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 5 * 1024 * 1024 // Limite stricte : 5 Mo
  },
});