import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const assets = await prisma.asset.findMany({
    where: { category: { userId } },
    include: { category: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(assets);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const body = await req.json();
  const { name, categoryId, value, notes } = body;
  if (!name || categoryId == null || value == null) {
    return NextResponse.json(
      { error: "name, categoryId, and value are required" },
      { status: 400 }
    );
  }
  const cat = await prisma.assetCategory.findFirst({
    where: { id: categoryId, userId },
  });
  if (!cat) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
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
