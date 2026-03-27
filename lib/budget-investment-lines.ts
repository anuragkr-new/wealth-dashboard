/**
 * Budget expense lines that represent transfers into mutual funds / SIPs —
 * not consumption — for forecast and net-saving logic.
 */

const MF_LABEL_RES = [
  /mutual\s*funds?/i,
  /\bmf\s+ sip\b/i,
  /\bsip\b/i,
  /systematic\s+investment/i,
  /lumpsum|lumsum/i,
  /\belss\b/i,
  /equity\s*[- ]?linked\s*savings?/i,
  /index\s+fund/i,
];

export function matchesMutualFundBudgetLine(label: string): boolean {
  const t = label.trim();
  if (!t) return false;
  if (/^mutual funds?$/i.test(t)) return true;
  return MF_LABEL_RES.some((re) => re.test(t));
}

type BudgetLine = {
  label: string;
  plannedAmount: number;
  actualAmount: number | null;
};

/** Sum amounts on MF/SIP-style lines; use actuals when requested and present. */
export function sumMutualFundBudgetLines(
  items: BudgetLine[],
  useActual: boolean
): number {
  return items
    .filter((e) => matchesMutualFundBudgetLine(e.label))
    .reduce((s, e) => {
      const amt =
        useActual && e.actualAmount != null
          ? e.actualAmount
          : e.plannedAmount;
      const n = Number(amt);
      return s + (Number.isFinite(n) ? n : 0);
    }, 0);
}
