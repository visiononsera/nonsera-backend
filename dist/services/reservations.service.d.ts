import { ReservationStatus } from "../generated/prisma";
export interface CreateReservationInput {
    userId: number;
    annonceId: number;
    startDate: Date;
    endDate?: Date | null;
    quantity?: number;
    receiverId?: number | null;
    isDelivery?: boolean;
    deliveryAddress?: string | null;
    deliveryPhone?: string | null;
    startLatitude?: number | null;
    startLongitude?: number | null;
    endLatitude?: number | null;
    endLongitude?: number | null;
    startAddressText?: string | null;
}
export declare const reservationsService: {
    /**
     * 1. CRÉATION D'UNE RÉSERVATION (Débit via le wallet)
     */
    create: (data: CreateReservationInput) => Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        status: import("../generated/prisma").$Enums.ReservationStatus;
        receiverId: number | null;
        quantity: number;
        totalPrice: import("@prisma/client-runtime-utils").Decimal | null;
        deliveryAddress: string | null;
        annonceId: number;
        reference: string;
        startDate: Date;
        endDate: Date | null;
        isDelivery: boolean;
        deliveryPhone: string | null;
        startLatitude: import("@prisma/client-runtime-utils").Decimal | null;
        startLongitude: import("@prisma/client-runtime-utils").Decimal | null;
        endLatitude: import("@prisma/client-runtime-utils").Decimal | null;
        endLongitude: import("@prisma/client-runtime-utils").Decimal | null;
        startAddressText: string | null;
        cancellationDeadline: Date | null;
        litigeReason: string | null;
        agentArbitrageNote: string | null;
    }>;
    /**
     * 1b. RÉCUPÉRATION DES RÉSERVATIONS D'UN UTILISATEUR
     * Récupère l'historique complet avec les détails de l'annonce et de l'entreprise
     */
    getByUser: (userId: number, options?: {
        status?: ReservationStatus;
        limit?: number;
        page?: number;
    }) => Promise<{
        success: boolean;
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: ({
            annonce: {
                company: {
                    name: string | null;
                    id: number;
                    country: string | null;
                    city: string | null;
                    category: import("../generated/prisma").$Enums.CompanyCategory;
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
            };
            receiver: {
                id: number;
                fullname: string;
                profilePhoto: string | null;
            } | null;
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            userId: number;
            status: import("../generated/prisma").$Enums.ReservationStatus;
            receiverId: number | null;
            quantity: number;
            totalPrice: import("@prisma/client-runtime-utils").Decimal | null;
            deliveryAddress: string | null;
            annonceId: number;
            reference: string;
            startDate: Date;
            endDate: Date | null;
            isDelivery: boolean;
            deliveryPhone: string | null;
            startLatitude: import("@prisma/client-runtime-utils").Decimal | null;
            startLongitude: import("@prisma/client-runtime-utils").Decimal | null;
            endLatitude: import("@prisma/client-runtime-utils").Decimal | null;
            endLongitude: import("@prisma/client-runtime-utils").Decimal | null;
            startAddressText: string | null;
            cancellationDeadline: Date | null;
            litigeReason: string | null;
            agentArbitrageNote: string | null;
        })[];
    }>;
    /**
     * 2. CONFIRMATION DE LA RÉSERVATION (Acceptation par le partenaire)
     * Règle d'encaissement intelligente selon le domaine d'activité.
     */
    confirm: (id: number) => Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        status: import("../generated/prisma").$Enums.ReservationStatus;
        receiverId: number | null;
        quantity: number;
        totalPrice: import("@prisma/client-runtime-utils").Decimal | null;
        deliveryAddress: string | null;
        annonceId: number;
        reference: string;
        startDate: Date;
        endDate: Date | null;
        isDelivery: boolean;
        deliveryPhone: string | null;
        startLatitude: import("@prisma/client-runtime-utils").Decimal | null;
        startLongitude: import("@prisma/client-runtime-utils").Decimal | null;
        endLatitude: import("@prisma/client-runtime-utils").Decimal | null;
        endLongitude: import("@prisma/client-runtime-utils").Decimal | null;
        startAddressText: string | null;
        cancellationDeadline: Date | null;
        litigeReason: string | null;
        agentArbitrageNote: string | null;
    }>;
    /**
     * 3. LANCER LE TRIP / COURSE (Spécifique au Transport)
     */
    startTrip: (id: number) => Promise<{
        success: boolean;
        message: string;
        reservation: {
            annonce: {
                company: {
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
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            userId: number;
            status: import("../generated/prisma").$Enums.ReservationStatus;
            receiverId: number | null;
            quantity: number;
            totalPrice: import("@prisma/client-runtime-utils").Decimal | null;
            deliveryAddress: string | null;
            annonceId: number;
            reference: string;
            startDate: Date;
            endDate: Date | null;
            isDelivery: boolean;
            deliveryPhone: string | null;
            startLatitude: import("@prisma/client-runtime-utils").Decimal | null;
            startLongitude: import("@prisma/client-runtime-utils").Decimal | null;
            endLatitude: import("@prisma/client-runtime-utils").Decimal | null;
            endLongitude: import("@prisma/client-runtime-utils").Decimal | null;
            startAddressText: string | null;
            cancellationDeadline: Date | null;
            litigeReason: string | null;
            agentArbitrageNote: string | null;
        };
    }>;
    /**
     * 4. PRESTATION TERMINÉE & LIQUIDATION DE LA BALANCE PARTENAIRE
     * Pour le Transport : Déclenché à la fin de la course.
     * Pour les autres typologies : Déclenché automatiquement à la confirmation.
     */
    completeOrProcess: (id: number) => Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        status: import("../generated/prisma").$Enums.ReservationStatus;
        receiverId: number | null;
        quantity: number;
        totalPrice: import("@prisma/client-runtime-utils").Decimal | null;
        deliveryAddress: string | null;
        annonceId: number;
        reference: string;
        startDate: Date;
        endDate: Date | null;
        isDelivery: boolean;
        deliveryPhone: string | null;
        startLatitude: import("@prisma/client-runtime-utils").Decimal | null;
        startLongitude: import("@prisma/client-runtime-utils").Decimal | null;
        endLatitude: import("@prisma/client-runtime-utils").Decimal | null;
        endLongitude: import("@prisma/client-runtime-utils").Decimal | null;
        startAddressText: string | null;
        cancellationDeadline: Date | null;
        litigeReason: string | null;
        agentArbitrageNote: string | null;
    }>;
    /**
     * 5. OUVERTURE D'UN LITIGE (Par l'utilisateur ou la compagnie)
     */
    openDispute: (id: number, openedBy: "USER" | "COMPANY", reason: string) => Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        status: import("../generated/prisma").$Enums.ReservationStatus;
        receiverId: number | null;
        quantity: number;
        totalPrice: import("@prisma/client-runtime-utils").Decimal | null;
        deliveryAddress: string | null;
        annonceId: number;
        reference: string;
        startDate: Date;
        endDate: Date | null;
        isDelivery: boolean;
        deliveryPhone: string | null;
        startLatitude: import("@prisma/client-runtime-utils").Decimal | null;
        startLongitude: import("@prisma/client-runtime-utils").Decimal | null;
        endLatitude: import("@prisma/client-runtime-utils").Decimal | null;
        endLongitude: import("@prisma/client-runtime-utils").Decimal | null;
        startAddressText: string | null;
        cancellationDeadline: Date | null;
        litigeReason: string | null;
        agentArbitrageNote: string | null;
    }>;
    /**
     * 6. RÉSOLUTION DU LITIGE (Arbitrage exclusif Admin)
     */
    resolveDispute: (id: number, decision: "REFUND_CLIENT" | "PAY_COMPANY", adminNotes: string) => Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        status: import("../generated/prisma").$Enums.ReservationStatus;
        receiverId: number | null;
        quantity: number;
        totalPrice: import("@prisma/client-runtime-utils").Decimal | null;
        deliveryAddress: string | null;
        annonceId: number;
        reference: string;
        startDate: Date;
        endDate: Date | null;
        isDelivery: boolean;
        deliveryPhone: string | null;
        startLatitude: import("@prisma/client-runtime-utils").Decimal | null;
        startLongitude: import("@prisma/client-runtime-utils").Decimal | null;
        endLatitude: import("@prisma/client-runtime-utils").Decimal | null;
        endLongitude: import("@prisma/client-runtime-utils").Decimal | null;
        startAddressText: string | null;
        cancellationDeadline: Date | null;
        litigeReason: string | null;
        agentArbitrageNote: string | null;
    } | undefined>;
    /**
     * 7. ANNULATION ET REMBOURSEMENT PAR SOUSTRACTION
     */
    cancel: (id: number, actor: "USER" | "COMPANY", reason?: string) => Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        status: import("../generated/prisma").$Enums.ReservationStatus;
        receiverId: number | null;
        quantity: number;
        totalPrice: import("@prisma/client-runtime-utils").Decimal | null;
        deliveryAddress: string | null;
        annonceId: number;
        reference: string;
        startDate: Date;
        endDate: Date | null;
        isDelivery: boolean;
        deliveryPhone: string | null;
        startLatitude: import("@prisma/client-runtime-utils").Decimal | null;
        startLongitude: import("@prisma/client-runtime-utils").Decimal | null;
        endLatitude: import("@prisma/client-runtime-utils").Decimal | null;
        endLongitude: import("@prisma/client-runtime-utils").Decimal | null;
        startAddressText: string | null;
        cancellationDeadline: Date | null;
        litigeReason: string | null;
        agentArbitrageNote: string | null;
    }>;
};
//# sourceMappingURL=reservations.service.d.ts.map