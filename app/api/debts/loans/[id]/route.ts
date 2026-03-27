import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const { id } = await params;
  const loan = await prisma.loan.findFirst({ where: { id, userId } });
  if (!loan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.loan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
