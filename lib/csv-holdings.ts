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
  "current portfolio value",
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
  candidates: string[],
  mode: "exact" | "exactOrContains" = "exact"
): number {
  const normalized = headers.map(normHeader);
  for (const c of candidates) {
    const i = normalized.indexOf(c);
    if (i >= 0) return i;
  }
  if (mode === "exactOrContains") {
    for (const c of candidates) {
      if (c.length < 5) continue;
      const i = normalized.findIndex((h) => h.includes(c));
      if (i >= 0) return i;
    }
  }
  return -1;
}

function detectDelimiter(text: string): string {
  const line =
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
  if (!line) return ",";
  const tab = (line.match(/\t/g) ?? []).length;
  const comma = (line.match(/,/g) ?? []).length;
  const semi = (line.match(/;/g) ?? []).length;
  const m = Math.max(tab, comma, semi);
  if (m === 0) return ",";
  if (tab === m) return "\t";
  if (semi === m) return ";";
  return ",";
}

function stripBom(text: string): string {
  let t = text;
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  return t.replace(/^\uFEFF+/, "");
}

export function parseInrNumber(raw: string): number | null {
  if (/%/.test(raw)) return null;
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
  const raw = stripBom(text);
  const delimiter = detectDelimiter(raw);
  const parsed = Papa.parse<string[]>(raw, {
    header: false,
    skipEmptyLines: "greedy",
    delimiter,
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

  /**
   * Groww / Google Sheets exports often have summary rows before the holdings table.
   * Some sheets also have a generic two-column "Name","Value" row (personal details) that
   * must not win over the real holdings header — prefer rows with more columns and
   * scheme-style name headers.
   */
  type Candidate = {
    rowIdx: number;
    nameIdx: number;
    valueIdx: number;
    colCount: number;
    nameHeader: string;
    score: number;
  };
  const candidates: Candidate[] = [];

  for (let i = 0; i < data.length - 1; i++) {
    const headers = data[i].map((h) => String(h ?? ""));
    const nonEmpty = headers.filter((h) => h.trim()).length;
    const ni = pickColumnIndex(headers, NAME_HEADERS, "exactOrContains");
    const vi = pickColumnIndex(headers, VALUE_HEADERS, "exactOrContains");
    if (ni < 0 || vi < 0 || ni === vi) continue;

    const nh = normHeader(headers[ni] ?? "");
    let score = nonEmpty;
    if (nh === "scheme name" || nh.includes("scheme name")) score += 80;
    else if (nh.includes("fund name")) score += 50;
    else if (nh === "name" && nonEmpty <= 2) score -= 100;

    candidates.push({
      rowIdx: i,
      nameIdx: ni,
      valueIdx: vi,
      colCount: nonEmpty,
      nameHeader: nh,
      score,
    });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.colCount - a.colCount;
  });

  const best = candidates[0];
  let headerRowIdx = best?.rowIdx ?? -1;
  let nameIdx = best?.nameIdx ?? -1;
  let valueIdx = best?.valueIdx ?? -1;
  const noteIdx: Record<string, number> = {};

  if (best) {
    const headers = data[headerRowIdx].map((h) => String(h ?? ""));
    for (const { key, labels } of NOTE_HEADERS) {
      const idx = pickColumnIndex(headers, labels, "exact");
      if (idx >= 0) noteIdx[key] = idx;
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
