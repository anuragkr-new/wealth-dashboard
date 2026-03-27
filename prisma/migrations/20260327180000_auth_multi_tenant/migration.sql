-- Auth.js tables
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- Placeholder user: existing rows are assigned here until users re-auth (you can delete after migrating accounts)
INSERT INTO "User" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
VALUES ('usr_legacy_data_migration', 'Legacy', 'legacy-data@wealth-dashboard.internal', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Tenant columns (nullable first)
ALTER TABLE "AssetCategory" ADD COLUMN "userId" TEXT;
UPDATE "AssetCategory" SET "userId" = 'usr_legacy_data_migration' WHERE "userId" IS NULL;
ALTER TABLE "AssetCategory" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "MonthlyPlan" ADD COLUMN "userId" TEXT;
UPDATE "MonthlyPlan" SET "userId" = 'usr_legacy_data_migration' WHERE "userId" IS NULL;
ALTER TABLE "MonthlyPlan" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "DeviationLog" ADD COLUMN "userId" TEXT;
UPDATE "DeviationLog" SET "userId" = 'usr_legacy_data_migration' WHERE "userId" IS NULL;
ALTER TABLE "DeviationLog" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "WealthSnapshot" ADD COLUMN "userId" TEXT;
UPDATE "WealthSnapshot" SET "userId" = 'usr_legacy_data_migration' WHERE "userId" IS NULL;
ALTER TABLE "WealthSnapshot" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Loan" ADD COLUMN "userId" TEXT;
UPDATE "Loan" SET "userId" = 'usr_legacy_data_migration' WHERE "userId" IS NULL;
ALTER TABLE "Loan" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "CreditCardDebt" ADD COLUMN "userId" TEXT;
UPDATE "CreditCardDebt" SET "userId" = 'usr_legacy_data_migration' WHERE "userId" IS NULL;
ALTER TABLE "CreditCardDebt" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Milestone" ADD COLUMN "userId" TEXT;
UPDATE "Milestone" SET "userId" = 'usr_legacy_data_migration' WHERE "userId" IS NULL;
ALTER TABLE "Milestone" ALTER COLUMN "userId" SET NOT NULL;

-- Drop old unique constraints / indexes
DROP INDEX IF EXISTS "AssetCategory_name_key";
DROP INDEX IF EXISTS "MonthlyPlan_month_year_key";
DROP INDEX IF EXISTS "DeviationLog_month_year_key";
DROP INDEX IF EXISTS "WealthSnapshot_month_year_key";

-- New composite uniques
CREATE UNIQUE INDEX "AssetCategory_userId_name_key" ON "AssetCategory"("userId", "name");
CREATE UNIQUE INDEX "MonthlyPlan_userId_month_year_key" ON "MonthlyPlan"("userId", "month", "year");
CREATE UNIQUE INDEX "DeviationLog_userId_month_year_key" ON "DeviationLog"("userId", "month", "year");
CREATE UNIQUE INDEX "WealthSnapshot_userId_month_year_key" ON "WealthSnapshot"("userId", "month", "year");

-- Foreign keys
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetCategory" ADD CONSTRAINT "AssetCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonthlyPlan" ADD CONSTRAINT "MonthlyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviationLog" ADD CONSTRAINT "DeviationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WealthSnapshot" ADD CONSTRAINT "WealthSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditCardDebt" ADD CONSTRAINT "CreditCardDebt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "AssetCategory_userId_idx" ON "AssetCategory"("userId");
CREATE INDEX "MonthlyPlan_userId_idx" ON "MonthlyPlan"("userId");
CREATE INDEX "DeviationLog_userId_idx" ON "DeviationLog"("userId");
CREATE INDEX "WealthSnapshot_userId_idx" ON "WealthSnapshot"("userId");
CREATE INDEX "Loan_userId_idx" ON "Loan"("userId");
CREATE INDEX "CreditCardDebt_userId_idx" ON "CreditCardDebt"("userId");
CREATE INDEX "Milestone_userId_idx" ON "Milestone"("userId");
CREATE INDEX "Asset_categoryId_idx" ON "Asset"("categoryId");
