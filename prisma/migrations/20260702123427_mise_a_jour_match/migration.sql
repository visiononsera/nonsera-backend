/*
  Warnings:

  - Added the required column `updatedAt` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('ACTIVE', 'BROKEN');

-- DropIndex
DROP INDEX "Match_fromId_toId_key";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "links" JSONB,
ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "giftId" INTEGER,
ADD COLUMN     "status" "MatchStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_fromId_toId_idx" ON "Match"("fromId", "toId");
