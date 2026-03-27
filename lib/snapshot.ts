import { prisma } from "./prisma";
import { calculateNetWorth } from "./networth";

export async function upsertCurrentWealthSnapshot(
  userId: string,
  asOf: Date = new Date()
) {
  const month = asOf.getMonth() + 1;
  const year = asOf.getFullYear();
  const { grossAssets, totalLiabilities, netWorth } = await calculateNetWorth(
    userId,
    asOf
  );

  return prisma.wealthSnapshot.upsert({
    where: {
      userId_month_year: { userId, month, year },
    },
    create: {
      userId,
      month,
      year,
      grossAssets,
      totalLiabilities,
      totalNetWorth: netWorth,
    },
    update: {
      grossAssets,
      totalLiabilities,
      totalNetWorth: netWorth,
    },
  });
}
