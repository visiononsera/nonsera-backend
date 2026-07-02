-- CreateEnum
CREATE TYPE "TrancheStatus" AS ENUM ('ACTIVE', 'EPUISE', 'EXPIRE');

-- CreateTable
CREATE TABLE "CurrencyConfig" (
    "id" SERIAL NOT NULL,
    "countryCode" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "bonusRate" DECIMAL(4,2) NOT NULL DEFAULT 0.10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTranche" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "trancheId" TEXT NOT NULL,
    "dateRecharge" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "principalInitial" DECIMAL(18,2) NOT NULL,
    "principalRestant" DECIMAL(18,2) NOT NULL,
    "bonusTotal" DECIMAL(18,2) NOT NULL,
    "bonusDebloque" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bonusRestant" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "statut" "TrancheStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTranche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarpointWallet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "points" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StarpointWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyConfig_countryCode_key" ON "CurrencyConfig"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTranche_trancheId_key" ON "WalletTranche"("trancheId");

-- CreateIndex
CREATE INDEX "WalletTranche_userId_idx" ON "WalletTranche"("userId");

-- CreateIndex
CREATE INDEX "WalletTranche_statut_idx" ON "WalletTranche"("statut");

-- CreateIndex
CREATE INDEX "WalletTranche_dateRecharge_idx" ON "WalletTranche"("dateRecharge");

-- CreateIndex
CREATE UNIQUE INDEX "StarpointWallet_userId_key" ON "StarpointWallet"("userId");

-- AddForeignKey
ALTER TABLE "WalletTranche" ADD CONSTRAINT "WalletTranche_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarpointWallet" ADD CONSTRAINT "StarpointWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
