import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
export declare const s3Client: S3Client;
export declare const getPresignedUrlHelper: (bucket: string, key: string, expiresInSeconds?: number) => Promise<string>;
export { PutObjectCommand };
//# sourceMappingURL=s3Client.utils.d.ts.map