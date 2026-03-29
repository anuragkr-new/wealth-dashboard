"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

type Plan = {
  id: string;
  expenseItems: Array<{ id: string; label: string; plannedAmount: number; actualAmount: number | null }>;
};

type Summary = {
  byExpenseItemId: Record<string, number>;
  unassignedTotal: number;
  unassignedCount: number;
  unassignedLines: Array<{
    id: string;
    amount: number;
    description: string;
    txnDate: string;
    source: string;
  }>;
  recentImports: Array<{
    id: string;
    source: string;
    fileName: string;
    rowCount: number;
    inserted: number;
    skippedDup: number;
    createdAt: string;
  }>;
};

const SOURCES = [
  { value: "PHONEPE", label: "PhonePe / Google Pay (CSV)" },
  { value: "ICICI_BANK", label: "ICICI Bank (CSV or PDF)" },
  { value: "CREDIT_CARD", label: "Credit card (CSV)" },
] as const;

type Props = {
  monthKey: string;
  plan: Plan | null;
  onReload: () => void;
};

function isPdfFile(f: File | null): boolean {
  if (!f) return false;
  const n = f.name.toLowerCase();
  return f.type === "application/pdf" || n.endsWith(".pdf");
}

export function StatementImportTab({ monthKey, plan, onReload }: Props) {
  const [source, setSource] = useState<string>("PHONEPE");
  const [file, setFile] = useState<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [applying, setApplying] = useState(false);

  const loadSummary = useCallback(async () => {
    const r = await fetch(`/api/budget/${monthKey}/import-summary`);
    if (r.ok) setSummary(await r.json());
  }, [monthKey]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  async function upload() {
    if (!file) {
      toast({ title: "Choose a CSV or PDF file", variant: "destructive" });
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("source", source);
    if (isPdfFile(file) && pdfPassword.length > 0) {
      fd.set("pdfPassword", pdfPassword);
    }
    const res = await fetch("/api/import/statement", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast({ title: j.error ?? "Upload failed", variant: "destructive" });
      return;
    }
    const j = await res.json();
    toast({
      title: "Import complete",
      description: `${j.inserted} new · ${j.skippedDup} duplicates skipped`,
    });
    setFile(null);
    setPdfPassword("");
    await loadSummary();
  }

  async function applyToActuals() {
    if (!plan) return;
    setApplying(true);
    const res = await fetch(`/api/budget/${monthKey}/apply-imports`, {
      method: "POST",
    });
    setApplying(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast({ title: j.error ?? "Apply failed", variant: "destructive" });
      return;
    }
    toast({ title: "Actuals updated from imports" });
    onReload();
    await loadSummary();
  }

  async function assignLine(lineId: string, expenseItemId: string) {
    const res = await fetch(`/api/import/lines/${lineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseItemId: expenseItemId || null }),
    });
    if (!res.ok) {
      toast({ title: "Could not update line", variant: "destructive" });
      return;
    }
    await loadSummary();
    onReload();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload statement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use CSV from PhonePe, your card issuer, or ICICI. For ICICI you can upload an account
            statement PDF. If the PDF is password-protected, enter the password below—it is used
            only for this upload and is not saved. Re-uploading the same file skips rows we
            already stored (deduplicated).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File</Label>
              <input
                type="file"
                accept=".csv,text/csv,.pdf,application/pdf"
                className="mt-2 block w-full text-sm"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setPdfPassword("");
                }}
              />
            </div>
          </div>
          {isPdfFile(file) ? (
            <div>
              <Label htmlFor="statement-pdf-password">PDF password (optional)</Label>
              <Input
                id="statement-pdf-password"
                type="password"
                autoComplete="off"
                placeholder="Only if the PDF is encrypted"
                className="mt-1"
                value={pdfPassword}
                onChange={(e) => setPdfPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Not stored on the server—sent once with this upload over HTTPS.
              </p>
            </div>
          ) : null}
          <Button disabled={uploading} onClick={() => void upload()}>
            {uploading ? "Uploading…" : "Import"}
          </Button>
        </CardContent>
      </Card>

      {summary && summary.recentImports.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent imports</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {summary.recentImports.map((im) => (
                <li key={im.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2">
                  <span>
                    {im.fileName} · {im.source.replace("_", " ")}
                  </span>
                  <span className="text-muted-foreground">
                    +{im.inserted} new, {im.skippedDup} dup
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {plan && summary ? (
        <Card>
          <CardHeader>
            <CardTitle>This month · from statements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Budget line</th>
                  <th className="p-2">Imported spend</th>
                </tr>
              </thead>
              <tbody>
                {plan.expenseItems.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">{row.label}</td>
                    <td className="p-2 font-medium tabular-nums">
                      {formatINR(summary.byExpenseItemId[row.id] ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {summary.unassignedCount > 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Unassigned: {formatINR(summary.unassignedTotal)} ({summary.unassignedCount}{" "}
                  transactions)
                </p>
                <p className="mt-1 text-muted-foreground">
                  Match budget line labels inside descriptions, or assign manually below.
                </p>
              </div>
            ) : null}
            {summary.unassignedLines.length > 0 ? (
              <div className="space-y-2">
                <Label>Assign unassigned</Label>
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {summary.unassignedLines.map((ln) => (
                    <li
                      key={ln.id}
                      className="flex flex-col gap-2 rounded-lg border border-border p-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{ln.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ln.txnDate).toLocaleDateString("en-IN")} · {ln.source} ·{" "}
                          {formatINR(ln.amount)}
                        </p>
                      </div>
                      <Select
                        onValueChange={(v) => void assignLine(ln.id, v)}
                      >
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Budget line…" />
                        </SelectTrigger>
                        <SelectContent>
                          {plan.expenseItems.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Button disabled={applying} variant="secondary" onClick={() => void applyToActuals()}>
              {applying ? "Applying…" : "Apply imported totals to Actual column"}
            </Button>
          </CardContent>
        </Card>
      ) : !plan ? (
        <p className="text-sm text-muted-foreground">
          Create a monthly plan first to map spending to budget lines and apply actuals.
        </p>
      ) : null}
    </div>
  );
}
