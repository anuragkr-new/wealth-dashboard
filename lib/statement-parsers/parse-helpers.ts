
export function parseMoney(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw)
    .replace(/[₹Rs,INR\s]/gi, "")
    .replace(/[()]/g, "")
    .trim();
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? Math.abs(n) : null;
}

/** Parse date to UTC noon to avoid TZ drift for date-only values. */
export function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

export function parseFlexibleDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  let m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = Number(m[3]);
    if (a > 12) return utcDate(y, b, a);
    if (b > 12) return utcDate(y, a, b);
    return utcDate(y, b, a);
  }

  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    return utcDate(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (m) {
    return utcDate(Number(m[3]), Number(m[2]), Number(m[1]));
  }

  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/.exec(s);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12) return utcDate(y, b, a);
    if (b > 12) return utcDate(y, a, b);
    return utcDate(y, b, a);
  }

  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    return utcDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  return null;
}

export function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

export function pickCol(headers: string[], candidates: string[]): number {
  const n = headers.map(normHeader);
  for (const c of candidates) {
    const i = n.indexOf(c);
    if (i >= 0) return i;
  }
  for (const c of candidates) {
    const i = n.findIndex((h) => h.includes(c) && c.length >= 4);
    if (i >= 0) return i;
  }
  return -1;
}
