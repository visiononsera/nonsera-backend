-- CreateEnum
CREATE TYPE "Genre" AS ENUM ('male', 'female', 'neutre');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'AGENT');

-- CreateEnum
CREATE TYPE "TypeMatch" AS ENUM ('boost', 'normal');

-- CreateEnum
CREATE TYPE "LastMessageStatus" AS ENUM ('pending', 'send', 'unsend', 'received', 'read');

-- CreateEnum
CREATE TYPE "TypeMessage" AS ENUM ('image', 'gift', 'text', 'custom');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'send', 'unsend', 'received', 'read');

-- CreateEnum
CREATE TYPE "GiftCategory" AS ENUM ('rose', 'mode_beaute', 'fitness_bien_etre', 'cuisine_gastronomie', 'bijoux_accessoires', 'art_creativite', 'musique', 'technologie_gadget', 'litterature_ecriture', 'jardinage', 'jeux_loisirs', 'sextoys', 'unclassified');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('pending', 'processing', 'received');

-- CreateEnum
CREATE TYPE "AnnonceCategory" AS ENUM ('unclassified', 'petit_dejeuner', 'dejeuner', 'diner', 'compact', 'intermediary', 'berline', 'luxury', 'pickup', 'standard', 'deluxe', 'suite', 'communicante', 'diner_romantique', 'cinema', 'promenade', 'musee_galerie', 'spectacle', 'spa', 'rose', 'mode_beaute', 'fitness_bien_etre', 'cuisine_gastronomie', 'bijoux_accessoires', 'art_creativite', 'musique', 'technologie_gadget', 'litterature_ecriture', 'jardinage', 'jeux_loisirs', 'coquins');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('pending', 'processed');

-- CreateEnum
CREATE TYPE "PodiumCategory" AS ENUM ('NONE', 'COUNTRY', 'WORLD');

-- CreateEnum
CREATE TYPE "PodiumStatus" AS ENUM ('none', 'isOn', 'isAlreadyPassed');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('HEBERGEMENT', 'RESTAURANT', 'TRANSPORT', 'ACTIVITE', 'CADEAU', 'COFFRETc');

-- CreateEnum
CREATE TYPE "AccountDeleteStatus" AS ENUM ('pending', 'deleted');

-- CreateEnum
CREATE TYPE "RetraitStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "username" TEXT,
    "photoProfil" TEXT,
    "birthday" TIMESTAMP(3),
    "horoscope" TEXT,
    "religion" TEXT,
    "vision" TEXT,
    "passion" TEXT,
    "age" INTEGER,
    "langage" JSONB,
    "description" TEXT,
    "preference" JSONB,
    "genre" "Genre",
    "coins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dmScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCertified" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isFake" BOOLEAN NOT NULL DEFAULT false,
    "longitude" DECIMAL(65,30),
    "latitude" DECIMAL(65,30),
    "pays" TEXT,
    "villes" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "preferencePays" TEXT,
    "disponiblePour" TEXT,
    "isVideoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isLockEnabled" BOOLEAN NOT NULL DEFAULT false,
    "firstOtherPhoto" TEXT,
    "secondOtherPhoto" TEXT,
    "thirdOtherPhoto" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "assignedAgent" INTEGER,
    "podiumOccurenceCount" INTEGER NOT NULL DEFAULT 0,
    "deviceToken" TEXT,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preferredGiftId" INTEGER,
    "giftPurposeId" INTEGER,
    "passCode" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "isConfirm" BOOLEAN NOT NULL DEFAULT false,
    "typeMatch" "TypeMatch" NOT NULL DEFAULT 'normal',

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fromNotifiedId" INTEGER NOT NULL,
    "toNotifiedId" INTEGER NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRoom" (
    "id" SERIAL NOT NULL,
    "participant" JSONB NOT NULL,
    "lastMessage" VARCHAR(1000),
    "lastMessageSender" INTEGER,
    "lastMessageStatus" "LastMessageStatus" NOT NULL DEFAULT 'pending',
    "isSentByAgent" BOOLEAN NOT NULL DEFAULT false,
    "agentId" INTEGER,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "contenu" VARCHAR(1000) NOT NULL,
    "title" TEXT,
    "mediaUrl" TEXT,
    "typeMessage" "TypeMessage" NOT NULL DEFAULT 'text',
    "sender" INTEGER NOT NULL,
    "dateMessage" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'pending',
    "isSentByAgent" BOOLEAN NOT NULL DEFAULT false,
    "chatId" INTEGER NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gift" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prix" DECIMAL(65,30) NOT NULL,
    "points" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "image" TEXT NOT NULL,
    "description" TEXT,
    "giftCategory" "GiftCategory" NOT NULL DEFAULT 'unclassified',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresIn" INTEGER NOT NULL DEFAULT 30,
    "companyId" INTEGER,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" SERIAL NOT NULL,
    "annonceId" INTEGER NOT NULL,
    "qtyPurchased" INTEGER NOT NULL DEFAULT 1,
    "datePurchased" TIMESTAMP(3) NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'pending',
    "deliveryAddress" TEXT,
    "recipientFullName" TEXT,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annonce" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prix" DECIMAL(65,30) NOT NULL,
    "points" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "image" TEXT NOT NULL,
    "description" TEXT,
    "category" "AnnonceCategory" NOT NULL DEFAULT 'unclassified',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresIn" INTEGER NOT NULL DEFAULT 30,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "companyId" INTEGER,

    CONSTRAINT "Annonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmListe" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "annonceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "DmListe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "annonceId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalPrice" DECIMAL(65,30),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReservationStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LikedAnnonce" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "annonceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LikedAnnonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocketMapping" (
    "id" SERIAL NOT NULL,
    "socketId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "SocketMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LockedConversation" (
    "id" SERIAL NOT NULL,
    "initiatorId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "isConfirm" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LockedConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Podium" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "pays" TEXT,
    "status" "PodiumStatus" NOT NULL DEFAULT 'none',
    "category" "PodiumCategory" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Podium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodiumStar" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "spot" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeDue" TIMESTAMP(3) NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "PodiumStar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodiumTransactions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "spotPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PodiumTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarOfTheDay" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StarOfTheDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarOfTheYear" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StarOfTheYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarOfTheMonth" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StarOfTheMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sigle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "SubscriptionStatus" NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT,
    "category" TEXT,
    "logo" TEXT,
    "description" TEXT,
    "country" TEXT,
    "city" TEXT,
    "longitude" DECIMAL(65,30),
    "latitude" DECIMAL(65,30),
    "mapAddress" TEXT,
    "subscriptionId" INTEGER,
    "numeroSocial" TEXT,
    "solde" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCompany" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "UserCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySubscription" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDelete" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "status" "AccountDeleteStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "AccountDelete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retrait" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "status" "RetraitStatus" NOT NULL DEFAULT 'pending',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Retrait_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "DmListe_userId_idx" ON "DmListe"("userId");

