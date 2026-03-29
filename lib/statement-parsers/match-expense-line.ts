/** Longest budget label that appears as substring in description (case-insensitive). */
export function matchExpenseItemId(
  description: string,
  items: { id: string; label: string }[]
): string | null {
  const d = description.toLowerCase();
  let best: { id: string; len: number } | null = null;
  for (const item of items) {
    const L = item.label.trim().toLowerCase();
    if (L.length < 3) continue;
    if (d.includes(L)) {
      if (!best || L.length > best.len) best = { id: item.id, len: L.length };
    }
  }
  return best?.id ?? null;
}
