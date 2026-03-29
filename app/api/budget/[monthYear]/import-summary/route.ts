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
  const { year, month } = parsed;

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const grouped = await prisma.expenseImportLine.groupBy({
    by: ["expenseItemId"],
    where: {
      userId,
      kind: "EXPENSE",
      amount: { gt: 0 },
      txnDate: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });

  const byExpenseItemId: Record<string, number> = {};
  for (const g of grouped) {
    if (g.expenseItemId) {
      byExpenseItemId[g.expenseItemId] = g._sum.amount ?? 0;
    }
  }

  const unassignedWhere = {
    userId,
    kind: "EXPENSE" as const,
    amount: { gt: 0 },
    expenseItemId: null,
    txnDate: { gte: start, lte: end },
  };

  const unassigned = await prisma.expenseImportLine.aggregate({
    where: unassignedWhere,
    _sum: { amount: true },
  });

  const unassignedCount = await prisma.expenseImportLine.count({
    where: unassignedWhere,
  });

  const recentImports = await prisma.statementImport.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: {
      id: true,
      source: true,
      fileName: true,
      rowCount: true,
      inserted: true,
      skippedDup: true,
      createdAt: true,
    },
  });


  const unassignedLines = await prisma.expenseImportLine.findMany({
    where: unassignedWhere,
    orderBy: { txnDate: "desc" },
    take: 100,
    select: {
      id: true,
      amount: true,
      description: true,
      txnDate: true,
      source: true,
    },
  });

  return NextResponse.json({
    byExpenseItemId,
    unassignedLines,
    unassignedTotal: unassigned._sum.amount ?? 0,
    unassignedCount,
    recentImports,
  });
}
