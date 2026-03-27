import type { AssetCategory, LoanScheduleEntry } from "@prisma/client";
import { sumMutualFundBudgetLines } from "./budget-investment-lines";
import { calculateNetWorth } from "./networth";
import { scheduleOutstandingAsOf } from "./loans";
import { prisma } from "./prisma";
import { addMonths, compareYearMonth, monthsBetween } from "./utils";

export type ForecastPoint = {
  label: string;
  year: number;
  month: number;
  conservativeNetWorth: number;
  expectedNetWorth: number;
};

function loanOutstandingForMonth(
  entries: LoanScheduleEntry[],
  targetYear: number,
  targetMonth: number,
  principalAmount: number
): number {
  return scheduleOutstandingAsOf(
    entries,
    targetYear,
    targetMonth,
    principalAmount
  );
}

function categoryTotals(categories: (AssetCategory & { assets: { value: number }[] })[]) {
  return categories.map((c) => ({
    id: c.id,
    growthRate: c.growthRate,
    total: c.assets.reduce((s, a) => s + a.value, 0),
  }));
}

function projectAssets(
  categoryTotalsList: { growthRate: number; total: number }[],
  monthsAhead: number,
  growthMultiplier: number
): number {
  const yearsFraction = monthsAhead / 12;
  return categoryTotalsList.reduce((sum, cat) => {
    const rate = (cat.growthRate * growthMultiplier) / 100;
    return sum + cat.total * Math.pow(1 + rate, yearsFraction);
  }, 0);
}

export async function computeForecast(options: {
  horizonMonths: number;
  monthlyNetSaving: number;
  /** Budget MF/SIP lines per month; defaults from recent budget if omitted. */
  monthlyMutualFundInvestment?: number;
  from?: Date;
  includeCurrentMonth?: boolean;
}): Promise<ForecastPoint[]> {
  const from = options.from ?? new Date();
  const cy = from.getFullYear();
  const cm = from.getMonth() + 1;

  const [categories, loans, ccAgg, mfMonthly] = await Promise.all([
    prisma.assetCategory.findMany({ include: { assets: true } }),
    prisma.loan.findMany({ include: { scheduleEntries: true } }),
    prisma.creditCardDebt.aggregate({ _sum: { outstanding: true } }),
    options.monthlyMutualFundInvestment != null
      ? Promise.resolve(options.monthlyMutualFundInvestment)
      : resolveMonthlyMutualFundInvestment(),
  ]);

  const cats = categoryTotals(categories);
  const ccFlat = ccAgg._sum.outstanding ?? 0;
  const { monthlyNetSaving, horizonMonths, includeCurrentMonth } = options;
  const monthlyWealthBuildup = monthlyNetSaving + mfMonthly;

  const points: ForecastPoint[] = [];

  if (includeCurrentMonth) {
    const currentNw = await calculateNetWorth(from);
    const label = new Date(cy, cm - 1, 1).toLocaleString("en-IN", {
      month: "short",
      year: "numeric",
    });
    points.push({
      label,
      year: cy,
      month: cm,
      conservativeNetWorth: currentNw.netWorth,
      expectedNetWorth: currentNw.netWorth,
    });
  }


  for (let k = 1; k <= horizonMonths; k++) {
    const { year: ty, month: tm } = addMonths(cy, cm, k);
    const label = new Date(ty, tm - 1, 1).toLocaleString("en-IN", {
      month: "short",
      year: "numeric",
    });

    let loanLiab = 0;
    for (const loan of loans) {
      loanLiab += loanOutstandingForMonth(
        loan.scheduleEntries,
        ty,
        tm,
        loan.principalAmount
      );
    }

    const expectedAssets = projectAssets(cats, k, 1);
    const conservativeAssets = projectAssets(cats, k, 0.5);

    const expectedNetWorth =
      expectedAssets + monthlyWealthBuildup * k - loanLiab - ccFlat;
    const conservativeNetWorth =
      conservativeAssets + monthlyWealthBuildup * k - loanLiab - ccFlat;

    points.push({
      label,
      year: ty,
      month: tm,
      conservativeNetWorth,
      expectedNetWorth,
    });
  }

  return points;
}

