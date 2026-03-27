import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const { id } = await params;
  const existing = await prisma.creditCardDebt.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { outstanding } = body;
  if (outstanding == null) {
    return NextResponse.json({ error: "outstanding required" }, { status: 400 });
  }
  const card = await prisma.creditCardDebt.update({
    where: { id },
    data: { outstanding: Number(outstanding) },
  });
  return NextResponse.json(card);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const { id } = await params;
  const existing = await prisma.creditCardDebt.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.creditCardDebt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
