import { NextResponse } from "next/server";
import {
  computeForecast,
  resolveDefaultMonthlySaving,
  resolveMonthlyMutualFundInvestment,
} from "@/lib/forecast";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const { searchParams } = new URL(req.url);
  const override = searchParams.get("monthlyNetSaving");

  const [monthlyNetSaving, monthlyMutualFundFromBudget] = await Promise.all([
    override != null
      ? Promise.resolve(Number(override))
      : resolveDefaultMonthlySaving(userId),
    resolveMonthlyMutualFundInvestment(userId),
  ]);

  const saving = Number.isFinite(monthlyNetSaving) ? monthlyNetSaving : 0;

  const points = await computeForecast({
    userId,
    horizonMonths: 12,
    monthlyNetSaving: saving,
    monthlyMutualFundInvestment: monthlyMutualFundFromBudget,
  });

  return NextResponse.json({
    monthlyNetSaving: saving,
    monthlyMutualFundFromBudget,
    points,
  });
}
