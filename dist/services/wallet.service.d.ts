import { Prisma } from '../generated/prisma/client';
interface WalletSummary {
    soldePrincipalGlobal: number;
    bonusDisponibleGlobal: number;
    bonusBloqueGlobal: number;
    bonusVerrouilleGlobal: number;
    soldeTotalUtilisable: number;
    currencySymbol: string;
    starpoints: number;
}
export declare const walletService: {
    /**
     * 1. RECHARGER LE COMPTE
     */
    creditWallet: (userId: number, amount: number, provider: "KKIAPAY" | "STRIPE" | "SYSTEM", reference: string, customCountryCode?: string | null) => Promise<any>;
    /**
     * 2. DÉBIT / ACHAT (Ordre FIFO Strict)
     */
    debitWallet: (userId: number, totalAmountToDebit: number, description: string, txClient?: any, isTransferLumiere?: boolean) => Promise<any>;
    /**
     * 3. TRANSFERT P2P LUMIÈRE
     */
    transferLumiere: (senderId: number, receiverId: number, amountToTransfer: number) => Promise<any>;
    /**
     * 4. GESTION DES REMBOURSEMENTS
     */
    refundWallet: (userId: number, originalTrancheId: string, amountToRefund: number, reason: string) => Promise<any>;
    /**
     * 5. GEL DE BONUS
     */
    lockBonus: (userId: number, amountToLock: number, reason: string) => Promise<boolean>;
    /**
     * 6. DÉBLOCAGE DE BONUS GELÉ
     */
    unlockBonus: (userId: number, amountToUnlock: number, reason: string) => Promise<boolean>;
    /**
     * 7. EXPIRATION DES BONUS
     */
    expireOldBonus: () => Promise<void>;
    /**
     * 8. SYNTHÈSE COMPLÈTE DES COMPTEURS (Filtre incluant 'EXPIRE' pour conserver le principal)
     */
    getWalletSummary: (userId: number, txClient?: any) => Promise<WalletSummary>;
    /**
     * 9. HISTORIQUE
     */
    getClientHistory: (userId: number, limit?: number, page?: number) => Promise<{
        history: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            userId: number;
            description: string | null;
            type: import("../generated/prisma").$Enums.TrancheType;
            trancheId: string;
            principalInitial: Prisma.Decimal;
            principalRestant: Prisma.Decimal;
            bonusTotal: Prisma.Decimal;
            bonusDebloque: Prisma.Decimal;
            bonusBloque: Prisma.Decimal;
            bonusRestant: Prisma.Decimal;
            currency: string;
            statut: import("../generated/prisma").$Enums.TrancheStatus;
            referenceGate: string | null;
            dateRecharge: Date;
        }[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
};
export {};
//# sourceMappingURL=wallet.service.d.ts.map