-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MOTO', 'BERLINE', 'VIP', 'MINIBUS');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CONCERT', 'RANDONNEE', 'MATCH', 'CINEMA', 'BOWLING', 'KARTING', 'PLAGE', 'HELICOPTERE', 'LASER_GAME', 'ESCAPE_GAME', 'PISCINE', 'EVENEMENT_SPECIAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReservationStatus" ADD VALUE 'CONFIRMED';
ALTER TYPE "ReservationStatus" ADD VALUE 'LITIGE';

-- AlterTable
ALTER TABLE "Annonce" ADD COLUMN     "activityType" "ActivityType",
ADD COLUMN     "equipements" JSONB,
ADD COLUMN     "isRomantique" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nbPlaces" INTEGER,
ADD COLUMN     "vehicleType" "VehicleType",
ALTER COLUMN "ambiance" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "bannerPicture" TEXT;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "agentArbitrageNote" TEXT,
ADD COLUMN     "cancellationDeadline" TIMESTAMP(3),
ADD COLUMN     "endLatitude" DECIMAL(10,7),
ADD COLUMN     "endLongitude" DECIMAL(10,7),
ADD COLUMN     "litigeReason" TEXT,
ADD COLUMN     "receiverId" INTEGER,
ADD COLUMN     "startAddressText" TEXT,
ADD COLUMN     "startLatitude" DECIMAL(10,7),
ADD COLUMN     "startLongitude" DECIMAL(10,7),
ALTER COLUMN "endDate" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Annonce_isAvailable_idx" ON "Annonce"("isAvailable");

-- CreateIndex
CREATE INDEX "Annonce_vehicleType_idx" ON "Annonce"("vehicleType");

-- CreateIndex
CREATE INDEX "Annonce_activityType_idx" ON "Annonce"("activityType");

-- CreateIndex
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE INDEX "Reservation_createdAt_idx" ON "Reservation"("createdAt");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
