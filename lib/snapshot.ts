import { prisma } from "./prisma";
import { calculateNetWorth } from "./networth";

export async function upsertCurrentWealthSnapshot(asOf: Date = new Date()) {
  const month = asOf.getMonth() + 1;
  const year = asOf.getFullYear();
  const { grossAssets, totalLiabilities, netWorth } =
    await calculateNetWorth(asOf);

  return prisma.wealthSnapshot.upsert({
    where: {
      month_year: { month, year },
    },
    create: {
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
