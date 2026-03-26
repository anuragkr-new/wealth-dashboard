import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const milestones = await prisma.milestone.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(milestones);
}

export async function POST(req: Request) {
  const active = await prisma.milestone.findFirst({
    where: { status: "active" },
  });
  if (active) {
    return NextResponse.json(
      { error: "An active milestone already exists" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const { name, targetAmount, targetDate } = body;
  if (!name || targetAmount == null || !targetDate) {
    return NextResponse.json(
      { error: "name, targetAmount, targetDate required" },
      { status: 400 }
    );
  }

  const ms = await prisma.milestone.create({
    data: {
      name,
      targetAmount: Number(targetAmount),
      targetDate: new Date(targetDate),
      status: "active",
    },
  });
  return NextResponse.json(ms);
}
