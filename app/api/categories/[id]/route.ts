import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, icon, growthRate } = body;
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
