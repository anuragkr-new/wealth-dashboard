import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const { id } = await params;
  const body = await req.json();
  const expenseItemId = body.expenseItemId as string | null | undefined;

  const line = await prisma.expenseImportLine.findFirst({
    where: { id, userId },
  });
  if (!line) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (expenseItemId === undefined) {
    return NextResponse.json({ error: "expenseItemId required" }, { status: 400 });
  }

  if (expenseItemId === null) {
    await prisma.expenseImportLine.update({
      where: { id },
      data: { expenseItemId: null },
    });
    return NextResponse.json({ ok: true });
  }

  const item = await prisma.expenseItem.findFirst({
    where: { id: expenseItemId, plan: { userId } },
  });
  if (!item) {
    return NextResponse.json({ error: "Invalid expense line" }, { status: 400 });
  }

  await prisma.expenseImportLine.update({
    where: { id },
    data: { expenseItemId },
  });

  return NextResponse.json({ ok: true });
}
