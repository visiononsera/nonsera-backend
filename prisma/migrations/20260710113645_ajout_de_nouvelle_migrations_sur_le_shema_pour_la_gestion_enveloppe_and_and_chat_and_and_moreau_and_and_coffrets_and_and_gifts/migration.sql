/*
  Warnings:

  - The values [PENDING,RECEIVED] on the enum `MessageStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [CUSTOM] on the enum `MessageType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `chatId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `mediaUrl` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Message` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[matchId]` on the table `ChatRoom` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `matchId` to the `ChatRoom` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chatRoomId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matchId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EnvelopeType" AS ENUM ('DAILY', 'MONTHLY', 'YEARLY');

-- AlterEnum
BEGIN;
CREATE TYPE "MessageStatus_new" AS ENUM ('UNSENT', 'SENT', 'DELIVERED', 'READ');
ALTER TABLE "public"."Message" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Message" ALTER COLUMN "status" TYPE "MessageStatus_new" USING ("status"::text::"MessageStatus_new");
ALTER TYPE "MessageStatus" RENAME TO "MessageStatus_old";
ALTER TYPE "MessageStatus_new" RENAME TO "MessageStatus";
DROP TYPE "public"."MessageStatus_old";
ALTER TABLE "Message" ALTER COLUMN "status" SET DEFAULT 'SENT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MessageType_new" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'LINK', 'EMOJI', 'GIFT');
ALTER TABLE "public"."Message" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Message" ALTER COLUMN "type" TYPE "MessageType_new" USING ("type"::text::"MessageType_new");
ALTER TYPE "MessageType" RENAME TO "MessageType_old";
ALTER TYPE "MessageType_new" RENAME TO "MessageType";
DROP TYPE "public"."MessageType_old";
ALTER TABLE "Message" ALTER COLUMN "type" SET DEFAULT 'TEXT';
COMMIT;

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_chatId_fkey";

-- DropIndex
DROP INDEX "Message_chatId_idx";

-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "matchId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "flameExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "chatId",
DROP COLUMN "mediaUrl",
DROP COLUMN "title",
ADD COLUMN     "chatRoomId" INTEGER NOT NULL,
ADD COLUMN     "matchId" INTEGER NOT NULL,
ADD COLUMN     "recipientId" INTEGER NOT NULL,
ALTER COLUMN "content" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DEFAULT 'SENT';

-- CreateTable
CREATE TABLE "Coffret" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "images" JSONB NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 2,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coffret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoffretItem" (
    "id" SERIAL NOT NULL,
    "coffretId" INTEGER NOT NULL,
    "category" "CompanyCategory" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "durationHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoffretItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoffretReservation" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "coffretId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DECIMAL(18,2) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoffretReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvelopeWheel" (
    "id" SERIAL NOT NULL,
    "type" "EnvelopeType" NOT NULL,
    "prizeAmount" DOUBLE PRECISION NOT NULL,
    "country" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvelopeWheel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvelopeWinner" (
    "id" SERIAL NOT NULL,
    "envelopeWheelId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "amountWon" DOUBLE PRECISION NOT NULL,
    "drawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "city" TEXT,

    CONSTRAINT "EnvelopeWinner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryProfitability" (
    "id" SERIAL NOT NULL,
    "countryCode" TEXT NOT NULL,
    "profitabilityThreshold" DECIMAL(18,2) NOT NULL,
    "currentVolume" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryProfitability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Coffret_isAvailable_isVerified_idx" ON "Coffret"("isAvailable", "isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "CoffretReservation_reference_key" ON "CoffretReservation"("reference");

-- CreateIndex
CREATE INDEX "CoffretReservation_userId_idx" ON "CoffretReservation"("userId");

-- CreateIndex
CREATE INDEX "CoffretReservation_status_idx" ON "CoffretReservation"("status");

-- CreateIndex
CREATE INDEX "EnvelopeWheel_type_country_isActive_idx" ON "EnvelopeWheel"("type", "country", "isActive");

-- CreateIndex
CREATE INDEX "EnvelopeWinner_drawnAt_idx" ON "EnvelopeWinner"("drawnAt");

-- CreateIndex
CREATE UNIQUE INDEX "CountryProfitability_countryCode_key" ON "CountryProfitability"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoom_matchId_key" ON "ChatRoom"("matchId");

-- CreateIndex
CREATE INDEX "ChatRoom_matchId_idx" ON "ChatRoom"("matchId");

-- CreateIndex
CREATE INDEX "Message_chatRoomId_idx" ON "Message"("chatRoomId");

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coffret" ADD CONSTRAINT "Coffret_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoffretItem" ADD CONSTRAINT "CoffretItem_coffretId_fkey" FOREIGN KEY ("coffretId") REFERENCES "Coffret"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoffretReservation" ADD CONSTRAINT "CoffretReservation_coffretId_fkey" FOREIGN KEY ("coffretId") REFERENCES "Coffret"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoffretReservation" ADD CONSTRAINT "CoffretReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvelopeWinner" ADD CONSTRAINT "EnvelopeWinner_envelopeWheelId_fkey" FOREIGN KEY ("envelopeWheelId") REFERENCES "EnvelopeWheel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvelopeWinner" ADD CONSTRAINT "EnvelopeWinner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
