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
  const body = await req.json();
  const { name, categoryId, value, notes } = body;

  const existing = await prisma.asset.findFirst({
    where: { id, category: { userId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (categoryId != null) {
    const cat = await prisma.assetCategory.findFirst({
      where: { id: categoryId, userId },
    });
    if (!cat) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
  }

  const asset = await prisma.asset.update({
    where: { id },
    data: {
      ...(name != null && { name }),
      ...(categoryId != null && { categoryId }),
      ...(value != null && { value: Number(value) }),
      ...(notes !== undefined && { notes }),
    },
    include: { category: true },
  });
  return NextResponse.json(asset);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const { id } = await params;
  const existing = await prisma.asset.findFirst({
    where: { id, category: { userId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
