import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleOutstandingAsOf } from "@/lib/loans";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId();
  // #region agent log
  fetch('http://127.0.0.1:7439/ingest/1dc070df-a61f-458e-8ec9-144680a2ac1b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'553583'},body:JSON.stringify({sessionId:'553583',runId:'initial',hypothesisId:'H3',location:'app/api/debts/summary/route.ts:GET',message:'Debts summary auth check',data:{authorized:!!userId},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
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
