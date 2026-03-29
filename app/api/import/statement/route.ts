import { NextResponse } from "next/server";
import { StatementSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId, unauthorizedJson } from "@/lib/auth-helpers";
import {
  STATEMENT_MAX_BYTES,
  STATEMENT_MAX_ROWS,
  parseStatementCsv,
  buildDedupeKey,
  matchExpenseItemId,
} from "@/lib/statement-parsers";
import { parseIciciBankPdfText } from "@/lib/statement-parsers/icici-pdf";
import { extractPdfText, PdfPasswordError } from "@/lib/statement-parsers/extract-pdf-text";
import type { ParsedStatementRow } from "@/lib/statement-parsers/types";

export const dynamic = "force-dynamic";

const SOURCES = new Set<string>(["PHONEPE", "ICICI_BANK", "CREDIT_CARD"]);

async function expenseItemsForTxnMonth(
  userId: string,
  txnDate: Date
): Promise<{ id: string; label: string }[]> {
  const y = txnDate.getUTCFullYear();
  const m = txnDate.getUTCMonth() + 1;
  const plan = await prisma.monthlyPlan.findUnique({
    where: {
      userId_month_year: { userId, month: m, year: y },
    },
    include: { expenseItems: true },
  });
  return plan?.expenseItems.map((e) => ({ id: e.id, label: e.label })) ?? [];
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedJson();

  const form = await req.formData();
  const file = form.get("file");
  const sourceRaw = String(form.get("source") ?? "").toUpperCase();
  const pdfPasswordRaw = form.get("pdfPassword");
  const pdfPassword =
    typeof pdfPasswordRaw === "string" ? pdfPasswordRaw.trim() : "";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (!SOURCES.has(sourceRaw)) {
    return NextResponse.json(
      { error: "source must be PHONEPE, ICICI_BANK, or CREDIT_CARD" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > STATEMENT_MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });
  }

  const source = sourceRaw as StatementSource;
  const isPdf =
    buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-";

  let parsed: ParsedStatementRow[];
  if (isPdf) {
    if (source !== "ICICI_BANK") {
      return NextResponse.json(
        {
          error:
            "PDF is only supported for ICICI Bank right now. For other banks, export CSV, or remove the PDF password and try again later when we add that format.",
        },
        { status: 400 }
      );
    }
    try {
      const pdfText = await extractPdfText(buf, {
        password: pdfPassword.length > 0 ? pdfPassword : undefined,
      });
      parsed = parseIciciBankPdfText(pdfText);
    } catch (e) {
      if (e instanceof PdfPasswordError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      return NextResponse.json(
        {
          error: "Could not read this PDF. Try CSV export if the file is damaged or unsupported.",
        },
        { status: 400 }
      );
    }
  } else {
    const text = buf.toString("utf8");
    parsed = parseStatementCsv(source, text);
  }

  if (parsed.length > STATEMENT_MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (max ${STATEMENT_MAX_ROWS})` },
      { status: 400 }
    );
  }

  const batch = await prisma.statementImport.create({
    data: {
      userId,
      source,
      fileName: file.name || "statement.csv",
      rowCount: parsed.length,
      inserted: 0,
      skippedDup: 0,
    },
  });

  let inserted = 0;
  let skippedDup = 0;

  const planCache = new Map<string, { id: string; label: string }[]>();

  for (const row of parsed) {
    const dedupeKey = buildDedupeKey({
      userId,
      source,
      txnDate: row.txnDate,
      expenseAmount: row.expenseAmount,
      description: row.description,
      kind: row.kind,
      externalRef: row.externalRef,
    });

    const exists = await prisma.expenseImportLine.findUnique({
      where: {
        userId_dedupeKey: { userId, dedupeKey },
      },
    });
    if (exists) {
      skippedDup += 1;
      continue;
    }

    const y = row.txnDate.getUTCFullYear();
    const m = row.txnDate.getUTCMonth() + 1;
    const cacheKey = `${y}-${m}`;
    let items = planCache.get(cacheKey);
    if (!items) {
      items = await expenseItemsForTxnMonth(userId, row.txnDate);
      planCache.set(cacheKey, items);
    }

    const expenseItemId =
      row.kind === "EXPENSE" && row.expenseAmount > 0
        ? matchExpenseItemId(row.description, items)
        : null;

    await prisma.expenseImportLine.create({
      data: {
        userId,
        importId: batch.id,
        txnDate: row.txnDate,
        amount: row.kind === "EXPENSE" ? row.expenseAmount : 0,
        description: row.description.slice(0, 2000),
        source,
        kind: row.kind,
        dedupeKey,
        externalRef: row.externalRef?.slice(0, 500) ?? null,
        expenseItemId,
      },
    });
    inserted += 1;
  }

  await prisma.statementImport.update({
    where: { id: batch.id },
    data: { inserted, skippedDup },
  });

  return NextResponse.json({
    importId: batch.id,
    rowCount: parsed.length,
    inserted,
    skippedDup,
  });
}
