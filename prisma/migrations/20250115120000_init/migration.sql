-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Region" AS ENUM ('NORTH', 'NORTHEAST', 'CENTRAL_WEST', 'SOUTHEAST', 'SOUTH');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'GUIDE', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('FEMALE', 'MALE', 'NON_BINARY', 'OTHER', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('CPF', 'CNPJ', 'PASSPORT', 'RG', 'RNE', 'DRIVER_LICENSE');

-- CreateEnum
CREATE TYPE "public"."GuideStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."Language" AS ENUM ('PORTUGUESE', 'ENGLISH', 'SPANISH', 'FRENCH', 'GERMAN', 'ITALIAN', 'MANDARIN', 'JAPANESE', 'KOREAN', 'RUSSIAN', 'DUTCH', 'ARABIC', 'HEBREW', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TrailDifficulty" AS ENUM ('EASY', 'MODERATE', 'HARD', 'EXTREME');

-- CreateEnum
CREATE TYPE "public"."TrailStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."TrailConditionStatus" AS ENUM ('GOOD', 'ALERT', 'RESTRICTED', 'UNSAFE', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."ExpeditionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'WAITLISTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."PaymentProvider" AS ENUM ('STRIPE', 'PAGSEGURO', 'MERCADO_PAGO', 'PAYPAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CREDIT_CARD', 'PIX', 'BOLETO', 'BANK_TRANSFER', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'REFUNDED', 'FAILED', 'CANCELLED', 'CHARGEBACK');

-- CreateEnum
CREATE TYPE "public"."MediaType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "public"."AuditActorType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."GuideRole" AS ENUM ('LEAD', 'ASSISTANT', 'SUPPORT', 'LOGISTICS');

-- CreateEnum
CREATE TYPE "public"."AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'RESERVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('RESERVATION_STATUS', 'PAYMENT_STATUS', 'EXPEDITION_UPDATE', 'SYSTEM', 'GUIDE_APPLICATION', 'TRAIL_UPDATE');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."MetricType" AS ENUM ('TOTAL_USERS', 'TOTAL_GUIDES', 'TOTAL_TRAILS', 'TOTAL_EXPEDITIONS', 'TOTAL_RESERVATIONS', 'TOTAL_REVENUE', 'ACTIVE_USERS', 'ACTIVE_EXPEDITIONS');

-- CreateEnum
CREATE TYPE "public"."WaitlistStatus" AS ENUM ('ACTIVE', 'INVITED', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."GuideDocumentType" AS ENUM ('IDENTIFICATION', 'CERTIFICATION', 'LICENSE', 'INSURANCE', 'OTHER');

-- CreateTable
CREATE TABLE "public"."State" (
    "id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" "public"."Region" NOT NULL,
    "capitalCityId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."City" (
    "id" INTEGER NOT NULL,
    "stateId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isCapital" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'MEMBER',
    "status" "public"."UserStatus" NOT NULL DEFAULT 'INVITED',
    "lastLoginAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" "public"."Gender" DEFAULT 'UNDISCLOSED',
    "documentType" "public"."DocumentType",
    "documentNumber" TEXT,
    "nationality" TEXT DEFAULT 'BR',
    "bio" TEXT,
    "avatarUrl" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "stateId" INTEGER,
    "cityId" INTEGER,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "district" TEXT,
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Guide" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."GuideStatus" NOT NULL DEFAULT 'PENDING',
    "cadasturNumber" TEXT,
    "cadasturIssuedAt" TIMESTAMP(3),
    "cadasturValidUntil" TIMESTAMP(3),
    "biography" TEXT,
    "experienceYears" INTEGER,
    "baseStateId" INTEGER,
    "baseCityId" INTEGER,
    "averageRating" DECIMAL(4,2),
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuideLanguage" (
    "guideId" TEXT NOT NULL,
    "language" "public"."Language" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuideLanguage_pkey" PRIMARY KEY ("guideId","language")
);

-- CreateTable
CREATE TABLE "public"."GuideServiceArea" (
    "guideId" TEXT NOT NULL,
    "cityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuideServiceArea_pkey" PRIMARY KEY ("guideId","cityId")
);

-- CreateTable
CREATE TABLE "public"."GuideSpecialty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideSpecialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuideSpecialtyAssignment" (
    "guideId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuideSpecialtyAssignment_pkey" PRIMARY KEY ("guideId","specialtyId")
);

-- CreateTable
CREATE TABLE "public"."GuideAvailability" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GuideAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuideDocument" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "public"."GuideDocumentType" NOT NULL DEFAULT 'OTHER',
    "url" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GuideDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Trail" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT,
    "summary" TEXT,
    "description" TEXT,
    "difficulty" "public"."TrailDifficulty" NOT NULL DEFAULT 'MODERATE',
    "status" "public"."TrailStatus" NOT NULL DEFAULT 'DRAFT',
    "distanceKm" DECIMAL(6,2),
    "durationHours" DECIMAL(5,2),
    "elevationGain" INTEGER,
    "elevationLoss" INTEGER,
    "maxAltitude" INTEGER,
    "minAltitude" INTEGER,
    "startLatitude" DECIMAL(10,7),
    "startLongitude" DECIMAL(10,7),
    "endLatitude" DECIMAL(10,7),
    "endLongitude" DECIMAL(10,7),
    "permitRequired" BOOLEAN NOT NULL DEFAULT false,
    "campingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "maxGroupSize" INTEGER,
    "bestSeason" TEXT,
    "hazards" TEXT,
    "recommendations" TEXT,
    "createdById" TEXT,
    "stateId" INTEGER,
    "cityId" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Trail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrailTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrailTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrailTagAssignment" (
    "trailId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailTagAssignment_pkey" PRIMARY KEY ("trailId","tagId")
);

