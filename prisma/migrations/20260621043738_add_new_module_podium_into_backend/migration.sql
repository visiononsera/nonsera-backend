/*
  Warnings:

  - You are about to drop the column `userId` on the `Podium` table. All the data in the column will be lost.
  - Made the column `country` on table `Podium` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `podiumId` to the `PodiumStar` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Podium" DROP CONSTRAINT "Podium_userId_fkey";

-- DropIndex
DROP INDEX "Podium_userId_key";

-- DropIndex
DROP INDEX "PodiumStar_userId_key";

-- AlterTable
ALTER TABLE "Podium" DROP COLUMN "userId",
ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE',
ALTER COLUMN "category" SET DEFAULT 'COUNTRY';

-- AlterTable
ALTER TABLE "PodiumStar" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "levelUsed" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "podiumId" INTEGER NOT NULL,
ALTER COLUMN "spot" SET DEFAULT 1;

-- CreateTable
CREATE TABLE "PodiumSpectator" (
    "id" SERIAL NOT NULL,
    "podiumStarId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PodiumSpectator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PodiumSpectator_podiumStarId_userId_key" ON "PodiumSpectator"("podiumStarId", "userId");

-- CreateIndex
CREATE INDEX "PodiumStar_country_isActive_idx" ON "PodiumStar"("country", "isActive");

-- AddForeignKey
ALTER TABLE "PodiumStar" ADD CONSTRAINT "PodiumStar_podiumId_fkey" FOREIGN KEY ("podiumId") REFERENCES "Podium"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodiumSpectator" ADD CONSTRAINT "PodiumSpectator_podiumStarId_fkey" FOREIGN KEY ("podiumStarId") REFERENCES "PodiumStar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodiumSpectator" ADD CONSTRAINT "PodiumSpectator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
