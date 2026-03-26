import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, categoryId, value, notes } = body;
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
  const { id } = await params;
  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
