import BillingActions from "./BillingActions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

function addInterval(
  start: Date,
  interval: "day" | "week" | "month" | "year",
  intervalCount: number,
) {
  const d = new Date(start.getTime());
  const n = Math.max(1, Math.floor(Number(intervalCount) || 1));
  if (interval === "day") d.setUTCDate(d.getUTCDate() + n);
  else if (interval === "week") d.setUTCDate(d.getUTCDate() + n * 7);
  else if (interval === "month") d.setUTCMonth(d.getUTCMonth() + n);
  else d.setUTCFullYear(d.getUTCFullYear() + n);
  return d;
}

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const sessionIdRaw = sp.session_id;
  const sessionId = Array.isArray(sessionIdRaw) ? sessionIdRaw[0] : sessionIdRaw;
  const billingRaw = sp.billing;
  const billing = Array.isArray(billingRaw) ? billingRaw[0] : billingRaw;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Layout already redirects if no user, but keep it safe.
  const userId = user?.id;

  const monthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
  )
    .toISOString()
    .slice(0, 10);

  const { data: profile } = userId
    ? await supabase
        .from("profiles")
        .select(
          "plan, checks_this_month, checks_month, stripe_customer_id, stripe_subscription_id",
        )
        .eq("user_id", userId)
        .maybeSingle()
    : { data: null as any };

  const plan = (profile?.plan as "free" | "pro") ?? "free";
  let effectivePlan: "free" | "pro" = plan;
  let effectiveStripeCustomerId =
    (profile?.stripe_customer_id as string | null) ?? null;
  let effectiveStripeSubscriptionId =
    (profile?.stripe_subscription_id as string | null) ?? null;
  let proAccessUntil: Date | null = null;
  let proWillCancelAtPeriodEnd = false;
  let proSubscriptionStatus: string | null = null;
  let proDaysRemaining: number | null = null;
  let proDetailsError: string | null = null;
  let proCancelAt: Date | null = null;
  let proCanceledAt: Date | null = null;
  const checksMonth = (profile?.checks_month as string) ?? monthStart;
  const checksThisMonth =
    checksMonth === monthStart ? Number(profile?.checks_this_month ?? 0) : 0;
  const limit = 3;

  // Dev/test safety net: if we returned from Stripe Checkout with a session_id,
  // sync plan immediately even if webhooks aren't configured/forwarded locally.
  if (userId && sessionId && plan !== "pro") {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const sessionUserId = (session?.metadata as any)?.supabase_user_id as
        | string
        | undefined;

      if (sessionUserId && sessionUserId === userId) {
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;

        if (customerId || subscriptionId) {
          const admin = createAdminClient();
          await admin
            .from("profiles")
            .upsert(
              {
                user_id: userId,
                plan: "pro",
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
              },
              { onConflict: "user_id" },
            );
          effectivePlan = "pro";
          effectiveStripeCustomerId = customerId ?? effectiveStripeCustomerId;
          effectiveStripeSubscriptionId =
            subscriptionId ?? effectiveStripeSubscriptionId;
        }
      }
    } catch {
      // Best-effort; webhook remains the canonical source of truth.
    }
  }

  // Best-effort sync after returning from Stripe billing portal.
  // This makes cancellations reflect immediately in dev/test even if webhooks
  // are delayed/missed.
  if (userId && billing === "1") {
    const customerId = effectiveStripeCustomerId;
    const subscriptionId = effectiveStripeSubscriptionId;

    if (customerId || subscriptionId) {
      try {
        const stripe = getStripe();

        let status: string | null = null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          status = (sub?.status as string | undefined) ?? null;
        } else if (customerId) {
          const subs = await stripe.subscriptions.list({
            customer: customerId,
            status: "all",
            limit: 3,
          });
          const best = subs.data.find((s) =>
            ["active", "trialing", "past_due"].includes(String(s.status)),
          );
          status = (best?.status as string | undefined) ?? null;
          effectiveStripeSubscriptionId =
            (best?.id as string | undefined) ?? effectiveStripeSubscriptionId;
        }

        const isActive =
          status === "active" || status === "trialing" || status === "past_due";
        const nextPlan: "free" | "pro" = isActive ? "pro" : "free";

        if (nextPlan !== effectivePlan) {
          const admin = createAdminClient();
          await admin
            .from("profiles")
            .upsert(
              {
                user_id: userId,
                plan: nextPlan,
                stripe_customer_id: customerId,
                stripe_subscription_id: effectiveStripeSubscriptionId,
              },
              { onConflict: "user_id" },
            );
          effectivePlan = nextPlan;
          effectiveStripeCustomerId = customerId;
        }
      } catch {
        // Best-effort; webhook remains canonical.
      }
    }
  }

  // If user is currently Pro, fetch subscription details so we can show
  // period end date + days remaining, and cancellation status.
  if (userId && effectivePlan === "pro") {
    try {
      const stripe = getStripe();

      let sub: any | null = null;
      if (effectiveStripeSubscriptionId) {
        sub = await stripe.subscriptions.retrieve(effectiveStripeSubscriptionId, {
          expand: ["items.data.price", "latest_invoice"],
        });
      } else if (effectiveStripeCustomerId) {
        const subs = await stripe.subscriptions.list({
          customer: effectiveStripeCustomerId,
          status: "all",
          limit: 5,
        });
        // Prefer an active-like subscription, otherwise take most recent.
        sub =
          subs.data.find((s) =>
            ["active", "trialing", "past_due"].includes(String(s.status)),
          ) ?? subs.data[0] ?? null;
        effectiveStripeSubscriptionId =
          (sub?.id as string | undefined) ?? effectiveStripeSubscriptionId;
      } else if (user?.email) {
        // Last-resort: find Stripe customer by email (useful if profile ids
        // weren't persisted for some reason).
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 3,
        });
        const customer = customers.data[0] ?? null;
        effectiveStripeCustomerId =
          (customer?.id as string | undefined) ?? effectiveStripeCustomerId;
        if (effectiveStripeCustomerId) {
          const subs = await stripe.subscriptions.list({
            customer: effectiveStripeCustomerId,
            status: "all",
            limit: 5,
          });
          sub =
            subs.data.find((s) =>
              ["active", "trialing", "past_due"].includes(String(s.status)),
            ) ?? subs.data[0] ?? null;
          effectiveStripeSubscriptionId =
            (sub?.id as string | undefined) ?? effectiveStripeSubscriptionId;
        }
      }

      if (sub) {
        proSubscriptionStatus = (sub?.status as string | undefined) ?? null;
        proWillCancelAtPeriodEnd = Boolean(sub?.cancel_at_period_end);
        const cancelAt = Number(sub?.cancel_at);
        if (Number.isFinite(cancelAt) && cancelAt > 0) {
          proCancelAt = new Date(cancelAt * 1000);
        }
        const canceledAt = Number(sub?.canceled_at);
        if (Number.isFinite(canceledAt) && canceledAt > 0) {
          proCanceledAt = new Date(canceledAt * 1000);
        }

        const setPeriod = (endSeconds: number) => {
          proAccessUntil = new Date(endSeconds * 1000);
          const msLeft = proAccessUntil.getTime() - Date.now();
          proDaysRemaining = Math.max(0, Math.ceil(msLeft / 86_400_000));
        };

        const periodEnd = Number(sub?.current_period_end);
        if (Number.isFinite(periodEnd) && periodEnd > 0) {
          setPeriod(periodEnd);
        } else {
          // Fallback 0: If price wasn't expanded, re-fetch with expand.
          if (effectiveStripeSubscriptionId && !sub?.items?.data?.[0]?.price) {
            try {
              sub = await stripe.subscriptions.retrieve(
                effectiveStripeSubscriptionId,
                { expand: ["items.data.price", "latest_invoice"] },
              );
            } catch {
              // ignore
            }
          }

          // Fallback 1: compute from start + recurring interval.
          const periodStart = Number(sub?.current_period_start);
          const interval =
            (sub?.items?.data?.[0]?.price?.recurring?.interval as
              | "day"
              | "week"
              | "month"
              | "year"
              | undefined) ??
            (sub?.items?.data?.[0]?.plan?.interval as
              | "day"
              | "week"
              | "month"
              | "year"
              | undefined) ??
            null;
          const intervalCount =
            Number(
              sub?.items?.data?.[0]?.price?.recurring?.interval_count ??
                sub?.items?.data?.[0]?.plan?.interval_count ??
                1,
            ) || 1;

          if (
            Number.isFinite(periodStart) &&
            periodStart > 0 &&
            interval &&
            ["day", "week", "month", "year"].includes(interval)
          ) {
            const start = new Date(periodStart * 1000);
            const computedEnd = addInterval(start, interval, intervalCount);
            const msLeft = computedEnd.getTime() - Date.now();
            proAccessUntil = computedEnd;
            proDaysRemaining = Math.max(0, Math.ceil(msLeft / 86_400_000));
          }

          // Fallback 2: derive from latest invoice's line period end.
          if (!proAccessUntil && effectiveStripeSubscriptionId) {
            try {
              const invoices = await stripe.invoices.list({
                subscription: effectiveStripeSubscriptionId,
                limit: 3,
              });
              const inv = invoices.data[0] ?? null;
              const lineEnd = Number(inv?.lines?.data?.[0]?.period?.end);
              const invoiceEnd = Number((inv as any)?.period_end);
              const end =
                (Number.isFinite(lineEnd) && lineEnd > 0 ? lineEnd : null) ??
                (Number.isFinite(invoiceEnd) && invoiceEnd > 0 ? invoiceEnd : null);
              if (end) setPeriod(end);
            } catch (e) {
              proDetailsError =
                e instanceof Error
                  ? `Invoice fallback failed: ${e.message}`
                  : "Invoice fallback failed.";
            }
          }

          if (!proAccessUntil && !proDetailsError) {
            proDetailsError =
              "Stripe subscription missing billing period fields (current_period_end=null, and cannot compute end date from current_period_start + price interval).";
          }
        }
      } else {
        proDetailsError = "Subscription details unavailable.";
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("[analyze] billing details", {
          userId,
          effectiveStripeCustomerId,
          effectiveStripeSubscriptionId,
          subId: sub?.id ?? null,
          subStatus: sub?.status ?? null,
          cancelAtPeriodEnd: sub?.cancel_at_period_end ?? null,
          currentPeriodEnd: sub?.current_period_end ?? null,
          currentPeriodStart: sub?.current_period_start ?? null,
          itemInterval:
            sub?.items?.data?.[0]?.price?.recurring?.interval ??
            sub?.items?.data?.[0]?.plan?.interval ??
            null,
          itemIntervalCount:
            sub?.items?.data?.[0]?.price?.recurring?.interval_count ??
            sub?.items?.data?.[0]?.plan?.interval_count ??
            null,
          cancelAt: sub?.cancel_at ?? null,
          canceledAt: sub?.canceled_at ?? null,
          proAccessUntil: proAccessUntil?.toISOString() ?? null,
          proDaysRemaining,
          proDetailsError,
        });
      }
    } catch (e) {
      proDetailsError =
        e instanceof Error ? e.message : "Failed to load subscription details.";
      console.error("[analyze] stripe subscription details failed", {
        userId,
        effectiveStripeCustomerId,
        effectiveStripeSubscriptionId,
        error: proDetailsError,
      });
    }
  }

  const { data: reports } = userId
    ? await supabase
        .from("supplier_reports")
        .select(
          "id, created_at, company_name, country, category, risk_score, risk_level, summary, verdict_class",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(25)
    : { data: [] as any[] };

  const savedCount = reports?.length ?? 0;
  const remaining = Math.max(0, limit - checksThisMonth);

  const scores = (reports ?? [])
    .map((r) => Number((r as any).risk_score))
    .filter((n) => Number.isFinite(n));
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
  const highRiskCount = (reports ?? []).filter(
    (r) => String((r as any).risk_level ?? "").toUpperCase() === "HIGH",
  ).length;

  function riskBadge(level: string) {
    const l = String(level || "").toUpperCase();
    if (l === "LOW")
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
    if (l === "HIGH")
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
    // MEDIUM: use blue (clearer than amber/orange).
    return "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/20";
  }

  return (
    <div className="h-full w-full px-4 sm:px-6 lg:px-10 py-6">
      <div className="h-full w-full flex flex-col gap-6">
        <div className="vettique-fade-up rounded-3xl border border-primary-foreground/10 bg-card/90 backdrop-blur-xl shadow-[0_28px_110px_-44px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col flex-1 min-h-0">
          {/* Summary */}
          <div className="p-7 lg:p-8 border-b border-border/60 shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground tracking-wide">
                  SUMMARY
                </p>
                <h1 className="text-2xl lg:text-[30px] font-bold text-foreground mt-2 leading-tight">
                  Dashboard
                </h1>
              </div>
              <div className="flex w-full lg:w-auto">
                <a
                  href="/analyze/new"
                  className="inline-flex w-full lg:w-auto items-center justify-center rounded-xl font-semibold h-11 px-6 gradient-brand text-brand-foreground hover:opacity-95 transition-opacity shadow-sm hover:shadow-md active:translate-y-px motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  New check
                </a>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl p-6 text-white shadow-lg shadow-rose-500/10 bg-gradient-to-br from-rose-500 to-orange-400">
                <p className="text-xs font-semibold tracking-wide text-white/80">
                  CHECKS REMAINING
                </p>
                <p className="text-4xl font-extrabold mt-3 tabular-nums">
                  {effectivePlan === "pro"
                    ? "∞"
                    : remaining.toString().padStart(2, "0")}
                </p>
                <p className="text-sm text-white/80 mt-2">
                  {effectivePlan === "pro"
                    ? "Pro plan — unlimited checks."
                    : `${checksThisMonth}/${limit} used this month`}
                </p>
              </div>

              <div className="rounded-2xl p-6 text-white shadow-lg shadow-fuchsia-500/10 bg-gradient-to-br from-indigo-500 to-fuchsia-500">
                <p className="text-xs font-semibold tracking-wide text-white/80">
                  REPORTS SAVED
                </p>
                <p className="text-4xl font-extrabold mt-3 tabular-nums">
                  {savedCount.toString().padStart(2, "0")}
                </p>
                <p className="text-sm text-white/80 mt-2">Since last check</p>
              </div>

              <div className="rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/10 bg-gradient-to-br from-emerald-500 to-teal-600">
                <p className="text-xs font-semibold tracking-wide text-white/80">
                  AVG RISK SCORE
                </p>
                <p className="text-4xl font-extrabold mt-3 tabular-nums">
                  {avgScore === null ? "—" : `${avgScore}`}
                </p>
                <p className="text-sm text-white/80 mt-2">
                  {scores.length
                    ? `Across ${scores.length} reports • ${highRiskCount} high risk`
                    : "Run a check to see stats"}
                </p>
              </div>

              <div className="rounded-2xl p-6 text-white shadow-lg shadow-sky-500/10 bg-gradient-to-br from-sky-500 to-indigo-600">
                <p className="text-xs font-semibold tracking-wide text-white/80">
                  BILLING
                </p>
                <p className="text-3xl font-extrabold mt-3">
                  {effectivePlan === "pro" ? "Pro" : "Free"}
                </p>
                {effectivePlan === "pro" ? (
                  <p className="text-sm text-white/80 mt-2">
                    {proAccessUntil ? (
                      <>
                        Period ends{" "}
                        <span className="font-semibold text-white">
                          {proAccessUntil.toLocaleDateString()}
                        </span>
                        {typeof proDaysRemaining === "number" ? (
                          <> • {proDaysRemaining} days remaining</>
                        ) : null}
                        {proWillCancelAtPeriodEnd ? (
                          <> • Canceled (downgrades to Free)</>
                        ) : proSubscriptionStatus &&
                          ["canceled", "unpaid", "incomplete_expired"].includes(
                            String(proSubscriptionStatus),
                          ) ? (
                          <> • Canceled</>
                        ) : null}
                      </>
                    ) : proWillCancelAtPeriodEnd ? (
                      <>
                        Canceled (downgrades to Free
                        {proCancelAt ? (
                          <> on {proCancelAt.toLocaleDateString()}</>
                        ) : null}
                        )
                      </>
                    ) : proDetailsError ? (
                      <>Unable to load billing period • {proDetailsError}</>
                    ) : (
                      <>Loading billing period…</>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-white/80 mt-2">
                    Free plan — 3 checks/month.
                  </p>
                )}
                <div className="mt-4">
                  <BillingActions
                    plan={effectivePlan}
                    checksThisMonth={checksThisMonth}
                    limit={limit}
                    variant="gradient"
                    proAccessUntil={
                      proAccessUntil ? proAccessUntil.toISOString() : undefined
                    }
                    proWillCancelAtPeriodEnd={proWillCancelAtPeriodEnd}
                    proDaysRemaining={proDaysRemaining ?? undefined}
                    proSubscriptionStatus={proSubscriptionStatus ?? undefined}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 p-7 lg:p-8 grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-12 rounded-2xl border border-border bg-background/90 flex flex-col min-h-0">
              <div className="px-6 py-5 border-b border-border">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-sm font-semibold text-foreground">
                    Recent reports
                  </h2>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg h-9 w-9 border border-border bg-background hover:bg-muted/30 transition-colors"
                    aria-label="More"
                  >
                    <span className="text-muted-foreground text-lg leading-none">
                      …
                    </span>
                  </button>
                </div>
              </div>

              {savedCount ? (
                <div className="flex-1 min-h-0 overflow-hidden">
                  {/* Mobile list */}
                  <div className="h-full overflow-y-auto lg:hidden">
                    <div className="divide-y divide-border">
                      {reports!.map((r) => (
                        <a
                          key={r.id}
                          href={`/analyze/report/${r.id}`}
                          className="block px-6 py-4 hover:bg-muted/10 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {r.company_name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {r.country} • {r.category}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(r.created_at).toLocaleDateString()} • #
                                {String(r.id).slice(0, 6)}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <span
                                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${riskBadge(
                                  r.risk_level,
                                )}`}
                              >
                                {r.risk_level}
                              </span>
                              <div className="mt-2 inline-flex items-center justify-center min-w-[56px] rounded-lg bg-muted/20 px-3 py-1 text-sm font-semibold text-foreground tabular-nums">
                                {r.risk_score}
                              </div>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Desktop table */}
                  <div className="hidden lg:block h-full overflow-x-auto overflow-y-auto scrollbar-stable scrollbar-visible">
                    <div className="min-w-[920px]">
                      <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-muted-foreground bg-muted/10 sticky top-0 z-10">
                        <div className="col-span-3">Tracking</div>
                        <div className="col-span-4">Supplier</div>
                        <div className="col-span-2">Risk</div>
                        <div className="col-span-2 text-right">Score</div>
                        <div className="col-span-1 text-right">View</div>
                      </div>
                      {reports!.map((r) => (
                        <div
                          key={r.id}
                          className="px-6 py-4 border-t border-border hover:bg-muted/10 transition-colors"
                        >
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-3">
                              <p className="text-sm font-semibold text-foreground tabular-nums">
                                #{String(r.id).slice(0, 6)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(r.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="col-span-4 min-w-0">
                              <a
                                href={`/analyze/report/${r.id}`}
                                className="font-semibold text-foreground hover:underline block truncate"
                              >
                                {r.company_name}
                              </a>
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {r.country} • {r.category}
                              </p>
                            </div>

                            <div className="col-span-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${riskBadge(
                                  r.risk_level,
                                )}`}
                              >
                                {r.risk_level}
                              </span>
                              <p className="text-xs text-muted-foreground mt-2 capitalize">
                                {r.verdict_class}
                              </p>
                            </div>

                            <div className="col-span-2 text-right">
                              <span className="inline-flex items-center justify-center min-w-[56px] rounded-lg bg-muted/20 px-3 py-1 text-sm font-semibold text-foreground tabular-nums">
                                {r.risk_score}
                              </span>
                            </div>

                            <div className="col-span-1 flex justify-end">
                              <a
                                href={`/analyze/report/${r.id}`}
                                className="inline-flex items-center justify-center rounded-lg h-9 w-9 border border-border bg-background hover:bg-muted/30 transition-colors shadow-sm"
                                aria-label="View report"
                              >
                                <span className="text-foreground text-sm">↗</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">
                    No reports yet. Run your first supplier check.
                  </p>
                  <div className="mt-4">
                    <a
                      href="/analyze/new"
                      className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl font-semibold h-11 px-6 gradient-brand text-brand-foreground hover:opacity-90 transition-opacity"
                    >
                      New check
                    </a>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

