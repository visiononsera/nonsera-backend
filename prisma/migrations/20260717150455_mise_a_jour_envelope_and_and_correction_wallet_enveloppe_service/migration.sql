/*
  Warnings:

  - A unique constraint covering the columns `[country,hourStart]` on the table `EnvelopeWheel` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hourStart` to the `EnvelopeWheel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EnvelopeWheel" ADD COLUMN     "cahAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "hourStart" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'DAILY';

-- CreateTable
CREATE TABLE "UserEnvelopeMetric" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "country" VARCHAR(5) NOT NULL,
    "hourStart" TIMESTAMP(3) NOT NULL,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "spentAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "hasSpun" BOOLEAN NOT NULL DEFAULT false,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEnvelopeMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEnvelopeMetric_userId_hourStart_key" ON "UserEnvelopeMetric"("userId", "hourStart");

-- CreateIndex
CREATE UNIQUE INDEX "EnvelopeWheel_country_hourStart_key" ON "EnvelopeWheel"("country", "hourStart");

-- AddForeignKey
ALTER TABLE "UserEnvelopeMetric" ADD CONSTRAINT "UserEnvelopeMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
