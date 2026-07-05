import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { IStorageService } from "./storage.interface.js";
// Alignement avec les exacts exports de ton fichier env
import { S3_BUCKET_NAME, AWS_REGION } from "../../config/env.js";
export class S3StorageService extends IStorageService {
    s3;
    constructor() {
        super();
        if (!AWS_REGION) {
            throw new Error("AWS_REGION n'est pas définie dans la configuration de l'environnement.");
        }
        this.s3 = new S3Client({
            region: AWS_REGION, // Utilisation de AWS_REGION
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
            },
        });
    }
    /**
     * Upload un fichier sur AWS S3 et retourne son URL publique
     */
    async uploadFile(file) {
        if (!S3_BUCKET_NAME) {
            throw new Error("S3_BUCKET_NAME n'est pas définie dans la configuration de l'environnement.");
        }
        const fileKey = `profiles/${Date.now()}-${file.originalname}`;
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME, // Utilisation de S3_BUCKET_NAME
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        await this.s3.send(command);
        // Retourne l'URL publique S3 formatée proprement
        return `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileKey}`;
    }
    /**
     * Supprime un fichier sur AWS S3 à partir de son URL
     */
    async deleteFile(fileUrl) {
        try {
            if (!fileUrl || !S3_BUCKET_NAME)
                return;
            const prefix = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/`;
            const fileKey = fileUrl.replace(prefix, "");
            const command = new DeleteObjectCommand({
                Bucket: S3_BUCKET_NAME, // Utilisation de S3_BUCKET_NAME
                Key: fileKey,
            });
            await this.s3.send(command);
        }
        catch (error) {
            console.error("Erreur suppression fichier S3:", error);
            throw error;
        }
    }
}
//# sourceMappingURL=s3.storage.js.map