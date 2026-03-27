import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const { id } = await params;
  const ms = await prisma.milestone.findFirst({
    where: { id, userId, status: "active" },
  });
  if (!ms) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.milestone.update({
    where: { id },
    data: {
      status: "achieved",
      achievedAt: new Date(),
    },
  });
  return NextResponse.json(updated);
}
