-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('AUDIO', 'VISUAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "ClipQueueStatus" AS ENUM ('PENDING', 'RECORDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "TriggerConfig" (
    "id" TEXT NOT NULL,
    "workflow" TEXT NOT NULL,
    "audioTriggers" JSONB NOT NULL DEFAULT '[]',
    "audioEnabled" BOOLEAN NOT NULL DEFAULT false,
    "visualTriggers" JSONB NOT NULL DEFAULT '[]',
    "visualEnabled" BOOLEAN NOT NULL DEFAULT false,
    "frameSampleRate" INTEGER NOT NULL DEFAULT 5,
    "autoClipEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoClipDuration" INTEGER NOT NULL DEFAULT 60,
    "triggerCooldown" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TriggerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceImage" (
    "id" TEXT NOT NULL,
    "workflow" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClipQueueItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "clipId" TEXT,
    "status" "ClipQueueStatus" NOT NULL DEFAULT 'PENDING',
    "triggerType" "TriggerType" NOT NULL,
    "triggerSource" TEXT,
    "triggerConfidence" DOUBLE PRECISION,
    "t0" DOUBLE PRECISION NOT NULL,
    "t1" DOUBLE PRECISION,
    "thumbnailPath" TEXT,
    "title" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClipQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TriggerConfig_workflow_key" ON "TriggerConfig"("workflow");

-- CreateIndex
CREATE INDEX "ReferenceImage_workflow_idx" ON "ReferenceImage"("workflow");

-- CreateIndex
CREATE INDEX "ClipQueueItem_sessionId_idx" ON "ClipQueueItem"("sessionId");

-- CreateIndex
CREATE INDEX "ClipQueueItem_status_idx" ON "ClipQueueItem"("status");

-- AddForeignKey
ALTER TABLE "ClipQueueItem" ADD CONSTRAINT "ClipQueueItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
