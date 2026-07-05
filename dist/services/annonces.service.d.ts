import { AmbianceType, VehicleType, ActivityType } from "../generated/prisma";
export interface AnnonceCreateInput {
    name: string;
    price: number | string;
    points?: number;
    image: string;
    description?: string | null;
    category?: string | null;
    expiresIn?: number;
    companyId: number;
    ambiance?: AmbianceType | null;
    hasAnimation?: boolean;
    isDeliveryAvailable?: boolean;
    isRomantique?: boolean;
    equipements?: any;
    vehicleType?: VehicleType | null;
    nbPlaces?: number | null;
    activityType?: ActivityType | null;
}
export interface AnnonceFilters {
    companyId?: number;
    category?: string;
    vehicleType?: VehicleType;
    activityType?: ActivityType;
    isAvailable?: boolean;
    isVerified?: boolean;
    search?: string;
}
export declare const annoncesService: {
    /**
     * 1. CRÉATION D'UNE ANNONCE
     */
    create: (data: AnnonceCreateInput, file?: Express.Multer.File) => Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        category: string | null;
        description: string | null;
        isVerified: boolean;
        price: import("@prisma/client-runtime-utils").Decimal;
        points: import("@prisma/client-runtime-utils").Decimal;
        image: string;
        isAvailable: boolean;
        isSpecial: boolean;
        expiresIn: number;
        ambiance: import("../generated/prisma").$Enums.AmbianceType | null;
        hasAnimation: boolean;
        isDeliveryAvailable: boolean;
        isRomantique: boolean;
        equipements: import("../generated/prisma/runtime/client").JsonValue | null;
        vehicleType: import("../generated/prisma").$Enums.VehicleType | null;
        nbPlaces: number | null;
        activityType: import("../generated/prisma").$Enums.ActivityType | null;
        companyId: number | null;
    }>;
    /**
     * 2. MODIFICATION D'UNE ANNONCE
     */
    update: (id: number, updateData: Partial<AnnonceCreateInput> & {
        isAvailable?: boolean;
        isVerified?: boolean;
        isSpecial?: boolean;
    }, file?: Express.Multer.File) => Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        category: string | null;
        description: string | null;
        isVerified: boolean;
        price: import("@prisma/client-runtime-utils").Decimal;
        points: import("@prisma/client-runtime-utils").Decimal;
        image: string;
        isAvailable: boolean;
        isSpecial: boolean;
        expiresIn: number;
        ambiance: import("../generated/prisma").$Enums.AmbianceType | null;
        hasAnimation: boolean;
        isDeliveryAvailable: boolean;
        isRomantique: boolean;
        equipements: import("../generated/prisma/runtime/client").JsonValue | null;
        vehicleType: import("../generated/prisma").$Enums.VehicleType | null;
        nbPlaces: number | null;
        activityType: import("../generated/prisma").$Enums.ActivityType | null;
        companyId: number | null;
    }>;
    /**
     * 3. RÉCUPÉRATION INDIVIDUELLE D'UNE ANNONCE
     */
    getById: (id: number) => Promise<{
        company: {
            id: number;
            username: string | null;
            country: string | null;
            city: string | null;
            category: import("../generated/prisma").$Enums.CompanyCategory;
        } | null;
    } & {
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        category: string | null;
        description: string | null;
        isVerified: boolean;
        price: import("@prisma/client-runtime-utils").Decimal;
        points: import("@prisma/client-runtime-utils").Decimal;
        image: string;
        isAvailable: boolean;
        isSpecial: boolean;
        expiresIn: number;
        ambiance: import("../generated/prisma").$Enums.AmbianceType | null;
        hasAnimation: boolean;
        isDeliveryAvailable: boolean;
        isRomantique: boolean;
        equipements: import("../generated/prisma/runtime/client").JsonValue | null;
        vehicleType: import("../generated/prisma").$Enums.VehicleType | null;
        nbPlaces: number | null;
        activityType: import("../generated/prisma").$Enums.ActivityType | null;
        companyId: number | null;
    }>;
    /**
     * 4. RECHERCHE MULTI-CRITÈRES ET RECHERCHE PAR TEXTE (Listing complet)
     */
    getMany: (filters?: AnnonceFilters, pagination?: {
        limit?: number;
        page?: number;
    }) => Promise<{
        result: ({
            company: {
                username: string | null;
                logo: string | null;
            } | null;
        } & {
            name: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            category: string | null;
            description: string | null;
            isVerified: boolean;
            price: import("@prisma/client-runtime-utils").Decimal;
            points: import("@prisma/client-runtime-utils").Decimal;
            image: string;
            isAvailable: boolean;
            isSpecial: boolean;
            expiresIn: number;
            ambiance: import("../generated/prisma").$Enums.AmbianceType | null;
            hasAnimation: boolean;
            isDeliveryAvailable: boolean;
            isRomantique: boolean;
            equipements: import("../generated/prisma/runtime/client").JsonValue | null;
            vehicleType: import("../generated/prisma").$Enums.VehicleType | null;
            nbPlaces: number | null;
            activityType: import("../generated/prisma").$Enums.ActivityType | null;
            companyId: number | null;
        })[];
        totalRows: number;
        totalPage: number;
        page: number;
        limit: number;
    }>;
    /**
     * 5. SUPPRESSION DÉFINITIVE D'UNE ANNONCE
     */
    delete: (id: number) => Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        category: string | null;
        description: string | null;
        isVerified: boolean;
        price: import("@prisma/client-runtime-utils").Decimal;
        points: import("@prisma/client-runtime-utils").Decimal;
        image: string;
        isAvailable: boolean;
        isSpecial: boolean;
        expiresIn: number;
        ambiance: import("../generated/prisma").$Enums.AmbianceType | null;
        hasAnimation: boolean;
        isDeliveryAvailable: boolean;
        isRomantique: boolean;
        equipements: import("../generated/prisma/runtime/client").JsonValue | null;
        vehicleType: import("../generated/prisma").$Enums.VehicleType | null;
        nbPlaces: number | null;
        activityType: import("../generated/prisma").$Enums.ActivityType | null;
        companyId: number | null;
    }>;
};
//# sourceMappingURL=annonces.service.d.ts.map