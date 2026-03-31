-- CreateTable
CREATE TABLE "LiquidityAccount" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "LiquidityAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidityReceivable" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "LiquidityReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidityExpense" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "LiquidityExpense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiquidityAccount_planId_idx" ON "LiquidityAccount"("planId");
CREATE INDEX "LiquidityReceivable_planId_idx" ON "LiquidityReceivable"("planId");
CREATE INDEX "LiquidityExpense_planId_idx" ON "LiquidityExpense"("planId");

ALTER TABLE "LiquidityAccount" ADD CONSTRAINT "LiquidityAccount_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MonthlyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiquidityReceivable" ADD CONSTRAINT "LiquidityReceivable_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MonthlyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiquidityExpense" ADD CONSTRAINT "LiquidityExpense_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MonthlyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
