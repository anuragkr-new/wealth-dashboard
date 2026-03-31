"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR, monthYearKey, addMonths } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatementImportTab } from "@/components/budget/StatementImportTab";

type Plan = {
  id: string;
  month: number;
  year: number;
  plannedIncome: number;
  actualIncome: number | null;
  expenseItems: Array<{
    id: string;
    label: string;
    plannedAmount: number;
    actualAmount: number | null;
  }>;
  liquidityAccounts: Array<{
    id: string;
    label: string;
    amount: number;
  }>;
  liquidityReceivables: Array<{
    id: string;
    label: string;
    amount: number;
  }>;
  liquidityExpenses: Array<{
    id: string;
    label: string;
    amount: number;
  }>;
};

export function BudgetClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyFromUrl = searchParams.get("month");

  const today = new Date();
  const defaultKey = monthYearKey(today.getFullYear(), today.getMonth() + 1);
  const monthKey = keyFromUrl && /^\d{4}-\d{2}$/.test(keyFromUrl) ? keyFromUrl : defaultKey;

  const [year, month] = useMemo(() => {
    const [y, m] = monthKey.split("-").map(Number);
    return [y, m];
  }, [monthKey]);

  const setMonthKey = (yk: string) => {
    router.push(`/budget?month=${yk}`);
  };

  const shift = (delta: number) => {
    const { year: ny, month: nm } = addMonths(year, month, delta);
    setMonthKey(monthYearKey(ny, nm));
  };

  const [plan, setPlan] = useState<Plan | null>(null);
  const [debtSummary, setDebtSummary] = useState<{
    totalLoanOutstanding: number;
    totalCreditCard: number;
    totalLiabilities: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [logged, setLogged] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    plannedIncome: "",
    lines: [{ label: "", amount: "" }],
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [p, d, debt] = await Promise.all([
      fetch(`/api/budget/${monthKey}`).then((r) => r.json()),
      fetch(`/api/deviation`).then((r) => r.json()),
      fetch("/api/debts/summary").then((r) => r.json()),
    ]);
    setPlan(p);
    setDebtSummary(debt);
    setLogged(
      Array.isArray(d) &&
        d.some((x: { month: number; year: number }) => x.month === month && x.year === year)
    );
    setLoading(false);
  }, [monthKey, month, year]);

  useEffect(() => {
    load();
  }, [load]);

  async function savePlan(next: Plan) {
    const res = await fetch(`/api/budget/${monthKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plannedIncome: next.plannedIncome,
        actualIncome: next.actualIncome,
        expenseItems: next.expenseItems.map((e) => ({
          id: e.id,
          label: e.label,
          plannedAmount: e.plannedAmount,
          actualAmount: e.actualAmount,
        })),
        liquidityAccounts: next.liquidityAccounts.map((e) => ({
          id: e.id,
          label: e.label,
          amount: e.amount,
        })),
        liquidityReceivables: next.liquidityReceivables.map((e) => ({
          id: e.id,
          label: e.label,
          amount: e.amount,
        })),
        liquidityExpenses: next.liquidityExpenses.map((e) => ({
          id: e.id,
          label: e.label,
          amount: e.amount,
        })),
      }),
    });
    if (!res.ok) toast({ title: "Save failed", variant: "destructive" });
    else toast({ title: "Saved" });
    load();
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Budget</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[8rem] text-center font-medium">
            {new Date(year, month - 1, 1).toLocaleString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <Button variant="outline" size="icon" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="plan" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
          <TabsTrigger value="imports">Statement imports</TabsTrigger>
        </TabsList>
        <TabsContent value="plan" className="space-y-6">
          {!plan ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-10">
                <p className="text-slate-500">No plan for this month.</p>
                <Button onClick={() => setCreateOpen(true)}>Create plan</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Income</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <div>
                    <Label>Planned</Label>
                    <Input
                      type="number"
                      defaultValue={plan.plannedIncome}
                      onBlur={(e) =>
                        savePlan({
                          ...plan,
                          plannedIncome: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Actual</Label>
                    <Input
                      type="number"
                      defaultValue={plan.actualIncome ?? ""}
                      placeholder="After month end"
                      onBlur={(e) =>
                        savePlan({
                          ...plan,
                          actualIncome: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Expenses</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      savePlan({
                        ...plan,
                        expenseItems: [
                          ...plan.expenseItems,
                          {
                            id: "",
                            label: "New",
                            plannedAmount: 0,
                            actualAmount: null,
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add line
                  </Button>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="p-2">Label</th>
                        <th className="p-2">Planned</th>
                        <th className="p-2">Actual</th>
                        <th className="p-2">Deviation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.expenseItems.map((row) => {
                        const dev =
                          row.actualAmount != null
                            ? row.actualAmount - row.plannedAmount
                            : null;
                        return (
                          <tr key={row.id || row.label} className="border-b">
                            <td className="p-2">
                              <Input
                                defaultValue={row.label}
                                onBlur={(e) =>
                                  savePlan({
                                    ...plan,
                                    expenseItems: plan.expenseItems.map((x) =>
                                      x.id === row.id
                                        ? { ...x, label: e.target.value }
                                        : x
                                    ),
                                  })
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                defaultValue={row.plannedAmount}
                                onBlur={(e) =>
                                  savePlan({
                                    ...plan,
                                    expenseItems: plan.expenseItems.map((x) =>
                                      x.id === row.id
                                        ? {
                                            ...x,
                                            plannedAmount: Number(e.target.value),
                                          }
                                        : x
                                    ),
                                  })
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                defaultValue={row.actualAmount ?? ""}
                                onBlur={(e) =>
                                  savePlan({
                                    ...plan,
                                    expenseItems: plan.expenseItems.map((x) =>
                                      x.id === row.id
                                        ? {
                                            ...x,
                                            actualAmount:
                                              e.target.value === ""
                                                ? null
                                                : Number(e.target.value),
                                          }
                                        : x
                                    ),
                                  })
                                }
                              />
                            </td>
                            <td
                              className={`p-2 font-medium ${
                                dev == null
                                  ? ""
                                  : dev >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                              }`}
                            >
                              {dev == null ? "—" : formatINR(dev)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
                  {(() => {
                    const plannedExp = plan.expenseItems.reduce(
                      (s, e) => s + e.plannedAmount,
                      0
                    );
                    const actualExp = plan.expenseItems.every(
                      (e) => e.actualAmount != null
                    )
                      ? plan.expenseItems.reduce(
                          (s, e) => s + (e.actualAmount ?? 0),
                          0
                        )
                      : null;
                    const plannedNet = plan.plannedIncome - plannedExp;
                    const actualNet =
                      plan.actualIncome != null && actualExp != null
                        ? plan.actualIncome - actualExp
                        : null;
                    const overall =
                      actualNet != null ? actualNet - plannedNet : null;
                    return (
                      <>
                        <div>
                          <p className="text-slate-500">Planned net saving</p>
                          <p className="text-lg font-semibold">
                            {formatINR(plannedNet)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Actual net saving</p>
                          <p className="text-lg font-semibold">
                            {actualNet != null ? formatINR(actualNet) : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Overall deviation</p>
                          <p
                            className={`text-lg font-semibold ${
                              overall == null
                                ? ""
                                : overall >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                            }`}
                          >
                            {overall != null ? formatINR(overall) : "—"}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {logged ? (
                <p className="text-sm text-slate-500">Deviation already logged for this month.</p>
              ) : (
                <Button
                  disabled={
                    plan.actualIncome == null ||
                    plan.expenseItems.some((e) => e.actualAmount == null)
                  }
                  onClick={async () => {
                    const res = await fetch(`/api/budget/${monthKey}/actuals`, {
                      method: "POST",
                    });
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      toast({
                        title: j.error ?? "Lock failed",
                        variant: "destructive",
                      });
                      return;
                    }
                    toast({ title: "Deviation logged" });
                    load();
                  }}
                >
                  Lock & log deviation
                </Button>
              )}
            </>
          )}
        </TabsContent>
        <TabsContent value="liquidity" className="space-y-6">
          {!plan ? (
            <Card>
              <CardContent className="py-10 text-center text-slate-500">
                Create this month&apos;s plan to start tracking liquidity.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Current Liquidity</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      savePlan({
                        ...plan,
                        liquidityAccounts: [
                          ...plan.liquidityAccounts,
                          { id: "", label: "New account", amount: 0 },
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add source
                  </Button>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="p-2">Account/Bucket</th>
                        <th className="p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.liquidityAccounts.map((row) => (
                        <tr key={row.id || row.label} className="border-b">
                          <td className="p-2">
                            <Input
                              defaultValue={row.label}
                              onBlur={(e) =>
                                savePlan({
                                  ...plan,
                                  liquidityAccounts: plan.liquidityAccounts.map((x) =>
                                    x.id === row.id ? { ...x, label: e.target.value } : x
                                  ),
                                })
                              }
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              defaultValue={row.amount}
                              onBlur={(e) =>
                                savePlan({
                                  ...plan,
                                  liquidityAccounts: plan.liquidityAccounts.map((x) =>
                                    x.id === row.id
                                      ? { ...x, amount: Number(e.target.value) || 0 }
                                      : x
                                  ),
                                })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Money to be received</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      savePlan({
                        ...plan,
                        liquidityReceivables: [
                          ...plan.liquidityReceivables,
                          { id: "", label: "New receivable", amount: 0 },
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add receivable
                  </Button>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="p-2">Source</th>
                        <th className="p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.liquidityReceivables.map((row) => (
                        <tr key={row.id || row.label} className="border-b">
                          <td className="p-2">
                            <Input
                              defaultValue={row.label}
                              onBlur={(e) =>
                                savePlan({
                                  ...plan,
                                  liquidityReceivables: plan.liquidityReceivables.map((x) =>
                                    x.id === row.id ? { ...x, label: e.target.value } : x
                                  ),
                                })
                              }
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              defaultValue={row.amount}
                              onBlur={(e) =>
                                savePlan({
                                  ...plan,
                                  liquidityReceivables: plan.liquidityReceivables.map((x) =>
                                    x.id === row.id
                                      ? { ...x, amount: Number(e.target.value) || 0 }
                                      : x
                                  ),
                                })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Credit Card Debts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">
                    Read-only from Debts section
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatINR(debtSummary?.totalCreditCard ?? 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Expenses</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      savePlan({
                        ...plan,
                        liquidityExpenses: [
                          ...plan.liquidityExpenses,
                          { id: "", label: "New expense", amount: 0 },
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add expense
                  </Button>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="p-2">Label</th>
                        <th className="p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.liquidityExpenses.map((row) => (
                        <tr key={row.id || row.label} className="border-b">
                          <td className="p-2">
                            <Input
                              defaultValue={row.label}
                              onBlur={(e) =>
                                savePlan({
                                  ...plan,
                                  liquidityExpenses: plan.liquidityExpenses.map((x) =>
                                    x.id === row.id ? { ...x, label: e.target.value } : x
                                  ),
                                })
                              }
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              defaultValue={row.amount}
                              onBlur={(e) =>
                                savePlan({
                                  ...plan,
                                  liquidityExpenses: plan.liquidityExpenses.map((x) =>
                                    x.id === row.id
                                      ? { ...x, amount: Number(e.target.value) || 0 }
                                      : x
                                  ),
                                })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Net Liquidity Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                  {(() => {
                    const currentLiquidity = plan.liquidityAccounts.reduce(
                      (s, e) => s + e.amount,
                      0
                    );
                    const receivables = plan.liquidityReceivables.reduce(
                      (s, e) => s + e.amount,
                      0
                    );
                    const liquidityExpenses = plan.liquidityExpenses.reduce(
                      (s, e) => s + e.amount,
                      0
                    );
                    const creditCardDebt = debtSummary?.totalCreditCard ?? 0;
                    const netLiquidity =
                      currentLiquidity +
                      receivables -
                      creditCardDebt -
                      liquidityExpenses;
                    return (
                      <>
                        <div>
                          <p className="text-slate-500">Current liquidity</p>
                          <p className="text-lg font-semibold">
                            {formatINR(currentLiquidity)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Receivables</p>
                          <p className="text-lg font-semibold">
                            {formatINR(receivables)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Credit card debts</p>
                          <p className="text-lg font-semibold">
                            {formatINR(creditCardDebt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Expenses</p>
                          <p className="text-lg font-semibold">
                            {formatINR(liquidityExpenses)}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-slate-500">Net liquidity</p>
                          <p className="text-2xl font-bold">
                            {formatINR(netLiquidity)}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        <TabsContent value="imports">
          <StatementImportTab
            monthKey={monthKey}
            plan={plan}
            onReload={() => void load()}
          />
        </TabsContent>
      </Tabs>


      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create monthly plan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Planned income</Label>
            <Input
              type="number"
              value={createForm.plannedIncome}
              onChange={(e) =>
                setCreateForm((s) => ({ ...s, plannedIncome: e.target.value }))
              }
            />
            {createForm.lines.map((line, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  placeholder="Label"
                  value={line.label}
                  onChange={(e) => {
                    const lines = [...createForm.lines];
                    lines[idx] = { ...lines[idx], label: e.target.value };
                    setCreateForm((s) => ({ ...s, lines }));
                  }}
                />
                <Input
                  placeholder="Amount"
                  type="number"
                  value={line.amount}
                  onChange={(e) => {
                    const lines = [...createForm.lines];
                    lines[idx] = { ...lines[idx], amount: e.target.value };
                    setCreateForm((s) => ({ ...s, lines }));
                  }}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCreateForm((s) => ({
                  ...s,
                  lines: [...s.lines, { label: "", amount: "" }],
                }))
              }
            >
              Add expense line
            </Button>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                const res = await fetch("/api/budget", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    month,
                    year,
                    plannedIncome: Number(createForm.plannedIncome),
                    expenseItems: createForm.lines
                      .filter((l) => l.label)
                      .map((l) => ({
                        label: l.label,
                        plannedAmount: Number(l.amount) || 0,
                      })),
                  }),
                });
                if (!res.ok) {
                  toast({ title: "Could not create", variant: "destructive" });
                  return;
                }
                toast({ title: "Plan created" });
                setCreateOpen(false);
                load();
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
