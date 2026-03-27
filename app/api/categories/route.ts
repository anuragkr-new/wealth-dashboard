import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const categories = await prisma.assetCategory.findMany({
    where: { userId },
    include: {
      assets: true,
    },
    orderBy: { name: "asc" },
  });
  const withTotals = categories.map((c) => ({
    ...c,
    totalValue: c.assets.reduce((s, a) => s + a.value, 0),
  }));
  return NextResponse.json(withTotals);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const body = await req.json();
  const { name, icon, growthRate } = body;
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const cat = await prisma.assetCategory.create({
    data: {
      userId,
      name,
      icon: icon ?? null,
      growthRate: growthRate != null ? Number(growthRate) : 0,
    },
  });
  return NextResponse.json(cat);
}
