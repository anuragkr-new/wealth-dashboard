"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { scheduleOutstandingAsOf } from "@/lib/loans";
import { formatINR } from "@/lib/utils";
import {
  parseLoanScheduleCsv,
  parseLoanScheduleXlsx,
  deriveLoanFromSchedule,
  type ParsedScheduleRow,
} from "@/lib/loanParser";
import { toast } from "@/components/ui/use-toast";

type LoanRow = {
  id: string;
  name: string;
  lender: string | null;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  startDate: string;
  emiAmount: number;
  currentOutstanding: number;
  repaidPercent: number;
};

export function DebtsClient() {
  const [summary, setSummary] = useState<{
    totalLoanOutstanding: number;
    totalCreditCard: number;
    totalLiabilities: number;
  } | null>(null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [cards, setCards] = useState<
    Array<{ id: string; cardName: string; outstanding: number; updatedAt: string }>
  >([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [schedules, setSchedules] = useState<Record<string, unknown[]>>({});
  const [loanOpen, setLoanOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [updateCard, setUpdateCard] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoanId, setDeleteLoanId] = useState<string | null>(null);
  const [scheduleLoanId, setScheduleLoanId] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedScheduleRow[] | null>(
    null
  );
  const [newLoanScheduleRows, setNewLoanScheduleRows] =
    useState<ParsedScheduleRow[] | null>(null);

  const [loanForm, setLoanForm] = useState({
    name: "",
    lender: "",
    principalAmount: "",
    interestRate: "",
    tenureMonths: "",
    startDate: "",
    emiAmount: "",
    notes: "",
  });
  const [cardForm, setCardForm] = useState({ cardName: "", outstanding: "" });
  const [balanceInput, setBalanceInput] = useState("");

  const newLoanOutstandingAsOfMonth = useMemo(() => {
    if (!newLoanScheduleRows?.length) return null;
    const d = new Date();
    const principal = Number(loanForm.principalAmount);
    return scheduleOutstandingAsOf(
      newLoanScheduleRows,
      d.getFullYear(),
      d.getMonth() + 1,
      principal > 0 ? principal : undefined
    );
  }, [newLoanScheduleRows, loanForm.principalAmount]);

  const load = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7439/ingest/1dc070df-a61f-458e-8ec9-144680a2ac1b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'553583'},body:JSON.stringify({sessionId:'553583',runId:'initial',hypothesisId:'H1',location:'components/debts/DebtsClient.tsx:load:start',message:'Debts load started',data:{path:'/debts'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const [sRes, lRes, cRes] = await Promise.all([
      fetch("/api/debts/summary"),
      fetch("/api/debts/loans"),
      fetch("/api/debts/credit-cards"),
    ]);
    const [s, l, c] = await Promise.all([sRes.json(), lRes.json(), cRes.json()]);
    // #region agent log
    fetch('http://127.0.0.1:7439/ingest/1dc070df-a61f-458e-8ec9-144680a2ac1b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'553583'},body:JSON.stringify({sessionId:'553583',runId:'initial',hypothesisId:'H2',location:'components/debts/DebtsClient.tsx:load:responses',message:'Debts API response shapes',data:{summaryStatus:sRes.status,loansStatus:lRes.status,cardsStatus:cRes.status,summaryArray:Array.isArray(s),loansArray:Array.isArray(l),cardsArray:Array.isArray(c),summaryKeys:typeof s==='object'&&s?Object.keys(s as Record<string, unknown>).slice(0,5):[]},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const loansSafe = Array.isArray(l) ? l : [];
    const cardsSafe = Array.isArray(c) ? c : [];
    const summarySafe =
      s && typeof s === "object" && !Array.isArray(s)
        ? {
            totalLoanOutstanding: Number(
              (s as { totalLoanOutstanding?: number }).totalLoanOutstanding ?? 0
            ),
            totalCreditCard: Number(
              (s as { totalCreditCard?: number }).totalCreditCard ?? 0
            ),
            totalLiabilities: Number(
              (s as { totalLiabilities?: number }).totalLiabilities ?? 0
            ),
          }
        : { totalLoanOutstanding: 0, totalCreditCard: 0, totalLiabilities: 0 };
    setSummary(summarySafe);
    setLoans(loansSafe);
    setCards(cardsSafe);
    if ([sRes.status, lRes.status, cRes.status].some((st) => st === 401)) {
      toast({
        title: "Session expired",
        description: "Please sign in again.",
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createLoan(e: React.FormEvent) {
    e.preventDefault();
    if (!newLoanScheduleRows?.length) {
      toast({
        title: "Upload a schedule file first",
        description: "EMI, principal, tenure, and start date are taken from the file.",
        variant: "destructive",
      });
      return;
    }
    const res = await fetch("/api/debts/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: loanForm.name,
        lender: loanForm.lender || null,
        principalAmount: Number(loanForm.principalAmount),
        interestRate: Number(loanForm.interestRate),
        tenureMonths: Number(loanForm.tenureMonths),
        startDate: loanForm.startDate,
        emiAmount: Number(loanForm.emiAmount),
        notes: loanForm.notes || null,
      }),
    });
    if (!res.ok) {
      toast({ title: "Could not create loan", variant: "destructive" });
      return;
    }
    const loan = await res.json();
    const schedRes = await fetch(`/api/debts/loans/${loan.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: newLoanScheduleRows,
        replace: true,
      }),
    });
    if (!schedRes.ok) {
      toast({
        title: "Loan saved — schedule import failed",
        description: "Upload the schedule from the loan card.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Loan and amortisation schedule saved" });
    }
    setLoanOpen(false);
    setNewLoanScheduleRows(null);
    setScheduleLoanId(null);
    setPreviewRows(null);
    setLoanForm({
      name: "",
      lender: "",
      principalAmount: "",
      interestRate: "0",
      tenureMonths: "",
      startDate: "",
      emiAmount: "",
      notes: "",
    });
    load();
  }

  async function onNewLoanScheduleFile(file: File) {
    try {
      let rows: ParsedScheduleRow[];
      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        rows = parseLoanScheduleCsv(text);
      } else {
        const buf = await file.arrayBuffer();
        rows = parseLoanScheduleXlsx(buf);
      }
      const derived = deriveLoanFromSchedule(rows);
      if (!derived) {
        throw new Error("No valid rows in file");
      }
      setNewLoanScheduleRows(rows);
      setLoanForm((s) => ({
        ...s,
        principalAmount: String(derived.principalAmount),
        interestRate: String(derived.interestRate),
        tenureMonths: String(derived.tenureMonths),
        startDate: derived.startDate,
        emiAmount: String(derived.emiAmount),
      }));
      toast({
        title: "Schedule loaded",
        description: `${rows.length} rows — add a loan name and save.`,
      });
    } catch (err) {
      toast({
        title: "Could not read schedule",
        description: String(err),
        variant: "destructive",
      });
    }
  }

  async function onScheduleFile(file: File) {
    try {
      let rows;
      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        rows = parseLoanScheduleCsv(text);
      } else {
        const buf = await file.arrayBuffer();
        rows = parseLoanScheduleXlsx(buf);
      }
      setPreviewRows(rows);
    } catch (e) {
      toast({
        title: "Parse error",
        description: String(e),
        variant: "destructive",
      });
    }
  }

  async function confirmScheduleImport(replace: boolean) {
    if (!scheduleLoanId || !previewRows?.length) return;
    const res = await fetch(`/api/debts/loans/${scheduleLoanId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: previewRows, replace }),
    });
    if (res.status === 409 && !replace) {
      const ok = window.confirm(
        "Replace existing schedule for this loan?"
      );
      if (ok) return confirmScheduleImport(true);
      return;
    }
    if (!res.ok) {
      toast({ title: "Import failed", variant: "destructive" });
      return;
    }
    const data = await res.json();
    toast({ title: `Schedule imported — ${data.count} entries` });
    setScheduleLoanId(null);
    setPreviewRows(null);
    load();
  }

  async function toggleSchedule(loanId: string) {
    setExpanded((e) => ({ ...e, [loanId]: !e[loanId] }));
    if (!schedules[loanId]) {
      const r = await fetch(`/api/debts/loans/${loanId}/schedule`);
      const rows = await r.json();
      setSchedules((s) => ({ ...s, [loanId]: rows }));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Debts</h1>
          <p className="text-slate-500">Loans and credit cards.</p>
        </div>
      </div>

      {summary && (
        <Card className="border-red-100 bg-red-50/40">
          <CardHeader>
            <CardTitle className="text-base text-red-800">Total liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-700">
              {formatINR(summary.totalLiabilities)}
            </p>
            <p className="text-sm text-slate-600">
              Loans {formatINR(summary.totalLoanOutstanding)} · Cards{" "}
              {formatINR(summary.totalCreditCard)}
            </p>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Loans</h2>
          <Button
            onClick={() => {
              setNewLoanScheduleRows(null);
              setLoanForm({
                name: "",
                lender: "",
                principalAmount: "",
                interestRate: "0",
                tenureMonths: "",
                startDate: "",
                emiAmount: "",
                notes: "",
              });
              setLoanOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add loan
          </Button>
        </div>
        {loans.map((loan) => (
          <Card key={loan.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{loan.name}</CardTitle>
                <p className="text-sm text-slate-500">
                  {loan.lender ?? "—"} · EMI {formatINR(loan.emiAmount)}
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setDeleteLoanId(loan.id)}>
                Delete
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Outstanding:{" "}
                <span className="font-semibold text-red-700">
                  {formatINR(loan.currentOutstanding)}
                </span>
              </p>
              <Progress value={loan.repaidPercent} className="h-2" />
              <Button variant="outline" size="sm" onClick={() => toggleSchedule(loan.id)}>
                {expanded[loan.id] ? (
                  <ChevronUp className="mr-1 h-4 w-4" />
                ) : (
                  <ChevronDown className="mr-1 h-4 w-4" />
                )}
                View schedule
              </Button>
              <Button variant="secondary" size="sm" onClick={() => {
                setScheduleLoanId(loan.id);
                setPreviewRows(null);
              }}>
                Upload / replace schedule
              </Button>
              {expanded[loan.id] && (
                <div className="max-h-48 overflow-auto rounded border text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="p-2">Period</th>
                        <th className="p-2">EMI</th>
                        <th className="p-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(schedules[loan.id] as Array<{ month: number; year: number; emiAmount: number; outstandingBalance: number }>)?.map(
                        (r, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">
                              {r.month}/{r.year}
                            </td>
                            <td className="p-2">{formatINR(r.emiAmount)}</td>
                            <td className="p-2">{formatINR(r.outstandingBalance)}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Credit cards</h2>
          <Button variant="outline" onClick={() => setCardOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add card
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-3">Card</th>
                  <th className="p-3">Outstanding</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="p-3 font-medium">{c.cardName}</td>
                    <td className="p-3">{formatINR(c.outstanding)}</td>
                    <td className="p-3 text-slate-500">
                      {new Date(c.updatedAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setUpdateCard({ id: c.id, name: c.cardName });
                          setBalanceInput(String(c.outstanding));
                        }}
                      >
                        Update
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <Dialog
        open={loanOpen}
        onOpenChange={(open) => {
          setLoanOpen(open);
          if (!open) {
            setNewLoanScheduleRows(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <form onSubmit={createLoan}>
            <DialogHeader>
              <DialogTitle>Add loan</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div>
                <Label>Amortisation file (CSV or Excel)</Label>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv"
                  className="mt-1"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onNewLoanScheduleFile(f);
                  }}
                />
                <p className="mt-1 text-xs text-slate-500">
                  EMI, opening principal, tenure, and start date are read from this
                  file (see README). Interest % is set to 0 unless your sheet
                  includes columns we can extend later.
                </p>
              </div>
              {newLoanScheduleRows && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-700">From file</p>
                  <ul className="mt-2 grid gap-1 text-slate-600">
                    <li>
                      Opening principal:{" "}
                      <span className="font-mono tabular-nums">
                        {formatINR(Number(loanForm.principalAmount) || 0)}
                      </span>
                    </li>
                    <li>
                      EMI:{" "}
                      <span className="font-mono tabular-nums">
                        {formatINR(Number(loanForm.emiAmount) || 0)}
                      </span>
                    </li>
                    <li>
                      Outstanding (this calendar month):{" "}
                      <span className="font-mono tabular-nums">
                        {formatINR(newLoanOutstandingAsOfMonth ?? 0)}
                      </span>
                    </li>
                    <li>Tenure: {loanForm.tenureMonths} months</li>
                    <li>Start date: {loanForm.startDate}</li>
                    <li>Schedule rows: {newLoanScheduleRows.length}</li>
                  </ul>
                </div>
              )}
              <div>
                <Label>Loan name</Label>
                <Input
                  required
                  value={loanForm.name}
                  onChange={(e) =>
                    setLoanForm((s) => ({ ...s, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Lender (optional)</Label>
                <Input
                  value={loanForm.lender}
                  onChange={(e) =>
                    setLoanForm((s) => ({ ...s, lender: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input
                  value={loanForm.notes}
                  onChange={(e) =>
                    setLoanForm((s) => ({ ...s, notes: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!newLoanScheduleRows?.length}>
                Save loan &amp; schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cardOpen} onOpenChange={setCardOpen}>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await fetch("/api/debts/credit-cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  cardName: cardForm.cardName,
                  outstanding: Number(cardForm.outstanding),
                }),
              });
              toast({ title: "Card added" });
              setCardOpen(false);
              setCardForm({ cardName: "", outstanding: "" });
              load();
            }}
          >
            <DialogHeader>
              <DialogTitle>Add credit card</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <Label>Name</Label>
              <Input
                required
                value={cardForm.cardName}
                onChange={(e) =>
                  setCardForm((s) => ({ ...s, cardName: e.target.value }))
                }
              />
              <Label>Outstanding</Label>
              <Input
                required
                type="number"
                value={cardForm.outstanding}
                onChange={(e) =>
                  setCardForm((s) => ({ ...s, outstanding: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="submit">Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!updateCard} onOpenChange={() => setUpdateCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update {updateCard?.name}</DialogTitle>
          </DialogHeader>
          <Input
            type="number"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
          />
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!updateCard) return;
                await fetch(`/api/debts/credit-cards/${updateCard.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ outstanding: Number(balanceInput) }),
                });
                toast({ title: "Balance updated" });
                setUpdateCard(null);
                load();
              }}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!scheduleLoanId} onOpenChange={() => { setScheduleLoanId(null); setPreviewRows(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Amortization schedule</DialogTitle>
          </DialogHeader>
          <Input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onScheduleFile(f);
            }}
          />
          {previewRows && (
            <>
              <div className="max-h-48 overflow-auto text-xs">
                <table className="w-full border">
                  <thead>
                    <tr>
                      <th className="p-1">Y/M</th>
                      <th className="p-1">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        <td className="p-1">
                          {r.year}-{r.month}
                        </td>
                        <td className="p-1">{formatINR(r.outstandingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 20 && (
                  <p className="p-2 text-slate-500">+ more rows…</p>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => confirmScheduleImport(false)}>Confirm import</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteLoanId} onOpenChange={() => setDeleteLoanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this loan and its schedule?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteLoanId) return;
                await fetch(`/api/debts/loans/${deleteLoanId}`, {
                  method: "DELETE",
                });
                toast({ title: "Loan deleted" });
                setDeleteLoanId(null);
                load();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
