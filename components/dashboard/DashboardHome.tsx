"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/design/PageHeader";
import { GradientText } from "@/components/design/GradientText";
import { SectionLabel } from "@/components/design/SectionLabel";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/FadeIn";
import { cn, formatINR } from "@/lib/utils";

const CHART_ACCENT = "#0052FF";
/** Distinct hues for allocation mix (cycles if more categories than slots). */
const PIE_COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#c026d3",
  "#ca8a04",
  "#ea580c",
  "#4f46e5",
  "#0d9488",
  "#db2777",
];

type DashboardPayload = {
  networth: { grossAssets: number; totalLiabilities: number; netWorth: number };
  categories: Array<{
    id: string;
    name: string;
    icon: string | null;
    categoryTotal: number;
    pctOfGross: number;
  }>;
  snapshots: Array<{
    month: number;
    year: number;
    totalNetWorth: number;
  }>;
  activeMilestone: {
    id: string;
    name: string;
    targetAmount: number;
    targetDate: string;
  } | null;
  milestoneInsight: {
    projectedHitDate: string | null;
    onTrack: boolean;
    gap: number;
  } | null;
  budgetSummary: {
    plannedNetSaving: number;
    actualNetSaving: number | null;
    deviation: number | null;
  } | null;
  trendVsLast: number | null;
  month: number;
  year: number;
};

function GradientBorderCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-br from-accent via-accent-secondary to-accent p-[2px] shadow-accent",
        className
      )}
    >
      <div className="h-full w-full rounded-[10px] bg-card">{children}</div>
    </div>
  );
}

function HeroGraphic() {
  return (
    <div className="relative hidden h-[280px] lg:block">
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2">
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed border-accent/25 motion-safe:animate-spin-slow"
          style={{ animationDuration: "72s" }}
        />
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-accent/8 to-transparent blur-2xl" />
        <div className="absolute left-1/2 top-8 w-[200px] -translate-x-1/2 motion-safe:animate-float rounded-2xl border border-border bg-card p-4 shadow-xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Snapshot
          </p>
          <p className="mt-1 font-display text-2xl text-foreground">Net worth</p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/3 rounded-full gradient-bg" />
          </div>
        </div>
        <div
          className="absolute bottom-6 right-2 h-14 w-14 rounded-xl gradient-bg shadow-accent-lg motion-safe:animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>
    </div>
  );
}

