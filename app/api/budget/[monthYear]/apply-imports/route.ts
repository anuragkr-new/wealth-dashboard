import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMonthYear } from "@/lib/utils";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ monthYear: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const { monthYear } = await params;
  const parsed = parseMonthYear(monthYear);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid monthYear" }, { status: 400 });
  }
  const { year, month } = parsed;

  const plan = await prisma.monthlyPlan.findUnique({
    where: {
      userId_month_year: { userId, month, year },
    },
    include: { expenseItems: true },
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  await prisma.$transaction(async (tx) => {
    for (const item of plan.expenseItems) {
      const agg = await tx.expenseImportLine.aggregate({
        where: {
          userId,
          expenseItemId: item.id,
          kind: "EXPENSE",
          amount: { gt: 0 },
          txnDate: { gte: start, lte: end },
        },
        _sum: { amount: true },
      });
      const sum = agg._sum.amount ?? 0;
      await tx.expenseItem.update({
        where: { id: item.id },
        data: { actualAmount: sum },
      });
    }
  });

  const updated = await prisma.monthlyPlan.findUnique({
    where: { id: plan.id },
    include: { expenseItems: true },
  });

  return NextResponse.json(updated);
}
