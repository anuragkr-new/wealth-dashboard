import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleOutstandingAsOf } from "@/lib/loans";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;

  const [loans, ccAgg] = await Promise.all([
    prisma.loan.findMany({ include: { scheduleEntries: true } }),
    prisma.creditCardDebt.aggregate({ _sum: { outstanding: true } }),
  ]);

  let totalLoanOutstanding = 0;
  for (const loan of loans) {
    totalLoanOutstanding += scheduleOutstandingAsOf(
      loan.scheduleEntries,
      cy,
      cm
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
