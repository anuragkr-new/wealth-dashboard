"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/design/GradientText";

function safeRedirectPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function LoginInner() {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const err = searchParams.get("error");

  async function onGoogle() {
    setPending(true);
    try {
      await signIn("google", {
        callbackUrl: safeRedirectPath(searchParams.get("from")),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 shadow-lg">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-2xl tracking-tight text-foreground">
          Wealth<span className="gradient-text">.</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in with Google to use your private dashboard.
        </p>
      </div>
      {err === "AccessDenied" || err === "Configuration" ? (
        <p className="text-center text-sm text-destructive" role="alert">
          Sign-in was cancelled or is not configured. Check Google OAuth env
          vars on the server.
        </p>
      ) : null}
      <Button
        type="button"
        className="w-full gradient-bg text-white shadow-accent"
        disabled={pending}
        onClick={() => void onGoogle()}
      >
        {pending ? "Redirecting…" : "Continue with Google"}
      </Button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Sign in
        </p>
        <h2 className="mt-2 font-display text-3xl text-foreground">
          <GradientText>Welcome</GradientText>
        </h2>
      </div>
      <Suspense
        fallback={
          <div className="h-48 w-full max-w-sm animate-pulse rounded-2xl bg-muted" />
        }
      >
        <LoginInner />
      </Suspense>
    </div>
  );
}
