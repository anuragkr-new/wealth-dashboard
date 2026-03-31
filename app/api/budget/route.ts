import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
const DEFAULT_FIXED_EXPENSES = [
  "Rent + Maid + Cook",
  "Groceries",
  "EMI",
];

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const body = await req.json();
  const { month, year, plannedIncome, expenseItems } = body as {
    month: number;
    year: number;
    plannedIncome: number;
    expenseItems: { label: string; plannedAmount: number }[];
  };

  if (
    month == null ||
    year == null ||
    plannedIncome == null ||
    !Array.isArray(expenseItems)
  ) {
    return NextResponse.json(
      { error: "month, year, plannedIncome, expenseItems required" },
      { status: 400 }
    );
  }

  const existing = await prisma.monthlyPlan.findUnique({
    where: {
      userId_month_year: { userId, month, year },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Plan already exists for this month" },
      { status: 409 }
    );
  }

  const plan = await prisma.monthlyPlan.create({
    data: {
      userId,
      month,
      year,
      plannedIncome: Number(plannedIncome),
      expenseItems: {
        create: expenseItems.map((e) => ({
          label: e.label,
          plannedAmount: Number(e.plannedAmount),
        })),
      },
      liquidityExpenses: {
        create: DEFAULT_FIXED_EXPENSES.map((label) => ({
          label,
          amount: 0,
          kind: "FIXED" as const,
        })),
      },
    },
    include: {
      expenseItems: true,
      liquidityAccounts: true,
      liquidityReceivables: true,
      liquidityExpenses: true,
    },
  });

  return NextResponse.json(plan);
}
