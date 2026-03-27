-- DropTable
DROP TABLE IF EXISTS "IntegrationState";

-- DropIndex
DROP INDEX IF EXISTS "Asset_source_externalKey_key";

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "source";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "externalKey";
