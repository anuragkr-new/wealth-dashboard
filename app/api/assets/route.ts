import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const assets = await prisma.asset.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(assets);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, categoryId, value, notes } = body;
  if (!name || categoryId == null || value == null) {
    return NextResponse.json(
      { error: "name, categoryId, and value are required" },
      { status: 400 }
    );
  }
  const asset = await prisma.asset.create({
    data: {
      name,
      categoryId,
      value: Number(value),
      notes: notes ?? null,
    },
    include: { category: true },
  });
  return NextResponse.json(asset);
}