-- CreateIndex
CREATE INDEX "DmListe_annonceId_idx" ON "DmListe"("annonceId");

-- CreateIndex
CREATE UNIQUE INDEX "SocketMapping_socketId_key" ON "SocketMapping"("socketId");

-- CreateIndex
CREATE UNIQUE INDEX "SocketMapping_userId_key" ON "SocketMapping"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LockedConversation_initiatorId_receiverId_key" ON "LockedConversation"("initiatorId", "receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "Podium_userId_key" ON "Podium"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PodiumStar_userId_key" ON "PodiumStar"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Country_sigle_key" ON "Country"("sigle");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_phoneNumber_key" ON "Company"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Company_username_key" ON "Company"("username");

-- CreateIndex
CREATE INDEX "UserCompany_userId_idx" ON "UserCompany"("userId");

-- CreateIndex
CREATE INDEX "UserCompany_companyId_idx" ON "UserCompany"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Retrait_reference_key" ON "Retrait"("reference");

-- CreateIndex
CREATE INDEX "Retrait_companyId_idx" ON "Retrait"("companyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_preferredGiftId_fkey" FOREIGN KEY ("preferredGiftId") REFERENCES "Gift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_giftPurposeId_fkey" FOREIGN KEY ("giftPurposeId") REFERENCES "Annonce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fromNotifiedId_fkey" FOREIGN KEY ("fromNotifiedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_toNotifiedId_fkey" FOREIGN KEY ("toNotifiedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "ChatRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "Annonce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annonce" ADD CONSTRAINT "Annonce_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmListe" ADD CONSTRAINT "DmListe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmListe" ADD CONSTRAINT "DmListe_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "Annonce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "Annonce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikedAnnonce" ADD CONSTRAINT "LikedAnnonce_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikedAnnonce" ADD CONSTRAINT "LikedAnnonce_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "Annonce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocketMapping" ADD CONSTRAINT "SocketMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockedConversation" ADD CONSTRAINT "LockedConversation_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockedConversation" ADD CONSTRAINT "LockedConversation_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Podium" ADD CONSTRAINT "Podium_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodiumStar" ADD CONSTRAINT "PodiumStar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodiumTransactions" ADD CONSTRAINT "PodiumTransactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarOfTheDay" ADD CONSTRAINT "StarOfTheDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarOfTheYear" ADD CONSTRAINT "StarOfTheYear_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarOfTheMonth" ADD CONSTRAINT "StarOfTheMonth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retrait" ADD CONSTRAINT "Retrait_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
