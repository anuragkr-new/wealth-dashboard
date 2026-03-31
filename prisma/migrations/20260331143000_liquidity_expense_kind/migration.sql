-- CreateEnum
CREATE TYPE "LiquidityExpenseKind" AS ENUM ('FIXED', 'VARIABLE');

-- AlterTable
ALTER TABLE "LiquidityExpense"
ADD COLUMN "kind" "LiquidityExpenseKind" NOT NULL DEFAULT 'VARIABLE';
