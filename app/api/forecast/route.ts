import { NextResponse } from "next/server";
import { computeForecast, resolveDefaultMonthlySaving } from "@/lib/forecast";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const override = searchParams.get("monthlyNetSaving");
  const monthlyNetSaving =
    override != null
      ? Number(override)
      : await resolveDefaultMonthlySaving();

  const points = await computeForecast({
    horizonMonths: 12,
    monthlyNetSaving: Number.isFinite(monthlyNetSaving) ? monthlyNetSaving : 0,
  });

  return NextResponse.json({ monthlyNetSaving, points });
}
