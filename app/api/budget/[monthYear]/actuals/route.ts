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

  const existingLog = await prisma.deviationLog.findUnique({
    where: {
      userId_month_year: {
        userId,
        month: parsed.month,
        year: parsed.year,
      },
    },
  });
  if (existingLog) {
    return NextResponse.json(
      { error: "Deviation already logged for this month" },
      { status: 409 }
    );
  }

  const plan = await prisma.monthlyPlan.findUnique({
    where: {
      userId_month_year: {
        userId,
        month: parsed.month,
        year: parsed.year,
      },
    },
    include: { expenseItems: true },
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  if (plan.actualIncome == null) {
    return NextResponse.json(
      { error: "Fill actual income before locking" },
      { status: 400 }
    );
  }

  const missingActual = plan.expenseItems.some((e) => e.actualAmount == null);
  if (missingActual) {
    return NextResponse.json(
      { error: "Fill all expense actuals before locking" },
      { status: 400 }
    );
  }

  const plannedTotalExpense = plan.expenseItems.reduce(
    (s, e) => s + e.plannedAmount,
    0
  );
  const actualTotalExpense = plan.expenseItems.reduce(
    (s, e) => s + (e.actualAmount ?? 0),
    0
  );

  const plannedNetSaving = plan.plannedIncome - plannedTotalExpense;
  const actualNetSaving = (plan.actualIncome ?? 0) - actualTotalExpense;
  const overallDeviation = actualNetSaving - plannedNetSaving;

  const log = await prisma.deviationLog.create({
    data: {
      userId,
      month: parsed.month,
      year: parsed.year,
      plannedIncome: plan.plannedIncome,
      actualIncome: plan.actualIncome,
      plannedTotalExpense,
      actualTotalExpense,
      plannedNetSaving,
      actualNetSaving,
      overallDeviation,
    },
  });

  return NextResponse.json(log);
}
