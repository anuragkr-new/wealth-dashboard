import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  computeForecast,
  computeMilestoneTrajectory,
  resolveDefaultMonthlySaving,
  resolveMonthlyMutualFundInvestment,
} from "@/lib/forecast";
import { monthsBetween } from "@/lib/utils";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const active = await prisma.milestone.findFirst({
    where: { userId, status: "active" },
  });
  if (!active) {
    return NextResponse.json({ error: "No active milestone" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const override = searchParams.get("monthlyNetSaving");
  const [monthlyNetSaving, monthlyMutualFundFromBudget] = await Promise.all([
    override != null
      ? Promise.resolve(Number(override))
      : resolveDefaultMonthlySaving(userId),
    resolveMonthlyMutualFundInvestment(userId),
  ]);

  const saving = Number.isFinite(monthlyNetSaving) ? monthlyNetSaving : 0;

  const trajectory = await computeMilestoneTrajectory({
    userId,
    targetAmount: active.targetAmount,
    targetDate: active.targetDate,
    monthlyNetSaving: saving,
    monthlyMutualFundInvestment: monthlyMutualFundFromBudget,
  });

  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  const ty = active.targetDate.getFullYear();
  const tm = active.targetDate.getMonth() + 1;
  const delta = monthsBetween(cy, cm, ty, tm);
  const horizon = Math.max(60, delta + 6, 12);

  const chartPoints = await computeForecast({
    userId,
    horizonMonths: horizon,
    monthlyNetSaving: saving,
    monthlyMutualFundInvestment: monthlyMutualFundFromBudget,
    includeCurrentMonth: true,
  });

  return NextResponse.json({
    ...trajectory,
    monthlyNetSaving: saving,
    monthlyMutualFundFromBudget,
    chartPoints,
    milestone: active,
  });
}
