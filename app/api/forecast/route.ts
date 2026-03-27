import { NextResponse } from "next/server";
import {
  computeForecast,
  resolveDefaultMonthlySaving,
  resolveMonthlyMutualFundInvestment,
} from "@/lib/forecast";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const override = searchParams.get("monthlyNetSaving");

  const [monthlyNetSaving, monthlyMutualFundFromBudget] = await Promise.all([
    override != null
      ? Promise.resolve(Number(override))
      : resolveDefaultMonthlySaving(),
    resolveMonthlyMutualFundInvestment(),
  ]);

  const saving = Number.isFinite(monthlyNetSaving) ? monthlyNetSaving : 0;

  const points = await computeForecast({
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
