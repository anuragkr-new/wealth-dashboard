import { createHash } from "crypto";
import type { ImportedTxnKind } from "@prisma/client";

export function normalizeDescription(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s@./-]/g, "");
}

export function buildDedupeKey(input: {
  userId: string;
  source: string;
  txnDate: Date;
  expenseAmount: number;
  description: string;
  kind: ImportedTxnKind;
  externalRef?: string | null;
}): string {
  const y = input.txnDate.getUTCFullYear();
  const m = input.txnDate.getUTCMonth() + 1;
  const d = input.txnDate.getUTCDate();
  const dateKey = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const desc = normalizeDescription(input.description).slice(0, 200);
  const base = `${input.userId}|${input.source}|${dateKey}|${input.kind}|${input.expenseAmount.toFixed(2)}|${desc}`;
  const payload =
    input.externalRef && input.externalRef.trim()
      ? `${base}|${input.externalRef.trim()}`
      : base;
  return createHash("sha256").update(payload).digest("hex").slice(0, 40);
}
