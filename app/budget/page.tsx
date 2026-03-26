import { Suspense } from "react";
import { BudgetClient } from "@/components/budget/BudgetClient";

export default function BudgetPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <BudgetClient />
    </Suspense>
  );
}
