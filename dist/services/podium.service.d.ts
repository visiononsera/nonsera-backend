export declare class PodiumService {
    /**
     * RÉCUPÉRER LA STAR COURANTE POUR UN SPECTATEUR
     */
    static getLiveStarForUser(userId: number): Promise<{
        roundId: number;
        timeDue: Date;
        spot: number;
        star: {
            id: number;
            fullname: string;
            username: string | null;
            profilePhoto: string | null;
            birthday: Date | null;
            gender: import("../generated/prisma").$Enums.Gender | null;
            biography: string | null;
            passion: string | null;
            religion: string | null;
            country: string | null;
            city: string | null;
            role: import("../generated/prisma").$Enums.Role;
        };
    } | null>;
    /**
     * GENERATION INITIALE DES ROUNDS
     */
    static generateCountryRounds(country: string, spectatorGender: "MALE" | "FEMALE"): Promise<void>;
    /**
     * RECRUTEMENT DES STARS
     */
    private static recruitStars;
    /**
     * LA STAR ACCEPTE LE PRÉSENT (PASSATION AUTOMATIQUE)
     * CORRECTION : Alignement polymorphe complet et arguments à plat pour MatchService
     */
    static acceptDaniellePresent(params: {
        podiumStarId: number;
        matchSenderId: number;
        presentId: number | null;
        annonceId: number | null;
    }): Promise<void>;
    /**
     * GESTION DE L'EXPIRATION D'UN ROUND DE 5 MIN
     */
    static handleRoundExpiration(podiumStarId: number): Promise<void>;
}
//# sourceMappingURL=podium.service.d.ts.map