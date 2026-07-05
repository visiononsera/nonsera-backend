export declare class MatchService {
    /**
     * RÉCUPÉRATION DU MATCH ACTIF
     */
    static getCurrentMatch(userId: number): Promise<{
        matchId: number;
        type: import("../generated/prisma").$Enums.MatchType;
        createdAt: Date;
        partner: {
            id: number;
            phoneNumber: string;
            passCode: string | null;
            fullname: string;
            username: string | null;
            email: string | null;
            profilePhoto: string | null;
            firstOtherPhoto: string | null;
            secondOtherPhoto: string | null;
            thirdOtherPhoto: string | null;
            birthday: Date | null;
            gender: import("../generated/prisma").$Enums.Gender | null;
            biography: string | null;
            vision: string | null;
            passion: string | null;
            religion: string | null;
            horoscope: string | null;
            languages: import("../generated/prisma/runtime/client").JsonValue | null;
            preferences: import("../generated/prisma/runtime/client").JsonValue | null;
            country: string | null;
            city: string | null;
            latitude: import("@prisma/client-runtime-utils").Decimal | null;
            longitude: import("@prisma/client-runtime-utils").Decimal | null;
            coins: import("@prisma/client-runtime-utils").Decimal;
            dmScore: import("@prisma/client-runtime-utils").Decimal;
            isCertified: boolean;
            isCompleted: boolean;
            isFakeAccount: boolean;
            isOnline: boolean;
            isBanned: boolean;
            isPhoneVerified: boolean;
            isIdentityVerified: boolean;
            isVideoEnabled: boolean;
            isLockEnabled: boolean;
            onboardingStep: string;
            deviceToken: string | null;
            lastProfileUpdated: Date | null;
            lastPhotoUpdated: Date | null;
            role: import("../generated/prisma").$Enums.Role;
            assignedAgentId: number | null;
            podiumOccurenceCount: number;
            preferredGiftId: number | null;
            giftPurposeId: number | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        };
        chatRoomId: number | null;
    } | null>;
    /**
     * Étape 1 : ENVOYER / ACHETER UN CADEAU (Virtuel ou Annonce)
     * Crée SYSTEMATIQUEMENT une ligne Purchase au statut PENDING
     */
    static sendGiftProposal(senderId: number, receiverId: number, giftId: number | null, annonceId: number | null): Promise<{
        success: boolean;
        purchaseId: number;
    }>;
    /**
     * Étape 2 : LE DESTINATAIRE ACCEPTE LE CADEAU / L'ANNONCE
     */
    static acceptDirectGift(receiverId: number, senderId: number, giftId: number | null, annonceId: number | null, matchType?: "NORMAL" | "BOOST"): Promise<{
        match: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            status: import("../generated/prisma").$Enums.MatchStatus;
            type: import("../generated/prisma").$Enums.MatchType;
            fromId: number;
            toId: number;
            isConfirmed: boolean;
            giftId: number | null;
            purchaseId: number | null;
        };
        chatRoom: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            agentId: number | null;
            participantOneId: number;
            participantTwoId: number;
            lastMessage: string | null;
            lastMessageSenderId: number | null;
            lastMessageStatus: import("../generated/prisma").$Enums.ChatLastMessageStatus;
            isSentByAgent: boolean;
        };
    }>;
    /**
     * Étape 3 : RUPTURE (Unmatch)
     */
    static breakMatch(userId: number, partnerId: number): Promise<{
        success: boolean;
    }>;
    /**
     * UTILITAIRE
     */
    static isUserInCouple(userId: number, txClient?: any): Promise<boolean>;
}
//# sourceMappingURL=match.service.d.ts.map