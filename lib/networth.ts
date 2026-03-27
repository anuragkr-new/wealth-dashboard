import { prisma } from "./prisma";
import { scheduleOutstandingAsOf } from "./loans";

export type NetWorthResult = {
  grossAssets: number;
  totalLiabilities: number;
  netWorth: number;
};

export async function calculateNetWorth(
  userId: string,
  asOf: Date = new Date()
): Promise<NetWorthResult> {
  const cy = asOf.getFullYear();
  const cm = asOf.getMonth() + 1;

  const assetAgg = await prisma.asset.aggregate({
    where: { category: { userId } },
    _sum: { value: true },
  });
  const grossAssets = assetAgg._sum.value ?? 0;

  const loans = await prisma.loan.findMany({
    where: { userId },
    include: { scheduleEntries: true },
  });

  let loanOutstanding = 0;
  for (const loan of loans) {
    loanOutstanding += scheduleOutstandingAsOf(
      loan.scheduleEntries,
      cy,
      cm,
      loan.principalAmount
    );
  }

  const ccAgg = await prisma.creditCardDebt.aggregate({
    where: { userId },
    _sum: { outstanding: true },
  });
  const totalCredit = ccAgg._sum.outstanding ?? 0;

  const totalLiabilities = loanOutstanding + totalCredit;
  return {
    grossAssets,
    totalLiabilities,
    netWorth: grossAssets - totalLiabilities,
  };
}
