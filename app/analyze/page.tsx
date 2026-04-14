import BillingActions from "./BillingActions";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyzePage() {
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

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your supplier checks and saved reports will appear here.
              </p>
            </div>

            <div className="flex gap-3">
              <a
                href="/analyze/new"
                className="inline-flex items-center justify-center rounded-md font-semibold h-10 px-4 gradient-brand text-brand-foreground hover:opacity-90 transition-opacity"
              >
                New Supplier Check
              </a>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border p-5 bg-background">
              <p className="text-sm text-muted-foreground">Checks</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {plan === "pro" ? "Unlimited" : `${checksThisMonth}/${limit}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {plan === "pro"
                  ? "Pro plan — no monthly limit."
                  : "Monthly limit resets on the 1st."}
              </p>
            </div>
            <div className="rounded-xl border border-border p-5 bg-background">
              <p className="text-sm text-muted-foreground">Saved reports</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {savedCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your most recent supplier checks.
              </p>
            </div>
            <div className="rounded-xl border border-border p-5 bg-background">
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {plan === "pro" ? "Pro" : "Free"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {plan === "pro"
                  ? "Manage billing from your profile menu."
                  : "Upgrade to Pro for unlimited checks."}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-border bg-muted/30 p-5">
            <BillingActions
              plan={plan}
              checksThisMonth={checksThisMonth}
              limit={limit}
            />
          </div>

          <div className="mt-8 rounded-xl border border-border bg-muted/30 p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Recent reports
            </h2>
            {savedCount ? (
              <div className="mt-4 grid gap-3">
                {reports!.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {r.company_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(r.created_at).toLocaleString()} • {r.country} •{" "}
                          {r.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {r.risk_level} • {r.verdict_class}
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {r.risk_score}/100
                          </p>
                        </div>
                        <a
                          href={`/analyze/report/${r.id}`}
                          className="inline-flex items-center justify-center rounded-md font-semibold h-9 px-3 border border-border bg-background text-foreground hover:bg-muted/40 transition-colors"
                        >
                          View
                        </a>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      {r.summary}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                No reports yet. Run your first supplier check.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

