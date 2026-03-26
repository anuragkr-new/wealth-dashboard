"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

type Milestone = {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  status: string;
  achievedAt: string | null;
  createdAt: string;
};

export function MilestonesClient() {
  const [list, setList] = useState<Milestone[]>([]);
  const [nw, setNw] = useState<number>(0);
  const [traj, setTraj] = useState<{
    projectedHitDate: string | null;
    onTrack: boolean;
    gap: number;
    chartPoints: Array<{
      label: string;
      expectedNetWorth: number;
    }>;
    milestone: Milestone;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", targetAmount: "", targetDate: "" });

  const load = useCallback(async () => {
    const [ms, t] = await Promise.all([
      fetch("/api/milestones").then((r) => r.json()),
      fetch("/api/milestones/trajectory").then((r) =>
        r.ok ? r.json() : null
      ),
    ]);
    setList(ms);
    setTraj(t);
    const dash = await fetch("/api/dashboard").then((r) => r.json());
    setNw(dash.networth?.netWorth ?? 0);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = list.find((m) => m.status === "active");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Milestones</h1>
          <p className="text-slate-500">Targets and forecast alignment.</p>
        </div>
        <Button
          disabled={!!active}
          title={active ? "Complete or achieve the current milestone first" : ""}
          onClick={() => setOpen(true)}
        >
          Set milestone
        </Button>
      </div>

      {!active ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <p className="text-lg text-slate-600">Set your first milestone</p>
            <Button onClick={() => setOpen(true)}>Set milestone</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>{active.name}</CardTitle>
            {traj && (
              <Badge variant={traj.onTrack ? "success" : "destructive"}>
                {traj.onTrack ? "On track" : "Behind"}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-slate-600">
              Target {formatINR(active.targetAmount)} by{" "}
              {new Date(active.targetDate).toLocaleDateString("en-IN")}
            </p>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-slate-500">Current net worth</p>
                <p className="text-xl font-semibold">{formatINR(nw)}</p>
              </div>
              <div>
                <p className="text-slate-500">Target</p>
                <p className="text-xl font-semibold">
                  {formatINR(active.targetAmount)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Remaining</p>
                <p className="text-xl font-semibold">
                  {formatINR(Math.max(0, active.targetAmount - nw))}
                </p>
              </div>
            </div>
            <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full border-8 border-indigo-100">
              <span className="text-center text-lg font-bold text-indigo-700">
                {active.targetAmount > 0
                  ? `${Math.min(100, Math.round((nw / active.targetAmount) * 100))}%`
                  : "—"}
              </span>
            </div>
            {traj && (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={traj.chartPoints}>
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                    <YAxis
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) => formatINR(Number(v))}
                    />
                    <Tooltip formatter={(v) => formatINR(Number(v))} />
                    <Legend />
                    <ReferenceLine
                      y={active.targetAmount}
                      stroke="#f97316"
                      strokeDasharray="4 4"
                      label={{ value: "Target", position: "top" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expectedNetWorth"
                      name="Forecast"
                      stroke="#4F46E5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {nw >= active.targetAmount && (
              <Button
                onClick={async () => {
                  await fetch(`/api/milestones/${active.id}/achieve`, {
                    method: "POST",
                  });
                  toast({ title: "Congratulations! Milestone achieved." });
                  load();
                }}
              >
                Mark as achieved
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Achieved milestones</CardTitle>
        </CardHeader>
        <CardContent>
          {list.filter((m) => m.status === "achieved").length === 0 ? (
            <p className="text-sm text-slate-500">
              No milestones achieved yet — keep going!
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-2">Name</th>
                  <th className="p-2">Target</th>
                  <th className="p-2">Target date</th>
                  <th className="p-2">Achieved</th>
                </tr>
              </thead>
              <tbody>
                {list
                  .filter((m) => m.status === "achieved")
                  .map((m) => (
                    <tr key={m.id} className="border-b">
                      <td className="p-2">{m.name}</td>
                      <td className="p-2">{formatINR(m.targetAmount)}</td>
                      <td className="p-2">
                        {new Date(m.targetDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-2">
                        {m.achievedAt
                          ? new Date(m.achievedAt).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const dash = await fetch("/api/dashboard").then((r) => r.json());
              const current = dash.networth.netWorth;
              const tgt = Number(form.targetAmount);
              const td = new Date(form.targetDate);
              if (tgt <= current) {
                toast({
                  title: "Target must be greater than current net worth",
                  variant: "destructive",
                });
                return;
              }
              if (td <= new Date()) {
                toast({
                  title: "Target date must be in the future",
                  variant: "destructive",
                });
                return;
              }
              const res = await fetch("/api/milestones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: form.name,
                  targetAmount: tgt,
                  targetDate: form.targetDate,
                }),
              });
              if (!res.ok) {
                toast({ title: "Could not create", variant: "destructive" });
                return;
              }
              toast({ title: "Milestone set" });
              setOpen(false);
              setForm({ name: "", targetAmount: "", targetDate: "" });
              load();
            }}
          >
            <DialogHeader>
              <DialogTitle>New milestone</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((s) => ({ ...s, name: e.target.value }))
                }
              />
              <Label>Target amount (INR)</Label>
              <Input
                required
                type="number"
                value={form.targetAmount}
                onChange={(e) =>
                  setForm((s) => ({ ...s, targetAmount: e.target.value }))
                }
              />
              <Label>Target date</Label>
              <Input
                required
                type="date"
                value={form.targetDate}
                onChange={(e) =>
                  setForm((s) => ({ ...s, targetDate: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
