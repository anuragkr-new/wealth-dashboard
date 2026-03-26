"use client";

import { Fragment, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";

type Row = {
  id: string;
  month: number;
  year: number;
  plannedIncome: number;
  actualIncome: number;
  plannedTotalExpense: number;
  actualTotalExpense: number;
  plannedNetSaving: number;
  actualNetSaving: number;
  overallDeviation: number;
  expenseBreakdown: Array<{
    label: string;
    planned: number;
    actual: number;
    deviation: number;
  }>;
};

export function DeviationClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/deviation")
      .then((r) => r.json())
      .then(setRows);
  }, []);

  const avg =
    rows.length > 0
      ? rows.reduce((s, r) => s + r.overallDeviation, 0) / rows.length
      : 0;
  const best = rows.reduce(
    (a, r) => (r.overallDeviation > a.overallDeviation ? r : a),
    rows[0]
  );
  const worst = rows.reduce(
    (a, r) => (r.overallDeviation < a.overallDeviation ? r : a),
    rows[0]
  );

  const chartData = [...rows]
    .reverse()
    .map((r) => ({
      label: `${String(r.month).padStart(2, "0")}/${r.year}`,
      deviation: r.overallDeviation,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Deviation log</h1>
        <p className="text-slate-500">Planned vs actual, month by month.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Months tracked
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {rows.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Avg monthly deviation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatINR(avg)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Best / worst
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {rows.length > 0 ? (
              <>
                <p className="text-green-600">
                  Best: {best.month}/{best.year} ({formatINR(best.overallDeviation)})
                </p>
                <p className="text-red-600">
                  Worst: {worst.month}/{worst.year} ({formatINR(worst.overallDeviation)})
                </p>
              </>
            ) : (
              "—"
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deviation over time</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {chartData.length === 0 ? (
            <p className="text-sm text-slate-500">No entries yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatINR(Number(v))} />
                <Tooltip formatter={(v) => formatINR(Number(v))} />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <Bar
                  dataKey="deviation"
                  fill="#4F46E5"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="p-2">Month</th>
                <th className="p-2">Planned income</th>
                <th className="p-2">Actual income</th>
                <th className="p-2">Planned exp</th>
                <th className="p-2">Actual exp</th>
                <th className="p-2">Planned net</th>
                <th className="p-2">Actual net</th>
                <th className="p-2">Deviation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr
                    className="cursor-pointer border-b hover:bg-slate-50"
                    onClick={() =>
                      setOpen((x) => (x === r.id ? null : r.id))
                    }
                  >
                    <td className="p-2">
                      {r.month}/{r.year}
                    </td>
                    <td className="p-2">{formatINR(r.plannedIncome)}</td>
                    <td className="p-2">{formatINR(r.actualIncome)}</td>
                    <td className="p-2">{formatINR(r.plannedTotalExpense)}</td>
                    <td className="p-2">{formatINR(r.actualTotalExpense)}</td>
                    <td className="p-2">{formatINR(r.plannedNetSaving)}</td>
                    <td className="p-2">{formatINR(r.actualNetSaving)}</td>
                    <td
                      className={`p-2 font-medium ${
                        r.overallDeviation >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatINR(r.overallDeviation)}
                    </td>
                  </tr>
                  {open === r.id && (
                    <tr>
                      <td colSpan={8} className="bg-slate-50 p-3 text-xs">
                        <p className="mb-2 font-medium">Expense breakdown</p>
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-slate-500">
                              <th className="p-1">Label</th>
                              <th className="p-1">Planned</th>
                              <th className="p-1">Actual</th>
                              <th className="p-1">Dev</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.expenseBreakdown.map((e, i) => (
                              <tr key={i}>
                                <td className="p-1">{e.label}</td>
                                <td className="p-1">{formatINR(e.planned)}</td>
                                <td className="p-1">{formatINR(e.actual)}</td>
                                <td
                                  className={`p-1 ${
                                    e.deviation >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {formatINR(e.deviation)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
