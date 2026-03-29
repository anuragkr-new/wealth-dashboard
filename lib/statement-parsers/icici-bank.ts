
import Papa from "papaparse";
import type { ParsedStatementRow } from "./types";
import { classifyBankParticulars } from "./classify";
import { parseFlexibleDate, parseMoney, normHeader, pickCol } from "./parse-helpers";

export function parseIciciBankCsv(text: string): ParsedStatementRow[] {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
  });
  const rows = parsed.data as string[][];
  if (rows.length < 2) return [];

  const headerIdx = rows.findIndex((r) =>
    r.some((c) => {
      const h = normHeader(c || "");
      return h.includes("date") || h.includes("particular") || h.includes("debit");
    })
  );
  if (headerIdx < 0) return [];

  const headers = rows[headerIdx]!.map((h) => normHeader(h || ""));
  const iDate = pickCol(headers, [
    "transaction date",
    "txn date",
    "date",
    "value date",
  ]);
  const iValDate = pickCol(headers, ["value date"]);
  const iPart = pickCol(headers, [
    "particulars",
    "narration",
    "description",
    "transaction remarks",
  ]);
  const iDebit = pickCol(headers, ["debit", "debit amount", "withdrawal"]);
  const iCredit = pickCol(headers, ["credit", "credit amount", "deposit"]);

  if (iDate < 0 && iValDate < 0) return [];

  const out: ParsedStatementRow[] = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const line = rows[r]!;
    const ds = (
      (iDate >= 0 ? line[iDate] : "") ||
      (iValDate >= 0 ? line[iValDate] : "") ||
      ""
    ).trim();
    if (!ds) continue;
    const txnDate = parseFlexibleDate(ds);
    if (!txnDate) continue;

    const particulars =
      iPart >= 0 ? String(line[iPart] ?? "").trim() : "";

    const debit = iDebit >= 0 ? parseMoney(line[iDebit] ?? "") : null;
    const credit = iCredit >= 0 ? parseMoney(line[iCredit] ?? "") : null;

    let kind = classifyBankParticulars(particulars);
    let expenseAmount = 0;

    if (debit != null && debit > 0) {
      if (kind === "TRANSFER" || kind === "INCOME") {
        expenseAmount = 0;
      } else {
        kind = "EXPENSE";
        expenseAmount = debit;
      }
    } else if (credit != null && credit > 0) {
      if (kind === "EXPENSE") kind = "INCOME";
      expenseAmount = 0;
    } else {
      continue;
    }

    if (kind === "IGNORE") continue;

    out.push({
      txnDate,
      description: particulars || "ICICI Bank",
      externalRef: null,
      expenseAmount: kind === "EXPENSE" ? expenseAmount : 0,
      kind,
    });
  }

  return out;
}
