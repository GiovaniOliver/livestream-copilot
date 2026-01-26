-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "workflow" TEXT NOT NULL,
    "captureMode" TEXT NOT NULL,
    "title" TEXT,
    "participants" TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "ts" BIGINT NOT NULL,
    "traceId" TEXT,
    "spanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Output" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "refs" TEXT[],
    "meta" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Output_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clip" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "t0" DOUBLE PRECISION NOT NULL,
    "t1" DOUBLE PRECISION NOT NULL,
    "thumbnailId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_sessionId_idx" ON "Event"("sessionId");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Output_sessionId_idx" ON "Output"("sessionId");

-- CreateIndex
CREATE INDEX "Output_category_idx" ON "Output"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Clip_artifactId_key" ON "Clip"("artifactId");

-- CreateIndex
CREATE INDEX "Clip_sessionId_idx" ON "Clip"("sessionId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Output" ADD CONSTRAINT "Output_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
