import Papa from "papaparse";

export const CSV_IMPORT_MAX_BYTES = 1_000_000;
export const CSV_IMPORT_MAX_ROWS = 500;

const NAME_HEADERS = [
  "scheme name",
  "scheme",
  "fund name",
  "name",
  "instrument",
  "security name",
  "scrip name",
];

const VALUE_HEADERS = [
  "current value",
  "market value",
  "current market value",
  "value",
  "current",
  "amount",
  "total value",
  "invested value",
];

const NOTE_HEADERS: { key: string; labels: string[] }[] = [
  { key: "folio", labels: ["folio", "folio number", "folio no"] },
  { key: "isin", labels: ["isin"] },
  { key: "units", labels: ["units", "quantity", "qty"] },
  { key: "nav", labels: ["nav", "current nav"] },
];

export type ParsedHoldingRow = {
  name: string;
  value: number;
  notes: string | null;
};

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "");
}

function pickColumnIndex(
  headers: string[],
  candidates: string[]
): number {
  const normalized = headers.map(normHeader);
  for (const c of candidates) {
    const i = normalized.indexOf(c);
    if (i >= 0) return i;
  }
  return -1;
}

export function parseInrNumber(raw: string): number | null {
  const s = raw
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export type ParseHoldingsCsvResult =
  | { ok: true; rows: ParsedHoldingRow[] }
  | { ok: false; error: string };

export function parseHoldingsCsv(text: string): ParseHoldingsCsvResult {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
  });

  if (parsed.errors.length > 0) {
    const msg = parsed.errors.map((e) => e.message).join("; ");
    return { ok: false, error: `CSV parse error: ${msg}` };
  }

  const data = parsed.data.filter((row) => row.some((c) => String(c).trim()));
  if (data.length < 2) {
    return {
      ok: false,
      error: "CSV needs a header row and at least one data row.",
    };
  }

  /** Groww / Google Sheets exports often have summary rows before the holdings table. */
  let headerRowIdx = -1;
  let nameIdx = -1;
  let valueIdx = -1;
  const noteIdx: Record<string, number> = {};

  for (let i = 0; i < data.length - 1; i++) {
    const headers = data[i].map((h) => String(h ?? ""));
    const ni = pickColumnIndex(headers, NAME_HEADERS);
    const vi = pickColumnIndex(headers, VALUE_HEADERS);
    if (ni >= 0 && vi >= 0) {
      headerRowIdx = i;
      nameIdx = ni;
      valueIdx = vi;
      for (const { key, labels } of NOTE_HEADERS) {
        const idx = pickColumnIndex(headers, labels);
        if (idx >= 0) noteIdx[key] = idx;
      }
      break;
    }
  }

  if (headerRowIdx < 0 || nameIdx < 0 || valueIdx < 0) {
    const sample = data
      .slice(0, 5)
      .map((row) => row.filter(Boolean).join(" | "))
      .join(" · ");
    return {
      ok: false,
      error: `Could not find a holdings header row with name + value columns (e.g. Scheme Name, Current Value). First rows: ${sample || "(empty)"}`,
    };
  }

  const rows: ParsedHoldingRow[] = [];
  for (let r = headerRowIdx + 1; r < data.length; r++) {
    if (rows.length >= CSV_IMPORT_MAX_ROWS) {
      return {
        ok: false,
        error: `Too many rows (max ${CSV_IMPORT_MAX_ROWS}).`,
      };
    }
    const line = data[r];
    const name = String(line[nameIdx] ?? "").trim();
    const valueRaw = String(line[valueIdx] ?? "");
    const value = parseInrNumber(valueRaw);
    if (!name) continue;
    if (value == null) {
      continue;
    }

    const noteParts: string[] = [];
    for (const key of Object.keys(noteIdx)) {
      const v = String(line[noteIdx[key]!] ?? "").trim();
      if (v) noteParts.push(`${key}: ${v}`);
    }
    rows.push({
      name,
      value,
      notes: noteParts.length ? noteParts.join(" · ") : null,
    });
  }

  if (rows.length === 0) {
    return {
      ok: false,
      error: "No valid rows (need non-empty name and numeric value per row).",
    };
  }

  return { ok: true, rows };
}
