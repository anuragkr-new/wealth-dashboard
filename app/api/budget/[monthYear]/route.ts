import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMonthYear } from "@/lib/utils";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
const DEFAULT_FIXED_EXPENSES = [
  "Rent + Maid + Cook",
  "Groceries",
  "EMI",
];

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
      liquidityDebts: true,
    },
  });
  if (!plan) {
    return NextResponse.json(null);
  }
  if (!plan.liquidityExpenses.some((e) => e.kind === "FIXED")) {
    await prisma.liquidityExpense.createMany({
      data: DEFAULT_FIXED_EXPENSES.map((label) => ({
        planId: plan.id,
        label,
        amount: 0,
        kind: "FIXED",
      })),
    });
  }
  const hydratedPlan = await prisma.monthlyPlan.findUnique({
    where: { id: plan.id },
    include: {
      expenseItems: true,
      liquidityAccounts: true,
      liquidityReceivables: true,
      liquidityExpenses: true,
      liquidityDebts: true,
    },
  });
  if (!hydratedPlan) {
    return NextResponse.json(null);
  }
  const fixedExpenses = hydratedPlan.liquidityExpenses.filter(
    (e) => e.kind === "FIXED"
  );
  const variableExpenses = hydratedPlan.liquidityExpenses.filter(
    (e) => e.kind === "VARIABLE"
  );
  return NextResponse.json({
    ...hydratedPlan,
    fixedExpenses,
    variableExpenses,
  });
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
    liquidityDebts,
    fixedExpenses,
    variableExpenses,
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
    liquidityDebts?: Array<{
      id?: string;
      label: string;
      amount: number;
    }>;
    fixedExpenses?: Array<{
      id?: string;
      label: string;
      amount: number;
    }>;
    variableExpenses?: Array<{
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

    if (liquidityDebts) {
      const existing = await tx.liquidityDebt.findMany({
        where: { planId: plan.id },
      });
      const incomingIds = new Set(
        liquidityDebts.filter((e) => e.id).map((e) => e.id as string)
      );
      const toDelete = existing.filter((e) => !incomingIds.has(e.id));
      for (const d of toDelete) {
        await tx.liquidityDebt.delete({ where: { id: d.id } });
      }
      for (const item of liquidityDebts) {
        if (item.id) {
          await tx.liquidityDebt.update({
            where: { id: item.id },
            data: {
              label: item.label,
              amount: Number(item.amount) || 0,
            },
          });
        } else {
          await tx.liquidityDebt.create({
            data: {
              planId: plan.id,
              label: item.label,
              amount: Number(item.amount) || 0,
            },
          });
        }
      }
    }

    if (fixedExpenses || variableExpenses) {
      const incoming = [
        ...(fixedExpenses ?? []).map((e) => ({ ...e, kind: "FIXED" as const })),
        ...(variableExpenses ?? []).map((e) => ({
          ...e,
          kind: "VARIABLE" as const,
        })),
      ];
      const existing = await tx.liquidityExpense.findMany({
        where: { planId: plan.id },
      });
      const incomingIds = new Set(
        incoming.filter((e) => e.id).map((e) => e.id as string)
      );
      const toDelete = existing.filter((e) => !incomingIds.has(e.id));
      for (const d of toDelete) {
        await tx.liquidityExpense.delete({ where: { id: d.id } });
      }
      for (const item of incoming) {
        if (item.id) {
          await tx.liquidityExpense.update({
            where: { id: item.id },
            data: {
              label: item.label,
              amount: Number(item.amount) || 0,
              kind: item.kind,
            },
          });
        } else {
          await tx.liquidityExpense.create({
            data: {
              planId: plan.id,
              label: item.label,
              amount: Number(item.amount) || 0,
              kind: item.kind,
            },
          });
        }
      }
    }
  });

  // Backfill default fixed rows if plan has none (older months/plans).
  const fixedCount = await prisma.liquidityExpense.count({
    where: { planId: plan.id, kind: "FIXED" },
  });
  if (fixedCount === 0) {
    await prisma.liquidityExpense.createMany({
      data: DEFAULT_FIXED_EXPENSES.map((label) => ({
        planId: plan.id,
        label,
        amount: 0,
        kind: "FIXED",
      })),
    });
  }

  const updated = await prisma.monthlyPlan.findUnique({
    where: { id: plan.id },
    include: {
      expenseItems: true,
      liquidityAccounts: true,
      liquidityReceivables: true,
      liquidityExpenses: true,
      liquidityDebts: true,
    },
  });
  if (!updated) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json({
    ...updated,
    fixedExpenses: updated.liquidityExpenses.filter((e) => e.kind === "FIXED"),
    variableExpenses: updated.liquidityExpenses.filter(
      (e) => e.kind === "VARIABLE"
    ),
  });
}
