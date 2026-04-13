"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Plan = "free" | "pro";

export default function PricingCTA(props: { planName: "Free" | "Pro" }) {
  const [pending, startTransition] = useTransition();
  const [userId, setUserId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      supabase
        .from("profiles")
        .select("plan")
        .eq("user_id", uid)
        .maybeSingle()
        .then(({ data: p }) => {
          if (p?.plan === "pro") setPlan("pro");
        });
    });
  }, []);

  async function goPro() {
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

  // Not signed in: send to signup
  if (!userId) {
    return (
      <Link
        href={props.planName === "Pro" ? "/auth?tab=signup" : "/auth?tab=signup"}
        className={`inline-flex items-center justify-center rounded-md font-semibold w-full h-12 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ${
          props.planName === "Pro"
            ? "gradient-brand text-brand-foreground hover:opacity-90 transition-opacity"
            : "border border-border bg-background hover:bg-muted"
        }`}
      >
        {props.planName === "Pro" ? "Go Pro" : "Start Free"}
      </Link>
    );
  }

  // Signed in
  if (props.planName === "Free") {
    return (
      <Link
        href="/analyze"
        className="inline-flex items-center justify-center rounded-md font-semibold w-full h-12 border border-border bg-background hover:bg-muted transition-colors"
      >
        Go to dashboard
      </Link>
    );
  }

  // Pro tier CTA
  if (plan === "pro") {
    return (
      <Link
        href="/analyze"
        className="inline-flex items-center justify-center rounded-md font-semibold w-full h-12 gradient-brand text-brand-foreground hover:opacity-90 transition-opacity"
      >
        You're on Pro
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={goPro}
        disabled={pending}
        className="inline-flex items-center justify-center rounded-md font-semibold w-full h-12 gradient-brand text-brand-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Opening…" : "Go Pro"}
      </button>
      {error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : null}
    </div>
  );
}

