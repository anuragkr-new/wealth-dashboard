import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId();
  // #region agent log
  fetch('http://127.0.0.1:7439/ingest/1dc070df-a61f-458e-8ec9-144680a2ac1b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'553583'},body:JSON.stringify({sessionId:'553583',runId:'initial',hypothesisId:'H3',location:'app/api/debts/credit-cards/route.ts:GET',message:'Credit cards auth check',data:{authorized:!!userId},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!userId) return unauthorizedJson();

  const cards = await prisma.creditCardDebt.findMany({
    where: { userId },
    orderBy: { cardName: "asc" },
  });
  return NextResponse.json(cards);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const body = await req.json();
  const { cardName, outstanding } = body;
  if (!cardName || outstanding == null) {
    return NextResponse.json(
      { error: "cardName and outstanding required" },
      { status: 400 }
    );
  }
  const card = await prisma.creditCardDebt.create({
    data: {
      userId,
      cardName,
      outstanding: Number(outstanding),
    },
  });
  return NextResponse.json(card);
}
