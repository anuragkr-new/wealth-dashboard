"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

type Cat = { id: string; name: string; growthRate: number };

export function ForecastClient() {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [monthlySaving, setMonthlySaving] = useState("");
  const [points, setPoints] = useState<
    Array<{
      label: string;
      conservativeNetWorth: number;
      expectedNetWorth: number;
    }>
  >([]);
  const [mfFromBudget, setMfFromBudget] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshCategories() {
    const r = await fetch("/api/categories");
    const data = await r.json();
    setCategories(
      data.map((c: { id: string; name: string; growthRate: number }) => ({
        id: c.id,
        name: c.name,
        growthRate: c.growthRate,
      }))
    );
  }

  async function loadForecast(override?: string) {
    setLoading(true);
    const q =
      override != null && override !== ""
        ? `?monthlyNetSaving=${encodeURIComponent(override)}`
        : "";
    const r = await fetch(`/api/forecast${q}`);
    const data = await r.json();
    setPoints(data.points);
    setMonthlySaving(String(data.monthlyNetSaving ?? ""));
    setMfFromBudget(
      typeof data.monthlyMutualFundFromBudget === "number"
        ? data.monthlyMutualFundFromBudget
        : null
    );
    setLoading(false);
  }

  useEffect(() => {
    refreshCategories().then(() => loadForecast());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Forecast</h1>
        <p className="text-slate-500">12-month net worth projection.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Assumptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Monthly net saving (override)</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  type="number"
                  value={monthlySaving}
                  onChange={(e) => setMonthlySaving(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={() => loadForecast(monthlySaving)}
                >
                  Apply
                </Button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Defaults from recent actuals or latest plan. Expense lines
                labelled like mutual funds / SIP / ELSS count as investing, not
                spending:{" "}
                {mfFromBudget != null && mfFromBudget > 0 ? (
                  <>
                    <span className="font-medium text-slate-700">
                      {formatINR(mfFromBudget)}/mo
                    </span>{" "}
                    from your budget is added in the forecast on top of the
                    number above.
                  </>
                ) : (
                  <>none detected in recent months — name a line e.g. SIP or Mutual funds.</>
                )}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Category growth % (updates DB)</Label>
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{c.name}</span>
                  <Input
                    className="h-8 w-20"
                    type="number"
                    defaultValue={c.growthRate}
                    onBlur={async (e) => {
                      await fetch(`/api/categories/${c.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          growthRate: Number(e.target.value),
                        }),
                      });
                      toast({ title: `${c.name} growth updated` });
                      refreshCategories();
                      loadForecast(monthlySaving);
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Projected net worth</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            {loading ? (
              <p className="text-slate-500">Calculating…</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => formatINR(Number(v))}
                  />
                  <Tooltip formatter={(v) => formatINR(Number(v))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="conservativeNetWorth"
                    name="Conservative (50% growth)"
                    stroke="#94a3b8"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expectedNetWorth"
                    name="Expected"
                    stroke="#4F46E5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
