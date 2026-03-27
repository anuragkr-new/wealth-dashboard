import type { Loan, LoanScheduleEntry } from "@prisma/client";
import { compareYearMonth, isYearMonthOnOrBefore } from "./utils";

/** Minimal row shape for outstanding-as-of (parsed file rows or DB schedule entries). */
export type OutstandingScheduleRow = {
  year: number;
  month: number;
  outstandingBalance: number;
};

/**
 * Outstanding balance from the amortisation schedule as of target month.
 * Uses the last row whose schedule month is on or before the target.
 * If every row is *after* the target (e.g. today is March but the CSV starts in April),
 * returns `principalBeforeSchedule` when provided so the UI does not show 0 incorrectly.
 */
export function scheduleOutstandingAsOf(
  entries: OutstandingScheduleRow[],
  targetYear: number,
  targetMonth: number,
  principalBeforeSchedule?: number
): number {
  if (!entries.length) return 0;
  const sorted = [...entries].sort((a, b) =>
    compareYearMonth(a.year, a.month, b.year, b.month)
  );
  const onOrBefore = sorted.filter((e) =>
    isYearMonthOnOrBefore(e.year, e.month, targetYear, targetMonth)
  );
  const last = onOrBefore[onOrBefore.length - 1];
  if (last) return last.outstandingBalance;
  if (
    principalBeforeSchedule != null &&
    Number.isFinite(principalBeforeSchedule) &&
    principalBeforeSchedule > 0
  ) {
    return principalBeforeSchedule;
  }
  return sorted[0]?.outstandingBalance ?? 0;
}

export function loanRepaidPercent(
  loan: Loan,
  entries: LoanScheduleEntry[],
  asOfYear: number,
  asOfMonth: number
): number {
  if (!loan.principalAmount) return 0;
  const current = scheduleOutstandingAsOf(
    entries,
    asOfYear,
    asOfMonth,
    loan.principalAmount
  );
  const repaid = loan.principalAmount - current;
  return Math.max(0, Math.min(100, (repaid / loan.principalAmount) * 100));
}
