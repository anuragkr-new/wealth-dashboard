import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const cards = await prisma.creditCardDebt.findMany({
    orderBy: { cardName: "asc" },
  });
  return NextResponse.json(cards);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { cardName, outstanding } = body;
  if (!cardName || outstanding == null) {
    return NextResponse.json(
      { error: "cardName and outstanding required" },
      { status: 400 }
    );
  }
  const card = await prisma.creditCardDebt.create({
    data: { cardName, outstanding: Number(outstanding) },
  });
  return NextResponse.json(card);
}
