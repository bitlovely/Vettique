import { createClient } from "@/lib/supabase/server";

type Params = { id: string };

export default async function ReportPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-8 border-b border-border bg-muted/10">
              <p className="text-xs text-muted-foreground">Report</p>
              <h1 className="text-2xl font-bold text-foreground mt-2">Report</h1>
              <p className="text-sm text-muted-foreground mt-1">Unauthorized.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { data: report } = await supabase
    .from("supplier_reports")
    .select(
      "id, created_at, company_name, country, platform, category, risk_score, risk_level, summary, flags, recommendations, verdict_class, verdict_headline, verdict_detail",
    )
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (!report) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-8 border-b border-border bg-muted/10">
              <p className="text-xs text-muted-foreground">
                <a href="/analyze" className="hover:underline">
                  Dashboard
                </a>{" "}
                <span aria-hidden="true">/</span>{" "}
                <span className="text-foreground">Report</span>
              </p>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mt-2">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Report not found
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    This report may have been deleted or you may not have access.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <a
                    href="/analyze"
                    className="inline-flex items-center justify-center rounded-md font-semibold h-10 px-4 border border-border bg-background text-foreground hover:bg-muted/40 transition-colors"
                  >
                    Back to dashboard
                  </a>
                  <a
                    href="/analyze/new"
                    className="inline-flex items-center justify-center rounded-md font-semibold h-10 px-4 gradient-brand text-brand-foreground hover:opacity-90 transition-opacity"
                  >
                    New check
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const flags = Array.isArray(report.flags) ? report.flags : [];
  const recommendations = Array.isArray(report.recommendations)
    ? report.recommendations
    : [];

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="vettique-blob absolute -top-24 -left-20 h-72 w-72 rounded-full bg-sky-400/40 dark:bg-sky-500/20" />
        <div className="vettique-blob absolute top-20 -right-28 h-80 w-80 rounded-full bg-fuchsia-400/30 dark:bg-fuchsia-500/18 [animation-delay:1.2s]" />
        <div className="vettique-blob absolute bottom-[-6rem] left-1/3 h-96 w-96 rounded-full bg-emerald-400/25 dark:bg-emerald-500/14 [animation-delay:2.4s]" />
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="vettique-fade-up rounded-2xl border border-border/60 bg-card/70 dark:bg-card/55 backdrop-blur-xl shadow-[0_20px_80px_-30px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_90px_-40px_rgba(0,0,0,0.55)] overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-border/60 bg-gradient-to-br from-muted/40 to-transparent dark:from-muted/25 dark:to-transparent">
            <p className="text-xs text-muted-foreground">
              <a href="/analyze" className="hover:underline">
                Dashboard
              </a>{" "}
              <span aria-hidden="true">/</span>{" "}
              <span className="text-foreground">Report</span>
            </p>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mt-2">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground truncate">
                  {report.company_name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(report.created_at).toLocaleString()} • {report.country}
                  {report.platform ? ` • ${report.platform}` : ""} •{" "}
                  {report.category}
                </p>
              </div>
              <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
                <a
                  href="/analyze"
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-md font-semibold h-10 px-5 whitespace-nowrap border border-border/70 bg-background/60 dark:bg-background/35 text-foreground hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors shadow-sm hover:shadow-md active:translate-y-px motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Back to dashboard
                </a>
                <a
                  href="/analyze/new"
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-md font-semibold h-10 px-5 whitespace-nowrap gradient-brand text-brand-foreground hover:opacity-95 transition-opacity shadow-sm hover:shadow-md active:translate-y-px motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  New check
                </a>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-xl border border-border/70 p-5 bg-background/60 dark:bg-background/40 backdrop-blur">
              <p className="text-sm text-muted-foreground">Risk score</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {report.risk_score}/100
              </p>
            </div>
            <div className="rounded-xl border border-border/70 p-5 bg-background/60 dark:bg-background/40 backdrop-blur">
              <p className="text-sm text-muted-foreground">Risk level</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {report.risk_level}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 p-5 bg-background/60 dark:bg-background/40 backdrop-blur">
              <p className="text-sm text-muted-foreground">Verdict</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {report.verdict_class}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-border/70 bg-background/60 dark:bg-background/40 backdrop-blur p-5">
            <h2 className="text-sm font-semibold text-foreground">Summary</h2>
            <p className="text-sm text-muted-foreground mt-2">{report.summary}</p>
          </div>

          <div className="mt-6 rounded-xl border border-border/70 bg-background/60 dark:bg-background/40 backdrop-blur p-5">
            <h2 className="text-sm font-semibold text-foreground">Flags</h2>
            <div className="mt-3 grid gap-3">
              {flags.length ? (
                flags.map((f: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/70 bg-background/70 dark:bg-background/40 p-4"
                  >
                    <p className="text-xs text-muted-foreground">
                      {String(f?.severity ?? "").toUpperCase() || "FLAG"}
                    </p>
                    <p className="font-semibold text-foreground mt-1">
                      {String(f?.title ?? "")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {String(f?.detail ?? "")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No flags.</p>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border/70 bg-background/60 dark:bg-background/40 backdrop-blur p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Recommendations
            </h2>
            <div className="mt-3 grid gap-2">
              {recommendations.length ? (
                recommendations.map((r: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/70 bg-background/70 dark:bg-background/40 p-4 text-sm text-muted-foreground"
                  >
                    {String(r ?? "")}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recommendations.</p>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border/70 bg-background/60 dark:bg-background/40 backdrop-blur p-5">
            <h2 className="text-sm font-semibold text-foreground">Verdict</h2>
            <p className="font-semibold text-foreground mt-2">
              {report.verdict_headline}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {report.verdict_detail}
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

