import multer from "multer";
import path from "path";
import fs from "fs";
import { STORAGE_PROVIDER } from "../config/env.js";
// ======================================================
// CONFIGURATION DES TYPES DE MÉDIAS
// ======================================================
/**
 * Définit les dossiers de destination pour le stockage local
 * et les sous-dossiers (folders) pour Cloudinary/S3.
 */
const mediaSubDirs = {
    profile: "profiles",
    company_logo: "companies/logos",
    company_banner: "companies/banners",
    annonce: "annonces",
    gift: "gifts",
    message: "messages", // Pour les images dans le chat
};
// ======================================================
// CONFIGURATION DU MOTEUR DE STOCKAGE (STORAGE ENGINE)
// ======================================================
/**
 * Configure le moteur de stockage en fonction du provider et du type de média.
 * @param mediaType - Le type de média pour déterminer le dossier de destination.
 */
const getStorageEngine = (mediaType) => {
    const isRemote = STORAGE_PROVIDER?.toUpperCase() === "S3" ||
        STORAGE_PROVIDER?.toUpperCase() === "CLOUDINARY";
    if (isRemote) {
        // Pour S3 et Cloudinary, on garde le fichier en mémoire vive (buffer).
        // Le dossier (folder) sera géré dans le service de stockage respectif.
        return multer.memoryStorage();
    }
    else {
        // Stockage LOCAL
        const subDir = mediaSubDirs[mediaType];
        const uploadDir = path.join("uploads", subDir);
        // Création récursive du dossier s'il n'existe pas
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        return multer.diskStorage({
            destination: (_req, _file, cb) => {
                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                // Identification du propriétaire (userId) ou nom par défaut du média
                const ownerId = req.user?.id || req.body?.userId || mediaType;
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                // Format du nom : propriétaire-suffixeUnique.extension
                cb(null, `${ownerId}-${uniqueSuffix}${path.extname(file.originalname)}`);
            },
        });
    }
};
// ======================================================
// CONFIGURATION DES FILTRES DE FICHIERS (FILE FILTERS)
// ======================================================
/**
 * Filtre stricte pour n'accepter que les images.
 */
const imageFilter = (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    }
    else {
        // Utiliser un callback d'erreur propre
        cb(new Error("Le fichier fourni n'est pas une image valide."));
    }
};
/**
 * Filtre plus large pour le chat (images et PDFs).
 */
const chatFilter = (_req, file, cb) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error("Format de fichier non supporté (Images et PDFs uniquement)."));
    }
};
/**
 * Génère un middleware Multer configuré dynamiquement.
 * @param mediaType - Le type de média (profile, annonce, etc.)
 * @param options - Options de personnalisation (taille, filtres)
 */
const createUploadMiddleware = (mediaType, options = {}) => {
    const { limitMb = 5, isChat = false } = options;
    return multer({
        storage: getStorageEngine(mediaType),
        // Choix du filtre : chat (images+pdf) ou standard (images seulement)
        fileFilter: isChat ? chatFilter : imageFilter,
        limits: {
            fileSize: limitMb * 1024 * 1024, // Conversion Mo en octets
        },
    });
};
// ======================================================
// EXPORTATION DES MIDDLEWARES SPÉCIFIQUES
// ======================================================
// 1. Photos de profil (Utilisateurs et Staff) : Images uniquement, 5 Mo max
export const uploadProfilePhoto = createUploadMiddleware("profile", {
    limitMb: 5,
});
// 2. Logos d'entreprise : Images uniquement, 2 Mo max (plus restrictif)
export const uploadCompanyLogo = createUploadMiddleware("company_logo", {
    limitMb: 2,
});
// 3. Bannières d'entreprise : Images uniquement, 8 Mo max (plus large pour la qualité)
export const uploadCompanyBanner = createUploadMiddleware("company_banner", {
    limitMb: 8,
});
// 4. Photos d'annonces (Annonces et Gifts) : Images uniquement, 10 Mo max
export const uploadAnnoncePhoto = createUploadMiddleware("annonce", {
    limitMb: 10,
});
// 5. Médias de Chat (Messages) : Images et PDFs, 15 Mo max
export const uploadChatMessage = createUploadMiddleware("message", {
    limitMb: 15,
    isChat: true,
});
//# sourceMappingURL=upload.middleware.js.map