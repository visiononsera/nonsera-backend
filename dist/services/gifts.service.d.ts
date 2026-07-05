import { GiftCategory } from "../generated/prisma";
export declare const giftsService: {
    /**
     * Créer un cadeau standard (Assigné ou non à une Company)
     */
    create: (data: {
        name: string;
        price: number;
        points?: number;
        image: string;
        description?: string;
        category?: GiftCategory;
        companyId?: number;
    }) => Promise<{
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
    }>;
    /**
     * Récupérer tous les cadeaux actifs/disponibles (Filtres optionnels)
     */
    getAllAvailable: (filters?: {
        category?: GiftCategory;
        companyId?: number;
    }) => Promise<({
        company: {
            name: string | null;
            logo: string | null;
        } | null;
    } & {
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
    })[]>;
    /**
     * Récupérer un cadeau spécifique par son ID
     */
    getById: (id: number) => Promise<{
        company: {
            name: string | null;
            logo: string | null;
        } | null;
    } & {
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
    }>;
    /**
     * Mettre à jour les informations d'un cadeau
     */
    update: (id: number, data: Partial<{
        name: string;
        price: number;
        points: number;
        image: string;
        description: string;
        category: GiftCategory;
        isAvailable: boolean;
    }>) => Promise<{
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
    }>;
    /**
     * Suppression logique d'un cadeau
     */
    delete: (id: number) => Promise<{
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
    }>;
    /**
     * Définir le cadeau standard préféré d'un utilisateur (Depuis la table gift)
     */
    setPreferredGift: (userId: number, giftId: number | null) => Promise<{
        id: number;
        fullname: string;
        preferredGiftId: number | null;
    }>;
    /**
     * Définir une Annonce d'entreprise comme souhait/intention de cadeau principal
     */
    setGiftPurposeAnnonce: (userId: number, annonceId: number | null) => Promise<{
        id: number;
        fullname: string;
        giftPurposeId: number | null;
    }>;
    /**
     * Récupérer exclusivement les annonces types cadeaux reçues par un utilisateur
     */
    getReceivedAnnonceGifts: (userId: number) => Promise<({
        annonce: ({
            company: {
                name: string | null;
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
        }) | null;
        sender: {
            id: number;
            fullname: string;
            profilePhoto: string | null;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        status: import("../generated/prisma").$Enums.PurchaseStatus;
        receiverId: number;
        giftId: number | null;
        quantity: number;
        totalPrice: import("@prisma/client-runtime-utils").Decimal;
        deliveryAddress: string | null;
        recipientFullName: string | null;
        annonceId: number | null;
        senderId: number;
    })[]>;
    /**
     * Récupérer l'intégralité des cadeaux reçus par un utilisateur (Polymorphisme complet)
     */
    getReceivedGifts: (userId: number) => Promise<({
        gift: {
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
        } | null;
        annonce: ({
            company: {
                name: string | null;
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
        }) | null;
        sender: {
            id: number;
            fullname: string;
            profilePhoto: string | null;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        status: import("../generated/prisma").$Enums.PurchaseStatus;
        receiverId: number;
        giftId: number | null;
        quantity: number;
        totalPrice: import("@prisma/client-runtime-utils").Decimal;
        deliveryAddress: string | null;
        recipientFullName: string | null;
        annonceId: number | null;
        senderId: number;
    })[]>;
};
//# sourceMappingURL=gifts.service.d.ts.map