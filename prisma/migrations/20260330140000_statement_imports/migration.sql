-- CreateEnum
CREATE TYPE "StatementSource" AS ENUM ('PHONEPE', 'ICICI_BANK', 'CREDIT_CARD');

-- CreateEnum
CREATE TYPE "ImportedTxnKind" AS ENUM ('EXPENSE', 'TRANSFER', 'INCOME', 'IGNORE');

-- CreateTable
CREATE TABLE "StatementImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "StatementSource" NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "skippedDup" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatementImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseImportLine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "importId" TEXT,
    "txnDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "source" "StatementSource" NOT NULL,
    "kind" "ImportedTxnKind" NOT NULL DEFAULT 'EXPENSE',
    "dedupeKey" TEXT NOT NULL,
    "externalRef" TEXT,
    "expenseItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseImportLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StatementImport_userId_idx" ON "StatementImport"("userId");
CREATE INDEX "ExpenseImportLine_userId_txnDate_idx" ON "ExpenseImportLine"("userId", "txnDate");
CREATE INDEX "ExpenseImportLine_expenseItemId_idx" ON "ExpenseImportLine"("expenseItemId");
CREATE UNIQUE INDEX "ExpenseImportLine_userId_dedupeKey_key" ON "ExpenseImportLine"("userId", "dedupeKey");

ALTER TABLE "StatementImport" ADD CONSTRAINT "StatementImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseImportLine" ADD CONSTRAINT "ExpenseImportLine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseImportLine" ADD CONSTRAINT "ExpenseImportLine_importId_fkey" FOREIGN KEY ("importId") REFERENCES "StatementImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpenseImportLine" ADD CONSTRAINT "ExpenseImportLine_expenseItemId_fkey" FOREIGN KEY ("expenseItemId") REFERENCES "ExpenseItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
