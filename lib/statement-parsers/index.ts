import type { StatementSource } from "@prisma/client";
import type { ParsedStatementRow } from "./types";
import { parsePhonePeCsv } from "./phonepe";
import { parseIciciBankCsv } from "./icici-bank";
import { parseCreditCardCsv } from "./credit-card";

export * from "./types";
export * from "./dedupe";
export * from "./match-expense-line";

export function parseStatementCsv(
  source: StatementSource,
  text: string
): ParsedStatementRow[] {
  const t = text.replace(/^\uFEFF/, "").trim();
  if (!t) return [];
  switch (source) {
    case "PHONEPE":
      return parsePhonePeCsv(t);
    case "ICICI_BANK":
      return parseIciciBankCsv(t);
    case "CREDIT_CARD":
      return parseCreditCardCsv(t);
    default:
      return [];
  }
}
