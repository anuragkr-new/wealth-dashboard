import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMonthYear } from "@/lib/utils";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(
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
  const plan = await prisma.monthlyPlan.findUnique({
    where: {
      userId_month_year: {
        userId,
        month: parsed.month,
        year: parsed.year,
      },
    },
    include: {
      expenseItems: true,
      liquidityAccounts: true,
      liquidityReceivables: true,
      liquidityExpenses: true,
    },
  });
  if (!plan) {
    return NextResponse.json(null);
  }
  return NextResponse.json(plan);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ monthYear: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const { monthYear } = await params;
  const parsed = parseMonthYear(monthYear);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid monthYear" }, { status: 400 });
  }

  const plan = await prisma.monthlyPlan.findUnique({
    where: {
      userId_month_year: {
        userId,
        month: parsed.month,
        year: parsed.year,
      },
    },
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    plannedIncome,
    actualIncome,
    expenseItems,
    liquidityAccounts,
    liquidityReceivables,
    liquidityExpenses,
  } = body as {
    plannedIncome?: number;
    actualIncome?: number | null;
    expenseItems?: Array<{
      id?: string;
      label: string;
      plannedAmount: number;
      actualAmount?: number | null;
    }>;
    liquidityAccounts?: Array<{
      id?: string;
      label: string;
      amount: number;
    }>;
    liquidityReceivables?: Array<{
      id?: string;
      label: string;
      amount: number;
    }>;
    liquidityExpenses?: Array<{
      id?: string;
      label: string;
      amount: number;
    }>;
  };

  await prisma.$transaction(async (tx) => {
    await tx.monthlyPlan.update({
      where: { id: plan.id },
      data: {
        ...(plannedIncome != null && { plannedIncome: Number(plannedIncome) }),
        ...(actualIncome !== undefined && {
          actualIncome:
            actualIncome === null ? null : Number(actualIncome),
        }),
      },
    });

    if (expenseItems) {
      const existing = await tx.expenseItem.findMany({
        where: { planId: plan.id },
      });
      const incomingIds = new Set(
        expenseItems.filter((e) => e.id).map((e) => e.id as string)
      );
      const toDelete = existing.filter((e) => !incomingIds.has(e.id));
      for (const d of toDelete) {
        await tx.expenseItem.delete({ where: { id: d.id } });
      }
      for (const item of expenseItems) {
        if (item.id) {
          await tx.expenseItem.update({
            where: { id: item.id },
            data: {
              label: item.label,
              plannedAmount: Number(item.plannedAmount),
              ...(item.actualAmount !== undefined && {
                actualAmount:
                  item.actualAmount === null
                    ? null
                    : Number(item.actualAmount),
              }),
            },
          });
        } else {
          await tx.expenseItem.create({
            data: {
              planId: plan.id,
              label: item.label,
              plannedAmount: Number(item.plannedAmount),
              actualAmount:
                item.actualAmount == null ? null : Number(item.actualAmount),
            },
          });
        }
      }
    }

    if (liquidityAccounts) {
      const existing = await tx.liquidityAccount.findMany({
        where: { planId: plan.id },
      });
      const incomingIds = new Set(
        liquidityAccounts.filter((e) => e.id).map((e) => e.id as string)
      );
      const toDelete = existing.filter((e) => !incomingIds.has(e.id));
      for (const d of toDelete) {
        await tx.liquidityAccount.delete({ where: { id: d.id } });
      }
      for (const item of liquidityAccounts) {
        if (item.id) {
          await tx.liquidityAccount.update({
            where: { id: item.id },
            data: {
              label: item.label,
              amount: Number(item.amount) || 0,
            },
          });
        } else {
          await tx.liquidityAccount.create({
            data: {
              planId: plan.id,
              label: item.label,
              amount: Number(item.amount) || 0,
            },
          });
        }
      }
    }

    if (liquidityReceivables) {
      const existing = await tx.liquidityReceivable.findMany({
        where: { planId: plan.id },
      });
      const incomingIds = new Set(
        liquidityReceivables.filter((e) => e.id).map((e) => e.id as string)
      );
      const toDelete = existing.filter((e) => !incomingIds.has(e.id));
      for (const d of toDelete) {
        await tx.liquidityReceivable.delete({ where: { id: d.id } });
      }
      for (const item of liquidityReceivables) {
        if (item.id) {
          await tx.liquidityReceivable.update({
            where: { id: item.id },
            data: {
              label: item.label,
              amount: Number(item.amount) || 0,
            },
          });
        } else {
          await tx.liquidityReceivable.create({
            data: {
              planId: plan.id,
              label: item.label,
              amount: Number(item.amount) || 0,
            },
          });
        }
      }
    }

    if (liquidityExpenses) {
      const existing = await tx.liquidityExpense.findMany({
        where: { planId: plan.id },
      });
      const incomingIds = new Set(
        liquidityExpenses.filter((e) => e.id).map((e) => e.id as string)
      );
      const toDelete = existing.filter((e) => !incomingIds.has(e.id));
      for (const d of toDelete) {
        await tx.liquidityExpense.delete({ where: { id: d.id } });
      }
      for (const item of liquidityExpenses) {
        if (item.id) {
          await tx.liquidityExpense.update({
            where: { id: item.id },
            data: {
              label: item.label,
              amount: Number(item.amount) || 0,
            },
          });
        } else {
          await tx.liquidityExpense.create({
            data: {
              planId: plan.id,
              label: item.label,
              amount: Number(item.amount) || 0,
            },
          });
        }
      }
    }
  });

  const updated = await prisma.monthlyPlan.findUnique({
    where: { id: plan.id },
    include: {
      expenseItems: true,
      liquidityAccounts: true,
      liquidityReceivables: true,
      liquidityExpenses: true,
    },
  });
  return NextResponse.json(updated);
}
