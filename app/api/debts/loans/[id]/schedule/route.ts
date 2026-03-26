import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entries = await prisma.loanScheduleEntry.findMany({
    where: { loanId: id },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  return NextResponse.json(entries);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { entries, replace } = body as {
    entries: Array<{
      month: number;
      year: number;
      emiAmount: number;
      principalComponent: number;
      interestComponent: number;
      outstandingBalance: number;
    }>;
    replace?: boolean;
  };

  if (!Array.isArray(entries) || !entries.length) {
    return NextResponse.json(
      { error: "entries array required" },
      { status: 400 }
    );
  }

  const existing = await prisma.loanScheduleEntry.count({
    where: { loanId: id },
  });
  if (existing && !replace) {
    return NextResponse.json(
      { error: "Schedule exists; send replace: true to overwrite" },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.loanScheduleEntry.deleteMany({ where: { loanId: id } });
    }
    await tx.loanScheduleEntry.createMany({
      data: entries.map((e) => ({
        loanId: id,
        month: e.month,
        year: e.year,
        emiAmount: e.emiAmount,
        principalComponent: e.principalComponent,
        interestComponent: e.interestComponent,
        outstandingBalance: e.outstandingBalance,
      })),
    });
  });

  return NextResponse.json({ ok: true, count: entries.length });
}
