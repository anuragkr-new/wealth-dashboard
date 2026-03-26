import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loanRepaidPercent, scheduleOutstandingAsOf } from "@/lib/loans";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;

  const loans = await prisma.loan.findMany({
    include: { scheduleEntries: true },
    orderBy: { createdAt: "desc" },
  });

  const enriched = loans.map((loan) => {
    const currentOutstanding = scheduleOutstandingAsOf(
      loan.scheduleEntries,
      cy,
      cm
    );
    return {
      ...loan,
      currentOutstanding,
      repaidPercent: loanRepaidPercent(loan, loan.scheduleEntries, cy, cm),
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    name,
    lender,
    principalAmount,
    interestRate,
    tenureMonths,
    startDate,
    emiAmount,
    notes,
  } = body;
  if (
    !name ||
    principalAmount == null ||
    interestRate == null ||
    tenureMonths == null ||
    !startDate ||
    emiAmount == null
  ) {
    return NextResponse.json(
      { error: "Missing required loan fields" },
      { status: 400 }
    );
  }
  const loan = await prisma.loan.create({
    data: {
      name,
      lender: lender ?? null,
      principalAmount: Number(principalAmount),
      interestRate: Number(interestRate),
      tenureMonths: Number(tenureMonths),
      startDate: new Date(startDate),
      emiAmount: Number(emiAmount),
      notes: notes ?? null,
    },
  });
  return NextResponse.json(loan);
}