export type TrajectoryResult = {
  projectedHitDate: string | null;
  projectedValueAtTargetDate: number;
  onTrack: boolean;
  gap: number;
};

export async function computeMilestoneTrajectory(options: {
  targetAmount: number;
  targetDate: Date;
  monthlyNetSaving: number;
  monthlyMutualFundInvestment?: number;
  from?: Date;
}): Promise<TrajectoryResult> {
  const from = options.from ?? new Date();
  const cy = from.getFullYear();
  const cm = from.getMonth() + 1;
  const ty = options.targetDate.getFullYear();
  const tm = options.targetDate.getMonth() + 1;

  const deltaToTarget = monthsBetween(cy, cm, ty, tm);
  const horizonForTarget = Math.max(60, deltaToTarget + 6, 12);

  const mf =
    options.monthlyMutualFundInvestment ??
    (await resolveMonthlyMutualFundInvestment());

  const points = await computeForecast({
    horizonMonths: horizonForTarget,
    monthlyNetSaving: options.monthlyNetSaving,
    monthlyMutualFundInvestment: mf,
    from,
  });

  const targetKey = `${ty}-${String(tm).padStart(2, "0")}`;

  let projectedHitDate: string | null = null;
  for (let i = 0; i < Math.min(points.length, 60); i++) {
    const p = points[i];
    if (p.expectedNetWorth >= options.targetAmount) {
      projectedHitDate = `${p.year}-${String(p.month).padStart(2, "0")}`;
      break;
    }
  }

  let projectedValueAtTargetDate = points[0]?.expectedNetWorth ?? 0;
  for (const p of points) {
    const cmp = compareYearMonth(p.year, p.month, ty, tm);
    if (cmp === 0) {
      projectedValueAtTargetDate = p.expectedNetWorth;
      break;
    }
    if (cmp > 0) {
      projectedValueAtTargetDate = p.expectedNetWorth;
      break;
    }
    projectedValueAtTargetDate = p.expectedNetWorth;
  }

  const last = points[points.length - 1];
  if (last && compareYearMonth(last.year, last.month, ty, tm) < 0 && points.length) {
    projectedValueAtTargetDate = last.expectedNetWorth;
  }

  const onTrack =
    projectedHitDate !== null && projectedHitDate <= targetKey;

  const gap = options.targetAmount - projectedValueAtTargetDate;

  return {
    projectedHitDate,
    projectedValueAtTargetDate,
    onTrack,
    gap,
  };
}

async function loadRecentPlansForForecast() {
  return prisma.monthlyPlan.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 12,
    include: { expenseItems: true },
  });
}

/**
 * Average monthly total on budget lines that look like mutual fund / SIP
 * (same recency rules as default net saving: last 3 full-actual months, else latest planned).
 */
export async function resolveMonthlyMutualFundInvestment(): Promise<number> {
  const plans = await loadRecentPlansForForecast();

  const withActuals = plans.filter(
    (p) =>
      p.actualIncome != null &&
      p.expenseItems.every((e) => e.actualAmount != null)
  );

  const last3 = withActuals.slice(0, 3);
  if (last3.length) {
    const sums = last3.map((p) =>
      sumMutualFundBudgetLines(p.expenseItems, true)
    );
    return sums.reduce((a, b) => a + b, 0) / sums.length;
  }

  const latest = plans[0];
  if (latest) {
    return sumMutualFundBudgetLines(latest.expenseItems, false);
  }

  return 0;
}

export async function resolveDefaultMonthlySaving(): Promise<number> {
  const plans = await loadRecentPlansForForecast();

  const withActuals = plans.filter(
    (p) =>
      p.actualIncome != null &&
      p.expenseItems.every((e) => e.actualAmount != null)
  );

  const last3 = withActuals.slice(0, 3);
  if (last3.length) {
    const nets = last3.map((p) => {
      const exp = p.expenseItems.reduce((s, e) => s + (e.actualAmount ?? 0), 0);
      return (p.actualIncome ?? 0) - exp;
    });
    return nets.reduce((a, b) => a + b, 0) / nets.length;
  }

  const latest = plans[0];
  if (latest) {
    const exp = latest.expenseItems.reduce((s, e) => s + e.plannedAmount, 0);
    return latest.plannedIncome - exp;
  }

  return 0;
}
