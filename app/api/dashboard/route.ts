import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateNetWorth } from "@/lib/networth";
import {
  computeMilestoneTrajectory,
  resolveDefaultMonthlySaving,
  resolveMonthlyMutualFundInvestment,
} from "@/lib/forecast";
import { upsertCurrentWealthSnapshot } from "@/lib/snapshot";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  await upsertCurrentWealthSnapshot(userId, now);

  const [
    networth,
    categories,
    snapshots,
    activeMilestone,
    plan,
    prevSnap,
    monthlyNetSaving,
    monthlyMutualFundFromBudget,
  ] = await Promise.all([
    calculateNetWorth(userId, now),
    prisma.assetCategory.findMany({
      where: { userId },
      include: { assets: true },
      orderBy: { name: "asc" },
    }),
    prisma.wealthSnapshot.findMany({
      where: { userId },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.milestone.findFirst({
      where: { userId, status: "active" },
    }),
    prisma.monthlyPlan.findUnique({
      where: { userId_month_year: { userId, month, year } },
      include: { expenseItems: true },
    }),
    prisma.wealthSnapshot.findFirst({
      where: {
        userId,
        OR: [
          { year: { lt: year } },
          { AND: [{ year }, { month: { lt: month } }] },
        ],
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    resolveDefaultMonthlySaving(userId),
    resolveMonthlyMutualFundInvestment(userId),
  ]);

  let milestoneInsight: {
    projectedHitDate: string | null;
    onTrack: boolean;
    gap: number;
    projectedValueAtTargetDate: number;
  } | null = null;

  if (activeMilestone) {
    milestoneInsight = await computeMilestoneTrajectory({
      userId,
      targetAmount: activeMilestone.targetAmount,
      targetDate: activeMilestone.targetDate,
      monthlyNetSaving,
      monthlyMutualFundInvestment: monthlyMutualFundFromBudget,
    });
  }

  const catsWithPct = categories.map((c) => {
    const total = c.assets.reduce((s, a) => s + a.value, 0);
    const pct =
      networth.grossAssets > 0 ? (total / networth.grossAssets) * 100 : 0;
    return { ...c, categoryTotal: total, pctOfGross: pct };
  });

  let budgetSummary: {
    plannedNetSaving: number;
    actualNetSaving: number | null;
    deviation: number | null;
  } | null = null;

  if (plan) {
    const plannedExp = plan.expenseItems.reduce((s, e) => s + e.plannedAmount, 0);
    const plannedNetSaving = plan.plannedIncome - plannedExp;
    const actualExp = plan.expenseItems.every((e) => e.actualAmount != null)
      ? plan.expenseItems.reduce((s, e) => s + (e.actualAmount ?? 0), 0)
      : null;
    const actualNetSaving =
      plan.actualIncome != null && actualExp != null
        ? plan.actualIncome - actualExp
        : null;
    const deviation =
      actualNetSaving != null
        ? actualNetSaving - plannedNetSaving
        : null;
    budgetSummary = { plannedNetSaving, actualNetSaving, deviation };
  }

  const prevNet = prevSnap?.totalNetWorth ?? null;
  const trendVsLast =
    prevNet != null ? networth.netWorth - prevNet : null;

  return NextResponse.json({
    networth,
    categories: catsWithPct,
    snapshots,
    activeMilestone,
    milestoneInsight,
    budgetSummary,
    trendVsLast,
    month,
    year,
  });
}
