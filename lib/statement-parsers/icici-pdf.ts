import type { ImportedTxnKind } from "@prisma/client";
import type { ParsedStatementRow } from "./types";
import { classifyBankParticulars } from "./classify";
import { parseFlexibleDate, parseMoney } from "./parse-helpers";

function isPlausibleStatementDate(ds: string): boolean {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(ds);
  if (!m) return false;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  return true;
}

/** ICICI PDFs sometimes omit space between amount columns: 5005.0076873.75 */
function unglueAmounts(s: string): string {
  const step1 = s.replace(/(\.\d{2})(?=\d{4,}\.)/g, "$1 ");
  if (step1.length <= 48) {
    return step1.replace(/(\d{5,})(?=\d{1,3}\.\d{2}\b)/g, "$1 ");
  }
  const head = step1.slice(0, -48);
  const tail = step1.slice(-48).replace(/(\d{5,})(?=\d{1,3}\.\d{2}\b)/g, "$1 ");
  return head + tail;
}

/** Last monetary token at end of string. */
function popTrailingAmount(s: string): { value: number; rest: string } | null {
  const t = s.trimEnd();
  const m = /^([\s\S]*?)((?:\d{1,3}(?:,\d{3})+|\d{2,})\.\d{2})$/.exec(t);
  if (!m) {
    const m2 = /^([\s\S]*?)(\d{1,2}\.\d{2})$/.exec(t);
    if (!m2) return null;
    const value = parseMoney(m2[2]);
    if (value == null) return null;
    return { value, rest: m2[1].trimEnd() };
  }
  const value = parseMoney(m[2]);
  if (value == null) return null;
  return { value, rest: m[1].trimEnd() };
}

function classifyTwoColumnAmount(
  remarks: string,
  a: number
): { withdrawal: number; deposit: number } {
  const r = remarks.toUpperCase();
  const creditish =
    /\bNEFT\b|\bRTGS\b|\bIMPS\b|\bCMS\b|\bSALARY\b|\bCREDITED\b|\bDEPOSIT\b|\bINTEREST\b|\bEVENTILA\b|\bGROWW\b|\bWITHDRAW REQ\b/.test(
      r
    );
  const debitish =
    /\bUPI\/.*PAYMENT FR\b|\bUPI\/.*PAYMENT FO\b|\bACH\b|\bBIL\/\b|\bEMI\b|\bAUTO DEBIT\b/i.test(
      remarks
    );
  if (creditish && !debitish) return { withdrawal: 0, deposit: a };
  if (debitish) return { withdrawal: a, deposit: 0 };
  return { withdrawal: a, deposit: 0 };
}

/**
 * ICICI savings PDF (pdf-parse). Serial + date may be glued: "128.02.2026".
 */
export function parseIciciBankPdfText(rawText: string): ParsedStatementRow[] {
  const flat = rawText.replace(/\r/g, " ").replace(/\s+/g, " ").trim();
  if (!/\d{2}\.\d{2}\.\d{4}/.test(flat)) return [];

  type Hit = { serial: string; dateStr: string; dateStart: number; dateEnd: number };
  const hits: Hit[] = [];
  const dateRe = /\d{2}\.\d{2}\.\d{4}/g;
  let m: RegExpExecArray | null;
  while ((m = dateRe.exec(flat)) !== null) {
    const dateStr = m[0];
    if (!isPlausibleStatementDate(dateStr)) continue;
    const i = m.index;
    let j = i - 1;
    while (j >= 0 && flat[j]! >= "0" && flat[j]! <= "9") j--;
    const serial = flat.slice(j + 1, i);
    if (serial.length > 4) continue;
    hits.push({
      serial,
      dateStr,
      dateStart: i,
      dateEnd: i + dateStr.length,
    });
  }

  if (hits.length === 0) return [];

  const rows: ParsedStatementRow[] = [];
  let prevBalance: number | null = null;

  for (let h = 0; h < hits.length; h++) {
    const { dateStr, dateEnd } = hits[h]!;
    const next = hits[h + 1];
    const chunkEnd = next ? next.dateStart - next.serial.length : flat.length;
    let body = unglueAmounts(flat.slice(dateEnd, chunkEnd).trim());
    body = body.replace(/Never share your OTP.*$/i, "");
    body = body.replace(/www\.icici\.bank\.in.*$/i, "");
    body = body.replace(/Dial your Bank.*$/i, "");
    body = body.trim();

    const txnDate = parseFlexibleDate(dateStr);
    if (!txnDate) continue;

    const nums: number[] = [];
    let cur = body;
    for (let k = 0; k < 4; k++) {
      const p = popTrailingAmount(cur);
      if (!p) break;
      nums.push(p.value);
      cur = p.rest;
    }
    if (nums.length < 2) continue;
    nums.reverse();
    const balance = nums[nums.length - 1]!;
    let withdrawal = 0;
    let deposit = 0;
    const remarks = cur.trim();

    if (nums.length >= 3) {
      withdrawal = nums[0]!;
      deposit = nums[1]!;
    } else {
      const a = nums[0]!;
      if (prevBalance != null) {
        const delta = balance - prevBalance;
        if (Math.abs(delta + a) < 0.05) {
          withdrawal = a;
        } else if (Math.abs(delta - a) < 0.05) {
          deposit = a;
        } else {
          const guess = classifyTwoColumnAmount(remarks, a);
          withdrawal = guess.withdrawal;
          deposit = guess.deposit;
        }
      } else {
        const guess = classifyTwoColumnAmount(remarks, a);
        withdrawal = guess.withdrawal;
        deposit = guess.deposit;
      }
    }

    prevBalance = balance;

    const description = remarks.replace(/^\d+\s+/, "").slice(0, 1500);
    if (description.length < 3) continue;

    let kind: ImportedTxnKind;
    let expenseAmount = 0;

    if (withdrawal > 0) {
      kind = classifyBankParticulars(description);
      expenseAmount = kind === "EXPENSE" ? withdrawal : 0;
    } else if (deposit > 0) {
      kind = classifyBankParticulars(description);
      if (kind === "EXPENSE") kind = "INCOME";
      expenseAmount = 0;
    } else {
      continue;
    }

    rows.push({
      txnDate,
      description,
      externalRef: null,
      expenseAmount,
      kind,
    });
  }

  return rows;
}
