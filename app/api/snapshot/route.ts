import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertCurrentWealthSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  const snaps = await prisma.wealthSnapshot.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  return NextResponse.json(snaps);
}

export async function POST() {
  const snap = await upsertCurrentWealthSnapshot();
  return NextResponse.json(snap);
}
