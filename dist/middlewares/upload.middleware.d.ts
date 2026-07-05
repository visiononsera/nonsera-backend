import multer from "multer";
/**
 * Définit les dossiers de destination pour le stockage local
 * et les sous-dossiers (folders) pour Cloudinary/S3.
 */
declare const mediaSubDirs: {
    readonly profile: "profiles";
    readonly company_logo: "companies/logos";
    readonly company_banner: "companies/banners";
    readonly annonce: "annonces";
    readonly gift: "gifts";
    readonly message: "messages";
};
export type MediaType = keyof typeof mediaSubDirs;
export declare const uploadProfilePhoto: multer.Multer;
export declare const uploadCompanyLogo: multer.Multer;
export declare const uploadCompanyBanner: multer.Multer;
export declare const uploadAnnoncePhoto: multer.Multer;
export declare const uploadChatMessage: multer.Multer;
export {};
//# sourceMappingURL=upload.middleware.d.ts.map