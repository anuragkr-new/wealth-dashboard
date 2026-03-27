import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertCurrentWealthSnapshot } from "@/lib/snapshot";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const snaps = await prisma.wealthSnapshot.findMany({
    where: { userId },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  return NextResponse.json(snaps);
}

export async function POST() {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const snap = await upsertCurrentWealthSnapshot(userId);
  return NextResponse.json(snap);
}
