"use client";

import { useState, useTransition } from "react";

export default function BillingActions(props: {
  plan: "free" | "pro";
  checksThisMonth: number;
  limit: number;
  variant?: "default" | "gradient";
  proAccessUntil?: string;
  proWillCancelAtPeriodEnd?: boolean;
  proDaysRemaining?: number;
  proSubscriptionStatus?: string;
  showProPeriodDetails?: boolean;
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
  const isGradient = props.variant === "gradient";
  const showProPeriodDetails = props.showProPeriodDetails ?? true;

  const textMuted = isGradient ? "text-white/80" : "text-muted-foreground";
  const textStrong = isGradient ? "text-white" : "text-foreground";
  const priceMuted = isGradient ? "text-white/70" : "text-muted-foreground";
  const primaryBtn =
    "inline-flex w-full items-center justify-center rounded-lg font-semibold h-10 px-4 shadow-sm hover:shadow-md active:translate-y-px motion-reduce:transform-none transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
  const secondaryBtn =
    "inline-flex w-full items-center justify-center rounded-lg font-semibold h-10 px-4 shadow-sm hover:shadow-md active:translate-y-px motion-reduce:transform-none transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

  return (
    <div className="space-y-3">
      {props.plan === "free" ? (
        <div className="space-y-3">
          <p className={`text-sm ${textMuted} leading-relaxed`}>
            Free plan usage:{" "}
            <span className={`font-semibold ${textStrong}`}>
              {props.checksThisMonth}/{props.limit}
            </span>{" "}
            checks this month ({remaining} remaining).
          </p>
          <button
            type="button"
            onClick={goToCheckout}
            disabled={pending}
            className={`${primaryBtn} ${
              isGradient
                ? "bg-white/15 hover:bg-white/20 border border-white/20 text-white"
                : "gradient-brand text-brand-foreground hover:opacity-90 transition-opacity"
            }`}
          >
            {pending ? "Opening…" : "Upgrade to Pro"}
          </button>
          <p className={`text-xs ${priceMuted}`}>
            $19/month. Cancel anytime.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className={`text-sm ${textMuted} leading-relaxed`}>
            Plan: <span className={`font-semibold ${textStrong}`}>Pro</span> (unlimited
            checks)
          </p>
          {showProPeriodDetails && props.proAccessUntil ? (
            <p className={`text-xs ${textMuted}`}>
              Period ends{" "}
              <span className={`font-semibold ${textStrong}`}>
                {new Date(props.proAccessUntil).toLocaleDateString()}
              </span>
              {typeof props.proDaysRemaining === "number" ? (
                <> • {props.proDaysRemaining} days remaining</>
              ) : null}
              {props.proWillCancelAtPeriodEnd ? (
                <> • Canceled (downgrades to Free)</>
              ) : props.proSubscriptionStatus &&
                ["canceled", "unpaid", "incomplete_expired"].includes(
                  String(props.proSubscriptionStatus),
                ) ? (
                <> • Canceled</>
              ) : null}
            </p>
          ) : showProPeriodDetails && props.proWillCancelAtPeriodEnd ? (
            <p className={`text-xs ${textMuted}`}>Canceled (downgrades to Free)</p>
          ) : null}
          <button
            type="button"
            onClick={goToPortal}
            disabled={pending}
            className={`${secondaryBtn} ${
              isGradient
                ? "bg-white/15 hover:bg-white/20 border border-white/20 text-white"
                : "border border-border bg-background hover:bg-muted"
            }`}
          >
            {pending ? "Opening…" : "Manage billing"}
          </button>
        </div>
      )}

      {error ? (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            isGradient
              ? "border border-white/20 bg-white/10 text-white"
              : "border border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

