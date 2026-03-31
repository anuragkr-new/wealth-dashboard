-- CreateTable
CREATE TABLE "LiquidityDebt" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "LiquidityDebt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiquidityDebt_planId_idx" ON "LiquidityDebt"("planId");

ALTER TABLE "LiquidityDebt" ADD CONSTRAINT "LiquidityDebt_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MonthlyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
