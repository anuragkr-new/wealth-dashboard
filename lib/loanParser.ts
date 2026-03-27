import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedScheduleRow = {
  month: number;
  year: number;
  /** Day of month for start date (1–31); 1 if only month/year was available */
  day: number;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  outstandingBalance: number;
};

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function findColumn(
  headers: string[],
  candidates: string[]
): string | undefined {
  const lowered = headers.map((h) => norm(h));
  for (const c of candidates) {
    const idx = lowered.findIndex((h) => h.includes(norm(c)) || norm(c).includes(h));
    if (idx >= 0) return headers[idx];
  }
  return undefined;
}

export function parseScheduleDate(
  val: string | number | Date
): { year: number; month: number; day: number } | null {
  if (val instanceof Date && !isNaN(val.getTime())) {
    return {
      year: val.getFullYear(),
      month: val.getMonth() + 1,
      day: val.getDate(),
    };
  }
  const s = String(val).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    return {
      year: Number(iso[1]),
      month: Number(iso[2]),
      day: Number(iso[3]),
    };
  }
  const my = /^(\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (my) {
    return { month: Number(my[1]), year: Number(my[2]), day: 1 };
  }
  const ym = /^(\d{4})[\/\-](\d{1,2})$/.exec(s);
  if (ym) {
    return { year: Number(ym[1]), month: Number(ym[2]), day: 1 };
  }
  const threePart = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (threePart) {
    const p1 = Number(threePart[1]);
    const p2 = Number(threePart[2]);
    const y = Number(threePart[3]);
    let month: number;
    let day: number;
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      month = p1;
      day = p2;
    } else {
      month = p1;
      day = p2;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year: y, month, day };
    }
  }
  return null;
}

function num(v: unknown): number {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (v == null) return 0;
  const s = String(v).replace(/[₹,]/g, "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function parseLoanScheduleCsv(text: string): ParsedScheduleRow[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (!parsed.meta.fields?.length) return [];
  const headers = parsed.meta.fields.filter(Boolean) as string[];

  const colDate = findColumn(headers, [
    "month",
    "date",
    "month/date",
    "payment date",
    "due date",
  ]);
  const colEmi = findColumn(headers, ["emi", "installment"]);
  const colPrin = findColumn(headers, ["principal", "principle"]);
  const colInt = findColumn(headers, ["interest"]);
  const colBal = findColumn(headers, [
    "outstanding",
    "balance",
    "closing balance",
    "balance outstanding",
    "os",
  ]);

  if (!colDate || !colBal) {
    throw new Error("Could not find date and outstanding balance columns");
  }

  const rows: ParsedScheduleRow[] = [];
  for (const row of parsed.data) {
    const rawDate = row[colDate];
    if (rawDate == null || rawDate === "") continue;
    const md = parseScheduleDate(rawDate);
    if (!md) continue;
    rows.push({
      month: md.month,
      year: md.year,
      day: md.day,
      emiAmount: colEmi ? num(row[colEmi]) : 0,
      principalComponent: colPrin ? num(row[colPrin]) : 0,
      interestComponent: colInt ? num(row[colInt]) : 0,
      outstandingBalance: num(row[colBal]),
    });
  }
  return rows;
}

export function parseLoanScheduleXlsx(buffer: ArrayBuffer): ParsedScheduleRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  if (!json.length) return [];
  const headers = Object.keys(json[0]);
  const colDate = findColumn(headers, [
    "month",
    "date",
    "month/date",
    "payment date",
    "due date",
  ]);
  const colEmi = findColumn(headers, ["emi", "installment"]);
  const colPrin = findColumn(headers, ["principal", "principle"]);
  const colInt = findColumn(headers, ["interest"]);
  const colBal = findColumn(headers, [
    "outstanding",
    "balance",
    "closing balance",
    "balance outstanding",
    "os",
  ]);

  if (!colDate || !colBal) {
    throw new Error("Could not find date and outstanding balance columns");
  }

  const rows: ParsedScheduleRow[] = [];
  for (const row of json) {
    const rawDate = row[colDate];
    if (rawDate == null || rawDate === "") continue;
    const md =
      rawDate instanceof Date
        ? parseScheduleDate(rawDate)
        : parseScheduleDate(String(rawDate));
    if (!md) continue;
    rows.push({
      month: md.month,
      year: md.year,
      day: md.day,
      emiAmount: colEmi ? num(row[colEmi]) : 0,
      principalComponent: colPrin ? num(row[colPrin]) : 0,
      interestComponent: colInt ? num(row[colInt]) : 0,
      outstandingBalance: num(row[colBal]),
    });
  }
  return rows;
}

/**
 * Derive loan header fields from a parsed amortisation schedule (sorted by date).
 * Opening principal: first row closing balance + principal repaid that period when principal column exists.
 * EMI: average of non-zero EMI column, else median of month-on-month balance drops.
 */
export function deriveLoanFromSchedule(
  rows: ParsedScheduleRow[]
): {
  principalAmount: number;
  emiAmount: number;
  tenureMonths: number;
  startDate: string;
  interestRate: number;
} | null {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) =>
    a.year !== b.year
      ? a.year - b.year
      : a.month !== b.month
        ? a.month - b.month
        : a.day - b.day
  );
  const first = sorted[0];
  const principalAmount =
    first.principalComponent > 0
      ? first.outstandingBalance + first.principalComponent
      : first.outstandingBalance;

  const emiFromCol = sorted.map((r) => r.emiAmount).filter((e) => e > 0);
  let emiAmount = 0;
  if (emiFromCol.length) {
    emiAmount =
      emiFromCol.reduce((sum, x) => sum + x, 0) / emiFromCol.length;
  } else if (sorted.length >= 2) {
    const deltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const d =
        sorted[i - 1].outstandingBalance - sorted[i].outstandingBalance;
      if (d > 0 && Number.isFinite(d)) deltas.push(d);
    }
    if (deltas.length) {
      const sortedD = [...deltas].sort((a, b) => a - b);
      emiAmount = sortedD[Math.floor(sortedD.length / 2)];
    } else {
      emiAmount = Math.abs(
        sorted[0].outstandingBalance - sorted[1].outstandingBalance
      );
    }
  }

  const d = Math.min(31, Math.max(1, first.day));
  const startDate = `${first.year}-${String(first.month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return {
    principalAmount: Math.round(principalAmount * 100) / 100,
    emiAmount: Math.round(emiAmount * 100) / 100,
    tenureMonths: sorted.length,
    startDate,
    interestRate: 0,
  };
}
