import type { ImportedTxnKind } from "@prisma/client";

const TRANSFER_PATTERNS = [
  "cred.club",
  "payment on",
  "credit card bill",

  "credit card payment",
  "cc payment",
  "card payment",
  "payment to credit card",
  "credit card bill",
  "card bill payment",
  "billdesk",
  "paytm credit card",
  "autopay credit card",
  "nach credit card",
  "loan recovery",
  "loan repayment",
  "transfer to",
  "neft out",
  "imps out",
  "fund transfer",
  "self transfer",
];

const INCOME_HINTS = [
  "salary",
  "credited by",
  "interest credited",
  "dividend",
  "refund",
  "cashback",
];

export function classifyBankParticulars(text: string): ImportedTxnKind {
  const t = text.toLowerCase();
  if (TRANSFER_PATTERNS.some((p) => t.includes(p))) return "TRANSFER";
  if (INCOME_HINTS.some((p) => t.includes(p))) return "INCOME";
  return "EXPENSE";
}

export function classifyCreditCardLine(text: string, isCredit: boolean): ImportedTxnKind {
  if (isCredit) {
    const t = text.toLowerCase();
    if (
      t.includes("payment received") ||
      t.includes("reversal")
    ) {
      return "TRANSFER";
    }
    return "IGNORE";
  }
  return "EXPENSE";
}
