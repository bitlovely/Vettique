"use client";

import { useState, useTransition } from "react";

export default function BillingActions(props: {
  plan: "free" | "pro";
  checksThisMonth: number;
  limit: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function goToCheckout() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", { method: "POST" });
        const data = (await res.json()) as any;
        if (!res.ok || !data?.url) {
          setError(data?.error ?? "Unable to start checkout.");
          return;
        }
        window.location.href = data.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      }
    });
  }

  async function goToPortal() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/portal", { method: "POST" });
        const data = (await res.json()) as any;
        if (!res.ok || !data?.url) {
          setError(data?.error ?? "Unable to open billing portal.");
          return;
        }
        window.location.href = data.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      }
    });
  }

  const remaining = Math.max(0, props.limit - props.checksThisMonth);

  return (
    <div className="space-y-3">
      {props.plan === "free" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Free plan usage:{" "}
            <span className="font-semibold text-foreground">
              {props.checksThisMonth}/{props.limit}
            </span>{" "}
            checks this month ({remaining} remaining).
          </p>
          <button
            type="button"
            onClick={goToCheckout}
            disabled={pending}
            className="inline-flex w-full items-center justify-center rounded-md font-semibold h-10 px-4 gradient-brand text-brand-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {pending ? "Opening…" : "Upgrade to Pro"}
          </button>
          <p className="text-xs text-muted-foreground">
            $19/month. Cancel anytime.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Plan: <span className="font-semibold text-foreground">Pro</span> (unlimited
            checks)
          </p>
          <button
            type="button"
            onClick={goToPortal}
            disabled={pending}
            className="inline-flex w-full items-center justify-center rounded-md font-semibold h-10 px-4 border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
          >
            {pending ? "Opening…" : "Manage billing"}
          </button>
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}

