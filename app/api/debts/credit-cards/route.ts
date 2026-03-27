import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId();
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
