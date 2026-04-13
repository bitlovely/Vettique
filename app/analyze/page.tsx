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
              <p className="text-2xl font-extrabold text-foreground mt-1">—</p>
              <p className="text-xs text-muted-foreground mt-1">
                We’ll list report history once DB storage is wired.
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
              Next step: Supplier analysis form
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Next we’ll build the analysis form at{" "}
              <span className="font-mono">/analyze/new</span> and the report output page.
            </p>
            <div className="mt-4">
              <a
                href="/analyze/new"
                className="inline-flex items-center justify-center rounded-md font-semibold h-10 px-4 gradient-brand text-brand-foreground hover:opacity-90 transition-opacity"
              >
                Create a new check
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

