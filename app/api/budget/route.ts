import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
    where: { month_year: { month, year } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Plan already exists for this month" },
      { status: 409 }
    );
  }

  const plan = await prisma.monthlyPlan.create({
    data: {
      month,
      year,
      plannedIncome: Number(plannedIncome),
      expenseItems: {
        create: expenseItems.map((e) => ({
          label: e.label,
          plannedAmount: Number(e.plannedAmount),
        })),
      },
    },
    include: { expenseItems: true },
  });

  return NextResponse.json(plan);
}
