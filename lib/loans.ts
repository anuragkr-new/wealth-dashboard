import type { Loan, LoanScheduleEntry } from "@prisma/client";
import { compareYearMonth, isYearMonthOnOrBefore } from "./utils";

export function scheduleOutstandingAsOf(
  entries: LoanScheduleEntry[],
  targetYear: number,
  targetMonth: number
): number {
  if (!entries.length) return 0;
  const sorted = [...entries].sort((a, b) =>
    compareYearMonth(a.year, a.month, b.year, b.month)
  );
  const onOrBefore = sorted.filter((e) =>
    isYearMonthOnOrBefore(e.year, e.month, targetYear, targetMonth)
  );
  const last = onOrBefore[onOrBefore.length - 1];
  return last ? last.outstandingBalance : 0;
}

export function loanRepaidPercent(
  loan: Loan,
  entries: LoanScheduleEntry[],
  asOfYear: number,
  asOfMonth: number
): number {
  if (!loan.principalAmount) return 0;
  const current = scheduleOutstandingAsOf(entries, asOfYear, asOfMonth);
  const repaid = loan.principalAmount - current;
  return Math.max(0, Math.min(100, (repaid / loan.principalAmount) * 100));
}
