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
  const { name, icon, growthRate } = body;

  const existing = await prisma.assetCategory.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cat = await prisma.assetCategory.update({
    where: { id },
    data: {
      ...(name != null && { name }),
      ...(icon !== undefined && { icon }),
      ...(growthRate != null && { growthRate: Number(growthRate) }),
    },
  });
  return NextResponse.json(cat);
}
