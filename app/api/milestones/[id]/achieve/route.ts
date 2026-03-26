import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ms = await prisma.milestone.findUnique({ where: { id } });
  if (!ms || ms.status !== "active") {
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
