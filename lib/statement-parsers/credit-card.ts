
import Papa from "papaparse";
import type { ParsedStatementRow } from "./types";
import { classifyCreditCardLine } from "./classify";
import { parseFlexibleDate, parseMoney, normHeader, pickCol } from "./parse-helpers";

export function parseCreditCardCsv(text: string): ParsedStatementRow[] {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
  });
  const rows = parsed.data as string[][];
  if (rows.length < 2) return [];

  const headerIdx = rows.findIndex((r) =>
    r.some((c) => {
      const h = normHeader(c || "");
      return (
        h.includes("date") &&
        (h.includes("amount") || h.includes("detail") || h.includes("narration"))
      );
    })
  );
  if (headerIdx < 0) return [];

  const headers = rows[headerIdx]!.map((h) => normHeader(h || ""));
  const iDate = pickCol(headers, ["date", "transaction date", "txn date"]);
  const iDetails = pickCol(headers, [
    "transaction details",
    "description",
    "particulars",
    "merchant",
    "details",
    "narration",
  ]);
  const iAmt = pickCol(headers, [
    "amount",
    "amount(in rs)",
    "amount (in rs)",
    "transaction amount",
    "billing amount",
  ]);
  const iDrCr = pickCol(headers, ["dr/cr", "dr / cr", "type", "debit/credit"]);

  if (iDate < 0 || iAmt < 0) return [];

  const out: ParsedStatementRow[] = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const line = rows[r]!;
    const ds = (line[iDate] ?? "").trim();
    if (!ds) continue;
    const txnDate = parseFlexibleDate(ds);
    if (!txnDate) continue;

    const amt = parseMoney(line[iAmt] ?? "");
    if (amt == null || amt <= 0) continue;

    let isCredit = false;
    if (iDrCr >= 0) {
      const t = String(line[iDrCr] ?? "").toLowerCase();
      isCredit = t.includes("cr") || t.includes("credit");
    } else {
      const raw = String(line[iAmt] ?? "").toLowerCase();
      isCredit = raw.includes("cr") && !raw.includes("dr");
    }

    const details =
      iDetails >= 0 ? String(line[iDetails] ?? "").trim() : "";

    const kind = classifyCreditCardLine(details, isCredit);
    if (kind === "IGNORE" || kind === "TRANSFER") continue;

    out.push({
      txnDate,
      description: details || "Credit card",
      externalRef: null,
      expenseAmount: kind === "EXPENSE" ? amt : 0,
      kind,
    });
  }

  return out;
}
