import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const logs = await prisma.deviationLog.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const withBreakdown = await Promise.all(
    logs.map(async (log) => {
      const plan = await prisma.monthlyPlan.findUnique({
        where: {
          userId_month_year: {
            userId,
            month: log.month,
            year: log.year,
          },
        },
        include: { expenseItems: true },
      });
      const items =
        plan?.expenseItems.map((e) => ({
          label: e.label,
          planned: e.plannedAmount,
          actual: e.actualAmount ?? 0,
          deviation: (e.actualAmount ?? 0) - e.plannedAmount,
        })) ?? [];
      return { ...log, expenseBreakdown: items };
    })
  );

  return NextResponse.json(withBreakdown);
}
