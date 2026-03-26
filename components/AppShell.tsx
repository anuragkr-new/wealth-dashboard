"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Flag,
  GitCompareArrows,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: Wallet },
  { href: "/debts", label: "Debts", icon: CreditCard },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/milestones", label: "Milestones", icon: Flag },
  { href: "/deviation", label: "Deviation", icon: GitCompareArrows },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await fetch("/api/access", { method: "DELETE" });
    router.push("/access");
    router.refresh();
  }

  if (pathname === "/access") {
    return (
      <div className="min-h-screen bg-background glow-accent">{children}</div>
    );
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {nav.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-[48px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ease-out",
              active
                ? "gradient-bg text-white shadow-accent"
                : "text-white/65 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 shrink-0 transition-transform duration-200",
                active && "scale-110"
              )}
            />
            {label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col border-r border-white/10 bg-foreground dot-pattern-dark transition-transform duration-300 ease-out md:z-40 md:translate-x-0",
          mobileOpen && "translate-x-0"
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent" />
        <div className="relative flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link
            href="/"
            className="font-display text-xl tracking-tight"
            onClick={() => setMobileOpen(false)}
          >
            <span className="text-white">Wealth</span>
            <span className="gradient-text">.</span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="relative flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </nav>
        <div className="relative space-y-3 border-t border-white/10 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
            Local · INR
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full rounded-lg border border-white/15 px-3 py-2 text-left text-xs font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-h-screen flex-1 md:ml-64">
        <button
          type="button"
          className="fixed left-4 top-4 z-30 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card shadow-md md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
        <div className="relative min-h-screen glow-accent pt-16 md:pt-0">
          <div className="mx-auto max-w-content px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
