-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "externalKey" TEXT;

-- CreateTable
CREATE TABLE "IntegrationState" (
    "key" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationState_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_source_externalKey_key" ON "Asset"("source", "externalKey");
