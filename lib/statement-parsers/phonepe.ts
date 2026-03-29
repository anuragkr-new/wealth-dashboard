
import Papa from "papaparse";
import type { ImportedTxnKind } from "@prisma/client";
import type { ParsedStatementRow } from "./types";
import { parseFlexibleDate, parseMoney, normHeader, pickCol } from "./parse-helpers";

function rowKindFromPhonePe(
  typeStr: string,
  amountSigned: number | null,
  debit: number | null,
  credit: number | null
): { kind: ImportedTxnKind; expenseAmount: number } {
  const t = (typeStr || "").toLowerCase();
  if (debit != null && debit > 0 && (!credit || credit === 0))
    return { kind: "EXPENSE", expenseAmount: debit };
  if (credit != null && credit > 0 && (!debit || debit === 0))
    return { kind: "INCOME", expenseAmount: 0 };

  if (amountSigned != null) {
    if (amountSigned < 0) return { kind: "EXPENSE", expenseAmount: Math.abs(amountSigned) };
    if (amountSigned > 0) {
      if (t.includes("paid") || t.includes("debit") || t.includes("sent"))
        return { kind: "EXPENSE", expenseAmount: amountSigned };
      if (t.includes("received") || t.includes("credit") || t.includes("cashback"))
        return { kind: "INCOME", expenseAmount: 0 };
    }
  }

  if (t.includes("paid") || t.includes("sent") || t.includes("debit"))
    return { kind: "EXPENSE", expenseAmount: Math.abs(amountSigned ?? 0) };
  if (t.includes("received") || t.includes("added"))
    return { kind: "INCOME", expenseAmount: 0 };

  return { kind: "IGNORE", expenseAmount: 0 };
}

export function parsePhonePeCsv(text: string): ParsedStatementRow[] {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
  });
  const rows = parsed.data as string[][];
  if (rows.length < 2) return [];

  const headerIdx = rows.findIndex((r) =>
    r.some((c) => normHeader(c || "").includes("date"))
  );
  if (headerIdx < 0) return [];

  const headers = rows[headerIdx]!.map((h) => normHeader(h || ""));
  const iDate = pickCol(headers, [
    "date",
    "txn date",
    "transaction date",
    "payment date",
  ]);
  const iAmt = pickCol(headers, [
    "amount (rs.)",
    "amount(rs.)",
    "amount",
    "amount rs",
    "transaction amount",
  ]);
  const iType = pickCol(headers, [
    "type",
    "transaction type",
    "payment type",
  ]);
  const iStatus = pickCol(headers, ["status", "payment status"]);
  const iDesc = pickCol(headers, [
    "remarks",
    "description",
    "note",
    "utr",
    "transaction note",
    "paid to",
    "received from",
  ]);
  const iId = pickCol(headers, ["transaction id", "utr", "reference id", "order id"]);
  const iDebit = pickCol(headers, ["debit", "debit amount"]);
  const iCredit = pickCol(headers, ["credit", "credit amount"]);

  if (iDate < 0) return [];

  const out: ParsedStatementRow[] = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const line = rows[r]!;
    const ds = (line[iDate] ?? "").trim();
    if (!ds) continue;
    const txnDate = parseFlexibleDate(ds);
    if (!txnDate) continue;

    const status = (iStatus >= 0 ? line[iStatus] : "")?.toLowerCase() ?? "";
    if (status.includes("fail") || status.includes("pending")) continue;

    const debit = iDebit >= 0 ? parseMoney(line[iDebit] ?? "") : null;
    const credit = iCredit >= 0 ? parseMoney(line[iCredit] ?? "") : null;
    let signed: number | null = null;
    if (iAmt >= 0) {
      const raw = (line[iAmt] ?? "").replace(/,/g, "");
      const amtSigned = parseMoney(line[iAmt] ?? "");
      if (amtSigned != null) {
        if (raw.trim().startsWith("-")) signed = -amtSigned;
        else if (raw.toLowerCase().includes("dr")) signed = -amtSigned;
        else if (raw.toLowerCase().includes("cr")) signed = amtSigned;
        else signed = amtSigned;
      }
    }

    const typeCell = iType >= 0 ? line[iType] ?? "" : "";
    const { kind, expenseAmount } = rowKindFromPhonePe(
      typeCell,
      signed,
      debit,
      credit
    );

    if (kind === "IGNORE") continue;
    if (kind === "EXPENSE" && expenseAmount <= 0) continue;

    const description =
      iDesc >= 0
        ? String(line[iDesc] ?? "").trim()
        : [typeCell, line[iAmt]].filter(Boolean).join(" · ");

    const externalRef = iId >= 0 ? String(line[iId] ?? "").trim() || null : null;

    out.push({
      txnDate,
      description: description || "PhonePe",
      externalRef,
      expenseAmount: kind === "EXPENSE" ? expenseAmount : 0,
      kind,
    });
  }

  return out;
}