-- CreateTable
CREATE TABLE "public"."TrailFeature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrailFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrailFeatureAssignment" (
    "trailId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailFeatureAssignment_pkey" PRIMARY KEY ("trailId","featureId")
);

-- CreateTable
CREATE TABLE "public"."TrailConditionReport" (
    "id" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "reportedById" TEXT,
    "condition" "public"."TrailConditionStatus" NOT NULL DEFAULT 'GOOD',
    "reportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "details" TEXT,
    "weather" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TrailConditionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrailCheckpoint" (
    "id" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "elevation" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TrailCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Expedition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "status" "public"."ExpeditionStatus" NOT NULL DEFAULT 'DRAFT',
    "difficulty" "public"."TrailDifficulty",
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "bookingOpensAt" TIMESTAMP(3),
    "bookingClosesAt" TIMESTAMP(3),
    "meetingPoint" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "maxParticipants" INTEGER NOT NULL,
    "minimumParticipants" INTEGER,
    "availableSpots" INTEGER,
    "whatIsIncluded" TEXT,
    "whatToBring" TEXT,
    "cancellationPolicy" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "leadGuideId" TEXT,
    "trailId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Expedition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpeditionGuide" (
    "expeditionId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "role" "public"."GuideRole" NOT NULL DEFAULT 'ASSISTANT',
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpeditionGuide_pkey" PRIMARY KEY ("expeditionId","guideId")
);

-- CreateTable
CREATE TABLE "public"."ExpeditionItineraryItem" (
    "id" TEXT NOT NULL,
    "expeditionId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpeditionItineraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpeditionEquipment" (
    "id" TEXT NOT NULL,
    "expeditionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpeditionEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpeditionPriceTier" (
    "id" TEXT NOT NULL,
    "expeditionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "minGroupSize" INTEGER,
    "maxGroupSize" INTEGER,
    "bookingOpensAt" TIMESTAMP(3),
    "bookingClosesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpeditionPriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpeditionChecklistItem" (
    "id" TEXT NOT NULL,
    "expeditionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpeditionChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reservation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expeditionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "totalCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReservationGuest" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "documentType" "public"."DocumentType",
    "documentNumber" TEXT,
    "birthDate" TIMESTAMP(3),
    "medicalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ReservationGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReservationChecklist" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "provider" "public"."PaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "method" "public"."PaymentMethod" NOT NULL DEFAULT 'PIX',
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "netAmountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "transactionId" TEXT,
    "externalReference" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentRefund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Review" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT,
    "expeditionId" TEXT,
    "trailId" TEXT,
    "guideId" TEXT,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "status" "public"."ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "responseById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "public"."AuditActorType" NOT NULL DEFAULT 'USER',
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MediaAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "guideId" TEXT,
    "trailId" TEXT,
    "expeditionId" TEXT,
    "reservationId" TEXT,
    "type" "public"."MediaType" NOT NULL DEFAULT 'IMAGE',
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "altText" TEXT,
    "credit" TEXT,
    "checksum" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" INTEGER,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MetricSnapshot" (
    "id" TEXT NOT NULL,
    "metric" "public"."MetricType" NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."WaitlistEntry" (
    "id" TEXT NOT NULL,
    "expeditionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."WaitlistStatus" NOT NULL DEFAULT 'ACTIVE',
    "position" INTEGER NOT NULL,
    "notes" TEXT,
    "invitedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Address" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "district" TEXT,
    "postalCode" TEXT,
    "cityId" INTEGER,
    "stateId" INTEGER,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "userId" TEXT,
    "guideId" TEXT,
    "expeditionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "State_code_key" ON "public"."State"("code");

-- CreateIndex
CREATE UNIQUE INDEX "State_capitalCityId_key" ON "public"."State"("capitalCityId");

-- CreateIndex
CREATE INDEX "State_name_idx" ON "public"."State"("name");

-- CreateIndex
CREATE INDEX "State_region_idx" ON "public"."State"("region");

-- CreateIndex
CREATE INDEX "City_stateId_name_idx" ON "public"."City"("stateId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "City_stateId_slug_key" ON "public"."City"("stateId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "public"."User"("status");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "public"."User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "public"."UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_stateId_idx" ON "public"."UserProfile"("stateId");

-- CreateIndex
CREATE INDEX "UserProfile_cityId_idx" ON "public"."UserProfile"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_documentType_documentNumber_key" ON "public"."UserProfile"("documentType", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_refreshTokenHash_key" ON "public"."UserSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_expiresAt_idx" ON "public"."UserSession"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "public"."PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "public"."PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "public"."PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Guide_userId_key" ON "public"."Guide"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Guide_cadasturNumber_key" ON "public"."Guide"("cadasturNumber");

-- CreateIndex
CREATE INDEX "Guide_status_idx" ON "public"."Guide"("status");

-- CreateIndex
CREATE INDEX "Guide_baseStateId_idx" ON "public"."Guide"("baseStateId");

-- CreateIndex
CREATE INDEX "Guide_baseCityId_idx" ON "public"."Guide"("baseCityId");

-- CreateIndex
CREATE INDEX "GuideServiceArea_cityId_idx" ON "public"."GuideServiceArea"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "GuideSpecialty_name_key" ON "public"."GuideSpecialty"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GuideSpecialty_slug_key" ON "public"."GuideSpecialty"("slug");

-- CreateIndex
CREATE INDEX "GuideSpecialtyAssignment_specialtyId_idx" ON "public"."GuideSpecialtyAssignment"("specialtyId");

-- CreateIndex
CREATE INDEX "GuideAvailability_guideId_idx" ON "public"."GuideAvailability"("guideId");

-- CreateIndex
CREATE INDEX "GuideAvailability_startDate_endDate_idx" ON "public"."GuideAvailability"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "GuideDocument_guideId_idx" ON "public"."GuideDocument"("guideId");

-- CreateIndex
CREATE INDEX "GuideDocument_type_idx" ON "public"."GuideDocument"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Trail_slug_key" ON "public"."Trail"("slug");

-- CreateIndex
CREATE INDEX "Trail_stateId_idx" ON "public"."Trail"("stateId");

-- CreateIndex
CREATE INDEX "Trail_cityId_idx" ON "public"."Trail"("cityId");

-- CreateIndex
CREATE INDEX "Trail_status_idx" ON "public"."Trail"("status");

-- CreateIndex
CREATE INDEX "Trail_difficulty_idx" ON "public"."Trail"("difficulty");

-- CreateIndex
CREATE INDEX "Trail_isActive_status_idx" ON "public"."Trail"("isActive", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TrailTag_name_key" ON "public"."TrailTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TrailTag_slug_key" ON "public"."TrailTag"("slug");

-- CreateIndex
CREATE INDEX "TrailTagAssignment_tagId_idx" ON "public"."TrailTagAssignment"("tagId");

-- CreateIndex
CREATE INDEX "TrailTagAssignment_assignedById_idx" ON "public"."TrailTagAssignment"("assignedById");

-- CreateIndex
CREATE UNIQUE INDEX "TrailFeature_name_key" ON "public"."TrailFeature"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TrailFeature_slug_key" ON "public"."TrailFeature"("slug");

-- CreateIndex
CREATE INDEX "TrailFeatureAssignment_featureId_idx" ON "public"."TrailFeatureAssignment"("featureId");

-- CreateIndex
CREATE INDEX "TrailConditionReport_trailId_idx" ON "public"."TrailConditionReport"("trailId");

-- CreateIndex
CREATE INDEX "TrailConditionReport_condition_idx" ON "public"."TrailConditionReport"("condition");

-- CreateIndex
CREATE INDEX "TrailConditionReport_reportDate_idx" ON "public"."TrailConditionReport"("reportDate");

-- CreateIndex
CREATE INDEX "TrailCheckpoint_trailId_idx" ON "public"."TrailCheckpoint"("trailId");

-- CreateIndex
CREATE UNIQUE INDEX "TrailCheckpoint_trailId_order_key" ON "public"."TrailCheckpoint"("trailId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Expedition_slug_key" ON "public"."Expedition"("slug");

-- CreateIndex
CREATE INDEX "Expedition_trailId_idx" ON "public"."Expedition"("trailId");

-- CreateIndex
CREATE INDEX "Expedition_status_idx" ON "public"."Expedition"("status");

-- CreateIndex
CREATE INDEX "Expedition_startDate_idx" ON "public"."Expedition"("startDate");

-- CreateIndex
CREATE INDEX "Expedition_leadGuideId_idx" ON "public"."Expedition"("leadGuideId");

-- CreateIndex
CREATE INDEX "Expedition_createdById_idx" ON "public"."Expedition"("createdById");

-- CreateIndex
CREATE INDEX "ExpeditionGuide_guideId_idx" ON "public"."ExpeditionGuide"("guideId");

-- CreateIndex
CREATE INDEX "ExpeditionGuide_assignedById_idx" ON "public"."ExpeditionGuide"("assignedById");

-- CreateIndex
CREATE INDEX "ExpeditionItineraryItem_expeditionId_idx" ON "public"."ExpeditionItineraryItem"("expeditionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpeditionItineraryItem_expeditionId_dayNumber_title_key" ON "public"."ExpeditionItineraryItem"("expeditionId", "dayNumber", "title");

-- CreateIndex
CREATE INDEX "ExpeditionEquipment_expeditionId_idx" ON "public"."ExpeditionEquipment"("expeditionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpeditionEquipment_expeditionId_name_key" ON "public"."ExpeditionEquipment"("expeditionId", "name");

-- CreateIndex
CREATE INDEX "ExpeditionPriceTier_expeditionId_idx" ON "public"."ExpeditionPriceTier"("expeditionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpeditionPriceTier_expeditionId_title_key" ON "public"."ExpeditionPriceTier"("expeditionId", "title");

-- CreateIndex
CREATE INDEX "ExpeditionChecklistItem_expeditionId_idx" ON "public"."ExpeditionChecklistItem"("expeditionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpeditionChecklistItem_expeditionId_title_key" ON "public"."ExpeditionChecklistItem"("expeditionId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_code_key" ON "public"."Reservation"("code");

-- CreateIndex
CREATE INDEX "Reservation_expeditionId_idx" ON "public"."Reservation"("expeditionId");

-- CreateIndex
CREATE INDEX "Reservation_userId_idx" ON "public"."Reservation"("userId");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "public"."Reservation"("status");

-- CreateIndex
CREATE INDEX "Reservation_bookedAt_idx" ON "public"."Reservation"("bookedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_reservation_user_expedition" ON "public"."Reservation"("expeditionId", "userId");

-- CreateIndex
CREATE INDEX "ReservationGuest_reservationId_idx" ON "public"."ReservationGuest"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationGuest_documentNumber_idx" ON "public"."ReservationGuest"("documentNumber");

-- CreateIndex
CREATE INDEX "ReservationChecklist_reservationId_idx" ON "public"."ReservationChecklist"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationChecklist_reservationId_item_key" ON "public"."ReservationChecklist"("reservationId", "item");

-- CreateIndex
CREATE INDEX "Payment_reservationId_idx" ON "public"."Payment"("reservationId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_transactionId_idx" ON "public"."Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_provider_idx" ON "public"."Payment"("provider");

-- CreateIndex
CREATE INDEX "Payment_method_idx" ON "public"."Payment"("method");

-- CreateIndex
CREATE INDEX "PaymentRefund_paymentId_idx" ON "public"."PaymentRefund"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentRefund_status_idx" ON "public"."PaymentRefund"("status");

-- CreateIndex
CREATE INDEX "Review_expeditionId_idx" ON "public"."Review"("expeditionId");

-- CreateIndex
CREATE INDEX "Review_trailId_idx" ON "public"."Review"("trailId");

-- CreateIndex
CREATE INDEX "Review_guideId_idx" ON "public"."Review"("guideId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "public"."Review"("userId");

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "public"."Review"("status");

-- CreateIndex
CREATE INDEX "Review_reservationId_idx" ON "public"."Review"("reservationId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "public"."AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "public"."AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_paymentId_idx" ON "public"."AuditLog"("paymentId");

-- CreateIndex
CREATE INDEX "MediaAsset_trailId_idx" ON "public"."MediaAsset"("trailId");

-- CreateIndex
CREATE INDEX "MediaAsset_guideId_idx" ON "public"."MediaAsset"("guideId");

-- CreateIndex
CREATE INDEX "MediaAsset_expeditionId_idx" ON "public"."MediaAsset"("expeditionId");

-- CreateIndex
CREATE INDEX "MediaAsset_ownerId_idx" ON "public"."MediaAsset"("ownerId");

-- CreateIndex
CREATE INDEX "MediaAsset_reservationId_idx" ON "public"."MediaAsset"("reservationId");

-- CreateIndex
CREATE INDEX "MediaAsset_type_idx" ON "public"."MediaAsset"("type");

-- CreateIndex
CREATE INDEX "MediaAsset_isCover_idx" ON "public"."MediaAsset"("isCover");

-- CreateIndex
CREATE INDEX "Notification_userId_status_idx" ON "public"."Notification"("userId", "status");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "public"."Notification"("type");

-- CreateIndex
CREATE UNIQUE INDEX "MetricSnapshot_metric_recordedAt_key" ON "public"."MetricSnapshot"("metric", "recordedAt");

-- CreateIndex
CREATE INDEX "WaitlistEntry_expeditionId_idx" ON "public"."WaitlistEntry"("expeditionId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_userId_idx" ON "public"."WaitlistEntry"("userId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_expeditionId_position_idx" ON "public"."WaitlistEntry"("expeditionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_expeditionId_userId_key" ON "public"."WaitlistEntry"("expeditionId", "userId");

-- CreateIndex
CREATE INDEX "Address_cityId_idx" ON "public"."Address"("cityId");

-- CreateIndex
CREATE INDEX "Address_stateId_idx" ON "public"."Address"("stateId");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "public"."Address"("userId");

-- CreateIndex
CREATE INDEX "Address_guideId_idx" ON "public"."Address"("guideId");

-- CreateIndex
CREATE INDEX "Address_expeditionId_idx" ON "public"."Address"("expeditionId");

-- AddForeignKey
ALTER TABLE "public"."State" ADD CONSTRAINT "State_capitalCityId_fkey" FOREIGN KEY ("capitalCityId") REFERENCES "public"."City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."City" ADD CONSTRAINT "City_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "public"."State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProfile" ADD CONSTRAINT "UserProfile_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "public"."State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProfile" ADD CONSTRAINT "UserProfile_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Guide" ADD CONSTRAINT "Guide_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Guide" ADD CONSTRAINT "Guide_baseStateId_fkey" FOREIGN KEY ("baseStateId") REFERENCES "public"."State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Guide" ADD CONSTRAINT "Guide_baseCityId_fkey" FOREIGN KEY ("baseCityId") REFERENCES "public"."City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuideLanguage" ADD CONSTRAINT "GuideLanguage_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "public"."Guide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuideServiceArea" ADD CONSTRAINT "GuideServiceArea_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "public"."Guide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuideServiceArea" ADD CONSTRAINT "GuideServiceArea_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuideSpecialtyAssignment" ADD CONSTRAINT "GuideSpecialtyAssignment_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "public"."Guide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuideSpecialtyAssignment" ADD CONSTRAINT "GuideSpecialtyAssignment_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "public"."GuideSpecialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuideAvailability" ADD CONSTRAINT "GuideAvailability_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "public"."Guide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuideDocument" ADD CONSTRAINT "GuideDocument_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "public"."Guide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trail" ADD CONSTRAINT "Trail_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trail" ADD CONSTRAINT "Trail_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "public"."State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trail" ADD CONSTRAINT "Trail_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailTagAssignment" ADD CONSTRAINT "TrailTagAssignment_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "public"."Trail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailTagAssignment" ADD CONSTRAINT "TrailTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."TrailTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailTagAssignment" ADD CONSTRAINT "TrailTagAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailFeatureAssignment" ADD CONSTRAINT "TrailFeatureAssignment_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "public"."Trail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailFeatureAssignment" ADD CONSTRAINT "TrailFeatureAssignment_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "public"."TrailFeature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailConditionReport" ADD CONSTRAINT "TrailConditionReport_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "public"."Trail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailConditionReport" ADD CONSTRAINT "TrailConditionReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailCheckpoint" ADD CONSTRAINT "TrailCheckpoint_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "public"."Trail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expedition" ADD CONSTRAINT "Expedition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expedition" ADD CONSTRAINT "Expedition_leadGuideId_fkey" FOREIGN KEY ("leadGuideId") REFERENCES "public"."Guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expedition" ADD CONSTRAINT "Expedition_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "public"."Trail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpeditionGuide" ADD CONSTRAINT "ExpeditionGuide_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "public"."Expedition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpeditionGuide" ADD CONSTRAINT "ExpeditionGuide_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "public"."Guide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpeditionGuide" ADD CONSTRAINT "ExpeditionGuide_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpeditionItineraryItem" ADD CONSTRAINT "ExpeditionItineraryItem_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "public"."Expedition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpeditionEquipment" ADD CONSTRAINT "ExpeditionEquipment_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "public"."Expedition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpeditionPriceTier" ADD CONSTRAINT "ExpeditionPriceTier_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "public"."Expedition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpeditionChecklistItem" ADD CONSTRAINT "ExpeditionChecklistItem_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "public"."Expedition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "public"."Expedition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReservationGuest" ADD CONSTRAINT "ReservationGuest_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReservationChecklist" ADD CONSTRAINT "ReservationChecklist_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "public"."Expedition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "public"."Trail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "public"."Guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_responseById_fkey" FOREIGN KEY ("responseById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaAsset" ADD CONSTRAINT "MediaAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaAsset" ADD CONSTRAINT "MediaAsset_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "public"."Guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaAsset" ADD CONSTRAINT "MediaAsset_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "public"."Trail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaAsset" ADD CONSTRAINT "MediaAsset_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "public"."Expedition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaAsset" ADD CONSTRAINT "MediaAsset_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "public"."Expedition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Address" ADD CONSTRAINT "Address_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Address" ADD CONSTRAINT "Address_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "public"."State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Address" ADD CONSTRAINT "Address_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "public"."Guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Address" ADD CONSTRAINT "Address_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "public"."Expedition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

