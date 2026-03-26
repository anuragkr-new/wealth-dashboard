import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatINRCompact(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function parseMonthYear(param: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(param);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function monthYearKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function compareYearMonth(
  ay: number,
  am: number,
  by: number,
  bm: number
): number {
  if (ay !== by) return ay - by;
  return am - bm;
}

export function isYearMonthOnOrBefore(
  y: number,
  m: number,
  cy: number,
  cm: number
): boolean {
  return y < cy || (y === cy && m <= cm);
}

/** Signed months from (y1,m1) to (y2,m2). */
export function monthsBetween(
  y1: number,
  m1: number,
  y2: number,
  m2: number
): number {
  return (y2 - y1) * 12 + (m2 - m1);
}
