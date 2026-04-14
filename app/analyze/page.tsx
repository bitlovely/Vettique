import BillingActions from "./BillingActions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const sessionIdRaw = sp.session_id;
  const sessionId = Array.isArray(sessionIdRaw) ? sessionIdRaw[0] : sessionIdRaw;

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
        .select("plan, checks_this_month, checks_month")
        .eq("user_id", userId)
        .maybeSingle()
    : { data: null as any };

  const plan = (profile?.plan as "free" | "pro") ?? "free";
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
        }
      }
    } catch {
      // Best-effort; webhook remains the canonical source of truth.
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
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="vettique-blob absolute -top-24 -left-20 h-72 w-72 rounded-full bg-sky-400/40 dark:bg-sky-500/20" />
        <div className="vettique-blob absolute top-20 -right-28 h-80 w-80 rounded-full bg-fuchsia-400/30 dark:bg-fuchsia-500/18 [animation-delay:1.2s]" />
        <div className="vettique-blob absolute bottom-[-6rem] left-1/3 h-96 w-96 rounded-full bg-emerald-400/25 dark:bg-emerald-500/14 [animation-delay:2.4s]" />
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="vettique-fade-up rounded-2xl border border-border/60 bg-card/70 dark:bg-card/55 backdrop-blur-xl shadow-[0_20px_80px_-30px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_90px_-40px_rgba(0,0,0,0.55)] overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-border/60 bg-gradient-to-br from-muted/40 to-transparent dark:from-muted/25 dark:to-transparent">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Dashboard</p>
                <h1 className="text-2xl font-bold text-foreground mt-2">
                  Supplier reports
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Run checks, review risk, and keep a report history.
                </p>
              </div>

              <div className="flex w-full md:w-auto flex-col sm:flex-row gap-3 sm:items-center">
                <a
                  href="/analyze/new"
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-md font-semibold h-10 px-4 gradient-brand text-brand-foreground hover:opacity-90 transition-opacity shadow-sm hover:shadow-md active:scale-[0.99] motion-reduce:transform-none"
                >
                  New check
                </a>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Recent reports
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your latest supplier checks.
                    </p>
                  </div>
                </div>

                <div className="mt-4 border border-border/70 rounded-xl overflow-hidden bg-background/60 dark:bg-background/40 backdrop-blur">
                  {savedCount ? (
                    <div className="divide-y divide-border">
                      <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 bg-muted/25 dark:bg-muted/20 text-xs font-semibold text-muted-foreground">
                        <div className="col-span-6">Supplier</div>
                        <div className="col-span-2">Risk</div>
                        <div className="col-span-2 text-right">Score</div>
                        <div className="col-span-2 text-right">Action</div>
                      </div>
                      {reports!.map((r) => (
                        <div
                          key={r.id}
                          className="px-4 py-4 hover:bg-muted/20 dark:hover:bg-muted/15 transition-colors"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 sm:gap-4 items-start">
                            <div className="sm:col-span-6 min-w-0">
                              <a
                                href={`/analyze/report/${r.id}`}
                                className="font-semibold text-foreground hover:underline block truncate"
                              >
                                {r.company_name}
                              </a>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(r.created_at).toLocaleString()} •{" "}
                                {r.country} • {r.category}
                              </p>
                              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                                {r.summary}
                              </p>
                            </div>

                            <div className="sm:col-span-2 mt-3 sm:mt-0">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBadge(
                                  r.risk_level,
                                )}`}
                              >
                                {r.risk_level}
                              </span>
                              <p className="text-xs text-muted-foreground mt-2">
                                {r.verdict_class}
                              </p>
                            </div>

                            <div className="sm:col-span-2 mt-3 sm:mt-0 sm:text-right">
                              <p className="text-sm font-bold text-foreground">
                                {r.risk_score}/100
                              </p>
                            </div>

                            <div className="sm:col-span-2 mt-4 sm:mt-0 sm:text-right">
                              <a
                                href={`/analyze/report/${r.id}`}
                                className="inline-flex w-full sm:w-auto items-center justify-center rounded-md font-semibold h-10 sm:h-9 px-4 sm:px-3 border border-border/70 bg-background/70 dark:bg-background/40 text-foreground hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors whitespace-nowrap shadow-sm hover:shadow-md active:scale-[0.99] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                              >
                                View report
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6">
                      <p className="text-sm text-muted-foreground">
                        No reports yet. Run your first supplier check.
                      </p>
                      <div className="mt-4">
                        <a
                          href="/analyze/new"
                          className="inline-flex w-full sm:w-auto items-center justify-center rounded-md font-semibold h-10 px-4 gradient-brand text-brand-foreground hover:opacity-90 transition-opacity"
                        >
                          New check
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="space-y-6 lg:sticky lg:top-6">
                  <div className="border border-border/70 rounded-xl overflow-hidden bg-background/60 dark:bg-background/40 backdrop-blur">
                    <div className="px-5 py-4 bg-muted/25 dark:bg-muted/20 border-b border-border/60">
                      <h2 className="text-sm font-semibold text-foreground">
                        Overview
                      </h2>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">Checks</p>
                        <p className="text-sm font-semibold text-foreground">
                          {plan === "pro"
                            ? "Unlimited"
                            : `${checksThisMonth}/${limit}`}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">Saved reports</p>
                        <p className="text-sm font-semibold text-foreground">
                          {savedCount}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">Plan</p>
                        <p className="text-sm font-semibold text-foreground">
                          {plan === "pro" ? "Pro" : "Free"}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {plan === "pro"
                          ? "No monthly limit on Pro."
                          : "Limit resets on the 1st."}
                      </p>
                    </div>
                  </div>

                  <div className="border border-border/70 rounded-xl overflow-hidden bg-background/60 dark:bg-background/40 backdrop-blur">
                    <div className="px-5 py-4 bg-muted/25 dark:bg-muted/20 border-b border-border/60">
                      <h2 className="text-sm font-semibold text-foreground">
                        Billing
                      </h2>
                    </div>
                    <div className="p-5">
                      <BillingActions
                        plan={plan}
                        checksThisMonth={checksThisMonth}
                        limit={limit}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

