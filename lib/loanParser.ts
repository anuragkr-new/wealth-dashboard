import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedScheduleRow = {
  month: number;
  year: number;
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

function parseMonthDate(val: string | number | Date): { month: number; year: number } | null {
  if (val instanceof Date && !isNaN(val.getTime())) {
    return { month: val.getMonth() + 1, year: val.getFullYear() };
  }
  const s = String(val).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    return { year: Number(iso[1]), month: Number(iso[2]) };
  }
  const my = /^(\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (my) {
    return { month: Number(my[1]), year: Number(my[2]) };
  }
  const ym = /^(\d{4})[\/\-](\d{1,2})$/.exec(s);
  if (ym) {
    return { year: Number(ym[1]), month: Number(ym[2]) };
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
  const colEmi = findColumn(headers, ["emi", "installment", "payment"]);
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
    const md = parseMonthDate(rawDate);
    if (!md) continue;
    rows.push({
      month: md.month,
      year: md.year,
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
  ]);
  const colEmi = findColumn(headers, ["emi", "installment", "payment"]);
  const colPrin = findColumn(headers, ["principal"]);
  const colInt = findColumn(headers, ["interest"]);
  const colBal = findColumn(headers, [
    "outstanding",
    "balance",
    "closing balance",
    "balance outstanding",
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
        ? { month: rawDate.getMonth() + 1, year: rawDate.getFullYear() }
        : parseMonthDate(String(rawDate));
    if (!md) continue;
    rows.push({
      month: md.month,
      year: md.year,
      emiAmount: colEmi ? num(row[colEmi]) : 0,
      principalComponent: colPrin ? num(row[colPrin]) : 0,
      interestComponent: colInt ? num(row[colInt]) : 0,
      outstandingBalance: num(row[colBal]),
    });
  }
  return rows;
}
