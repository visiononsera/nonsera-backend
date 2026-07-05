import { CompanyCategory } from "../generated/prisma";
export interface CompanyFilters {
    category?: CompanyCategory;
    city?: string;
    country?: string;
    search?: string;
    isVerified?: boolean;
}
export interface PaginationParams {
    limit?: string | number;
    page?: string | number;
}
export interface SortingParams {
    sortBy?: "name" | "createdAt" | "balance";
    sortOrder?: "asc" | "desc";
}
export interface ProximityParams {
    latitude: number;
    longitude: number;
    category?: CompanyCategory;
    maxDistanceKm?: number;
}
export declare const companiesService: {
    create: (companyData: any, files?: {
        logo?: Express.Multer.File[];
        banner?: Express.Multer.File[];
    }) => Promise<{
        name: string | null;
        id: number;
        phoneNumber: string;
        username: string | null;
        email: string | null;
        country: string | null;
        city: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        balance: import("@prisma/client-runtime-utils").Decimal;
        category: import("../generated/prisma").$Enums.CompanyCategory;
        logo: string | null;
        bannerPicture: string | null;
        description: string | null;
        mapAddress: string | null;
        numeroSocial: string | null;
        links: import("../generated/prisma/runtime/client").JsonValue | null;
        isVerified: boolean;
        isSurplaceAvailable: boolean;
        status: string | null;
    }>;
    update: (id: string, updateData: any, files?: {
        logo?: Express.Multer.File[];
        banner?: Express.Multer.File[];
    }) => Promise<{
        name: string | null;
        id: number;
        phoneNumber: string;
        username: string | null;
        email: string | null;
        country: string | null;
        city: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        balance: import("@prisma/client-runtime-utils").Decimal;
        category: import("../generated/prisma").$Enums.CompanyCategory;
        logo: string | null;
        bannerPicture: string | null;
        description: string | null;
        mapAddress: string | null;
        numeroSocial: string | null;
        links: import("../generated/prisma/runtime/client").JsonValue | null;
        isVerified: boolean;
        isSurplaceAvailable: boolean;
        status: string | null;
    }>;
    getById: (id: string) => Promise<{
        subscriptions: ({
            subscription: {
                name: string;
                id: number;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                price: import("@prisma/client-runtime-utils").Decimal;
                type: import("../generated/prisma").$Enums.SubscriptionType;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            companyId: number;
            subscriptionId: number;
        })[];
        annonces: {
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
        }[];
        gifts: {
            name: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            category: import("../generated/prisma").$Enums.GiftCategory;
            description: string | null;
            price: import("@prisma/client-runtime-utils").Decimal;
            points: import("@prisma/client-runtime-utils").Decimal;
            image: string;
            isAvailable: boolean;
            expiresIn: number;
            companyId: number | null;
        }[];
    } & {
        name: string | null;
        id: number;
        phoneNumber: string;
        username: string | null;
        email: string | null;
        country: string | null;
        city: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        balance: import("@prisma/client-runtime-utils").Decimal;
        category: import("../generated/prisma").$Enums.CompanyCategory;
        logo: string | null;
        bannerPicture: string | null;
        description: string | null;
        mapAddress: string | null;
        numeroSocial: string | null;
        links: import("../generated/prisma/runtime/client").JsonValue | null;
        isVerified: boolean;
        isSurplaceAvailable: boolean;
        status: string | null;
    }>;
    getMany: (filters?: CompanyFilters, pagination?: PaginationParams, sorting?: SortingParams) => Promise<{
        result: ({
            _count: {
                annonces: number;
            };
        } & {
            name: string | null;
            id: number;
            phoneNumber: string;
            username: string | null;
            email: string | null;
            country: string | null;
            city: string | null;
            latitude: import("@prisma/client-runtime-utils").Decimal | null;
            longitude: import("@prisma/client-runtime-utils").Decimal | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            balance: import("@prisma/client-runtime-utils").Decimal;
            category: import("../generated/prisma").$Enums.CompanyCategory;
            logo: string | null;
            bannerPicture: string | null;
            description: string | null;
            mapAddress: string | null;
            numeroSocial: string | null;
            links: import("../generated/prisma/runtime/client").JsonValue | null;
            isVerified: boolean;
            isSurplaceAvailable: boolean;
            status: string | null;
        })[];
        totalRows: number;
        totalPage: number;
        page: number;
        limit: number;
    }>;
    getAnnoncesByProximity: (params: ProximityParams) => Promise<{
        distanceInKm: number;
        annonces: {
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
        }[];
        name: string | null;
        id: number;
        phoneNumber: string;
        username: string | null;
        email: string | null;
        country: string | null;
        city: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        balance: import("@prisma/client-runtime-utils").Decimal;
        category: import("../generated/prisma").$Enums.CompanyCategory;
        logo: string | null;
        bannerPicture: string | null;
        description: string | null;
        mapAddress: string | null;
        numeroSocial: string | null;
        links: import("../generated/prisma/runtime/client").JsonValue | null;
        isVerified: boolean;
        isSurplaceAvailable: boolean;
        status: string | null;
    }[]>;
    verify: (executorId: number, companyId: number, approved: boolean) => Promise<{
        name: string | null;
        id: number;
        phoneNumber: string;
        username: string | null;
        email: string | null;
        country: string | null;
        city: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        balance: import("@prisma/client-runtime-utils").Decimal;
        category: import("../generated/prisma").$Enums.CompanyCategory;
        logo: string | null;
        bannerPicture: string | null;
        description: string | null;
        mapAddress: string | null;
        numeroSocial: string | null;
        links: import("../generated/prisma/runtime/client").JsonValue | null;
        isVerified: boolean;
        isSurplaceAvailable: boolean;
        status: string | null;
    }>;
    delete: (id: string) => Promise<{
        name: string | null;
        id: number;
        phoneNumber: string;
        username: string | null;
        email: string | null;
        country: string | null;
        city: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        balance: import("@prisma/client-runtime-utils").Decimal;
        category: import("../generated/prisma").$Enums.CompanyCategory;
        logo: string | null;
        bannerPicture: string | null;
        description: string | null;
        mapAddress: string | null;
        numeroSocial: string | null;
        links: import("../generated/prisma/runtime/client").JsonValue | null;
        isVerified: boolean;
        isSurplaceAvailable: boolean;
        status: string | null;
    }>;
};
//# sourceMappingURL=companies.service.d.ts.map