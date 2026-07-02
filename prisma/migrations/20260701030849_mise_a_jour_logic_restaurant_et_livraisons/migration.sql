/*
  Warnings:

  - The values [RESTAUANT] on the enum `CompanyCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "AmbianceType" AS ENUM ('INTIME', 'SEMI_PRIVE', 'SALLE_PRINCIPALE');

-- AlterEnum
BEGIN;
CREATE TYPE "CompanyCategory_new" AS ENUM ('RESTAURANT', 'HOTEL', 'TRANSPORT', 'ACTIVITY', 'GIFT', 'BEAUTY', 'OTHER');
ALTER TABLE "public"."Company" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Company" ALTER COLUMN "category" TYPE "CompanyCategory_new" USING ("category"::text::"CompanyCategory_new");
ALTER TYPE "CompanyCategory" RENAME TO "CompanyCategory_old";
ALTER TYPE "CompanyCategory_new" RENAME TO "CompanyCategory";
DROP TYPE "public"."CompanyCategory_old";
ALTER TABLE "Company" ALTER COLUMN "category" SET DEFAULT 'OTHER';
COMMIT;

-- AlterTable
ALTER TABLE "Annonce" ADD COLUMN     "ambiance" "AmbianceType" NOT NULL DEFAULT 'SALLE_PRINCIPALE',
ADD COLUMN     "hasAnimation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDeliveryAvailable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "isSurplaceAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryPhone" TEXT,
ADD COLUMN     "isDelivery" BOOLEAN NOT NULL DEFAULT false;