export function DashboardHome() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      })
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) {
    return (
      <FadeIn>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-8">
            <p className="text-destructive">{err}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Check <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">DATABASE_URL</code> in{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env</code>, then run{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">npx prisma db push</code> and{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">npm run db:seed</code>.
            </p>
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  if (!data) {
    return (
      <div className="space-y-10">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-14 w-full max-w-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const {
    networth,
    categories,
    snapshots,
    activeMilestone,
    milestoneInsight,
    budgetSummary,
    trendVsLast,
  } = data;

  const lineData = snapshots.map((s) => ({
    label: `${String(s.month).padStart(2, "0")}/${s.year}`,
    netWorth: s.totalNetWorth,
  }));

  const pieData = categories
    .filter((c) => c.categoryTotal > 0)
    .map((c, i) => ({
      name: c.name,
      value: c.categoryTotal,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));

  const milestonePct =
    activeMilestone && activeMilestone.targetAmount > 0
      ? Math.min(
          100,
          (networth.netWorth / activeMilestone.targetAmount) * 100
        )
      : 0;

  return (
    <div className="space-y-16 lg:space-y-24">
      {/* Hero */}
      <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <FadeIn>
          <PageHeader
            label="Overview"
            description="Net worth, allocation, and this month at a glance — structured for clarity, tuned for decisions."
          >
            <>
              Your <GradientText>wealth</GradientText>, in one calm view.
            </>
          </PageHeader>
        </FadeIn>
        <HeroGraphic />
      </section>

      {/* Inverted stats */}
      <FadeIn as="section" delay={0.05}>
        <div className="relative overflow-hidden rounded-2xl bg-foreground px-6 py-12 text-white sm:px-10 sm:py-14 dot-pattern-dark">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/15 blur-[100px]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-accent-secondary/10 blur-[80px]" />
          <SectionLabel className="mb-8 border-white/20 bg-white/5 text-white [&_span.font-mono]:text-accent-secondary [&_span.h-2]:bg-gradient-to-r [&_span.h-2]:from-accent [&_span.h-2]:to-accent-secondary">
            Position
          </SectionLabel>
          <div className="relative grid gap-8 sm:grid-cols-3 sm:gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-white/50">
                Gross assets
              </p>
              <p className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
                {formatINR(networth.grossAssets)}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-white/50">
                Liabilities
              </p>
              <p className="mt-2 font-display text-3xl tracking-tight text-red-300 sm:text-4xl">
                {formatINR(networth.totalLiabilities)}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-white/50">
                Net worth
              </p>
              <p className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
                <span className="gradient-text">{formatINR(networth.netWorth)}</span>
              </p>
              {trendVsLast != null && (
                <p
                  className={cn(
                    "mt-2 text-sm",
                    trendVsLast >= 0 ? "text-emerald-300" : "text-red-300"
                  )}
                >
                  {trendVsLast >= 0 ? "+" : ""}
                  {formatINR(trendVsLast)} vs last month
                </p>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Milestone */}
      {activeMilestone && milestoneInsight && (
        <FadeIn>
          <GradientBorderCard>
            <Card className="border-0 shadow-none">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  <CardTitle className="text-xl">Milestone</CardTitle>
                </div>
                <Badge variant={milestoneInsight.onTrack ? "success" : "destructive"}>
                  {milestoneInsight.onTrack ? "On track" : "Behind"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-display text-2xl text-foreground">
                  {activeMilestone.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Target {formatINR(activeMilestone.targetAmount)} by{" "}
                  {new Date(activeMilestone.targetDate).toLocaleDateString("en-IN")}
                </p>
                <Progress value={milestonePct} className="h-3" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {milestoneInsight.projectedHitDate
                    ? `Forecast first crosses target in ${milestoneInsight.projectedHitDate}.`
                    : "Target not reached within 60 months on the expected path."}{" "}
                  {!milestoneInsight.onTrack && (
                    <span className="text-destructive">
                      Gap at target date: {formatINR(Math.abs(milestoneInsight.gap))}
                    </span>
                  )}
                </p>
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/milestones" className="gap-1">
                    View milestones
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </GradientBorderCard>
        </FadeIn>
      )}

      {/* Categories */}
      <FadeIn as="section">
        <SectionLabel className="mb-6">Allocation</SectionLabel>
        <h2 className="font-display text-3xl text-foreground lg:text-[2.25rem]">
          By <GradientText>category</GradientText>
        </h2>
        <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <StaggerItem key={c.id}>
              <Card className="group h-full overflow-hidden border-border/80 hover:border-accent/20">
                <div className="h-1 w-full bg-gradient-to-r from-accent/0 via-accent/40 to-accent-secondary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg gradient-bg text-lg text-white shadow-sm">
                      {c.icon ?? "•"}
                    </span>
                    {c.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-2xl text-foreground">
                    {formatINR(c.categoryTotal)}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {c.pctOfGross.toFixed(1)}% of gross assets
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </FadeIn>

      {/* Charts */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <FadeIn>
          <Card>
            <CardHeader>
              <SectionLabel className="mb-0 border-0 bg-transparent p-0">
                History
              </SectionLabel>
              <CardTitle className="pt-2 font-display text-2xl">
                Net worth over time
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {lineData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No snapshots yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(v) => formatINR(Number(v))}
                    />
                    <Tooltip
                      formatter={(v) => formatINR(Number(v))}
                      labelFormatter={(l) => String(l)}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        boxShadow: "0 10px 15px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="netWorth"
                      stroke={CHART_ACCENT}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.08}>
          <Card>
            <CardHeader>
              <SectionLabel className="mb-0 border-0 bg-transparent p-0">
                Mix
              </SectionLabel>
              <CardTitle className="pt-2 font-display text-2xl">
                Asset allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add assets to see allocation.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={52}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {pieData.map((entry, i) => (
                        <Cell
                          key={`slice-${i}`}
                          fill={entry.fill}
                          stroke="var(--card)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => formatINR(Number(v))}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "0 10px 15px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      layout="horizontal"
                      wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Budget */}
      <FadeIn>
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <SectionLabel className="mb-3">Cash flow</SectionLabel>
              <CardTitle className="font-display text-2xl">This month&apos;s budget</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/budget" className="gap-1">
                Open planner
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!budgetSummary ? (
              <p className="text-sm text-muted-foreground">No plan for this month yet.</p>
            ) : (
              <div className="grid gap-6 text-sm sm:grid-cols-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Planned net
                  </p>
                  <p className="mt-2 font-display text-xl">{formatINR(budgetSummary.plannedNetSaving)}</p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Actual net
                  </p>
                  <p className="mt-2 font-display text-xl">
                    {budgetSummary.actualNetSaving != null
                      ? formatINR(budgetSummary.actualNetSaving)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Deviation
                  </p>
                  <p
                    className={cn(
                      "mt-2 font-display text-xl",
                      budgetSummary.deviation == null
                        ? ""
                        : budgetSummary.deviation >= 0
                          ? "text-success"
                          : "text-destructive"
                    )}
                  >
                    {budgetSummary.deviation != null
                      ? formatINR(budgetSummary.deviation)
                      : "—"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
