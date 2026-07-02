/*
  Warnings:

  - A unique constraint covering the columns `[referenceGate]` on the table `WalletTranche` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TrancheType" AS ENUM ('RECHARGE', 'ACHAT', 'LUMIERE_ENVOI', 'LUMIERE_RECEPTION', 'AJUSTEMENT');

-- AlterTable
ALTER TABLE "WalletTranche" ADD COLUMN     "bonusBloque" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "referenceGate" TEXT,
ADD COLUMN     "type" "TrancheType" NOT NULL DEFAULT 'RECHARGE';

-- CreateIndex
CREATE UNIQUE INDEX "WalletTranche_referenceGate_key" ON "WalletTranche"("referenceGate");
