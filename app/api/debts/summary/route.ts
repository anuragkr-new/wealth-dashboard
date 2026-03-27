import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleOutstandingAsOf } from "@/lib/loans";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;

  const [loans, ccAgg] = await Promise.all([
    prisma.loan.findMany({
      where: { userId },
      include: { scheduleEntries: true },
    }),
    prisma.creditCardDebt.aggregate({
      where: { userId },
      _sum: { outstanding: true },
    }),
  ]);

  let totalLoanOutstanding = 0;
  for (const loan of loans) {
    totalLoanOutstanding += scheduleOutstandingAsOf(
      loan.scheduleEntries,
      cy,
      cm,
      loan.principalAmount
    );
  }

  const totalCreditCard = ccAgg._sum.outstanding ?? 0;
  const totalLiabilities = totalLoanOutstanding + totalCreditCard;

  return NextResponse.json({
    totalLoanOutstanding,
    totalCreditCard,
    totalLiabilities,
  });
}
