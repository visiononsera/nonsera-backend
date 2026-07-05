import { IStorageService } from "./storage.interface";
export declare class LocalStorageService extends IStorageService {
    uploadFile(file: Express.Multer.File): Promise<string>;
    deleteFile(fileUrl: string): Promise<void>;
}
//# sourceMappingURL=local.storage.d.ts.map