"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradientText } from "@/components/design/GradientText";

function safeRedirectPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function AccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Something went wrong");
        return;
      }
      router.push(safeRedirectPath(searchParams.get("from")));
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 shadow-lg"
    >
      <div className="space-y-2 text-center">
        <h1 className="font-display text-2xl tracking-tight text-foreground">
          Wealth<span className="gradient-text">.</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your access code to continue.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="access-code">Access code</Label>
        <Input
          id="access-code"
          name="code"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder="••••"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="font-mono text-lg tracking-widest"
        />
      </div>
      {error ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className="w-full gradient-bg text-white shadow-accent"
        disabled={pending}
      >
        {pending ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}

export default function AccessPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Private access
        </p>
        <h2 className="mt-2 font-display text-3xl text-foreground">
          <GradientText>Welcome back</GradientText>
        </h2>
      </div>
      <Suspense
        fallback={
          <div className="h-48 w-full max-w-sm animate-pulse rounded-2xl bg-muted" />
        }
      >
        <AccessForm />
      </Suspense>
    </div>
  );
}
