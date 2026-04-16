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
  const recommendationCount = recommendations.length;

  return (
    <div className="h-full w-full px-4 sm:px-6 lg:px-10 py-6">
      <div className="h-full w-full flex flex-col gap-6">
        <div className="vettique-fade-up rounded-3xl border border-primary-foreground/10 bg-card/90 backdrop-blur-xl shadow-[0_28px_110px_-44px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="p-7 lg:p-8 border-b border-border/60">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground tracking-wide">
                  REPORT
                </p>
                <h1 className="text-2xl lg:text-[30px] font-bold text-foreground mt-2 leading-tight truncate">
                  {report.company_name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(report.created_at).toLocaleString()} • {report.country}
                  {report.platform ? ` • ${report.platform}` : ""} • {report.category}
                </p>
              </div>
              <div className="flex w-full lg:w-auto flex-col sm:flex-row gap-3 sm:items-center">
                <a
                  href="/analyze"
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl font-semibold h-11 px-6 border border-border bg-background text-foreground hover:bg-muted/30 transition-colors shadow-sm hover:shadow-md active:translate-y-px"
                >
                  Back to dashboard
                </a>
                <a
                  href="/analyze/new"
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl font-semibold h-11 px-6 gradient-brand text-brand-foreground hover:opacity-95 transition-opacity shadow-sm hover:shadow-md active:translate-y-px"
                >
                  New check
                </a>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl p-6 text-white shadow-lg shadow-rose-500/10 bg-gradient-to-br from-rose-500 to-orange-400">
                <p className="text-xs font-semibold tracking-wide text-white/80">
                  RISK SCORE
                </p>
                <p className="text-4xl font-extrabold mt-3 tabular-nums">
                  {report.risk_score}
                </p>
                <p className="text-sm text-white/80 mt-2">Out of 100</p>
              </div>
              <div className="rounded-2xl p-6 text-white shadow-lg shadow-fuchsia-500/10 bg-gradient-to-br from-indigo-500 to-fuchsia-500">
                <p className="text-xs font-semibold tracking-wide text-white/80">
                  RISK LEVEL
                </p>
                <p className="text-4xl font-extrabold mt-3">{report.risk_level}</p>
                <p className="text-sm text-white/80 mt-2">Overall supplier risk</p>
              </div>
              <div className="rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/10 bg-gradient-to-br from-emerald-500 to-teal-600">
                <p className="text-xs font-semibold tracking-wide text-white/80">
                  FLAGS FOUND
                </p>
                <p className="text-4xl font-extrabold mt-3 tabular-nums">{flags.length}</p>
                <p className="text-sm text-white/80 mt-2">Across this report</p>
              </div>
              <div className="rounded-2xl p-6 text-white shadow-lg shadow-sky-500/10 bg-gradient-to-br from-sky-500 to-indigo-600">
                <p className="text-xs font-semibold tracking-wide text-white/80">
                  RECOMMENDATIONS
                </p>
                <p className="text-4xl font-extrabold mt-3 tabular-nums">
                  {recommendationCount}
                </p>
                <p className="text-sm text-white/80 mt-2">Suggested next steps</p>
              </div>
            </div>
          </div>

          <div className="p-7 lg:p-8 grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-12 rounded-2xl border border-border bg-background/90 overflow-hidden">
              <div className="px-6 py-5 border-b border-border bg-muted/10">
                <h2 className="text-sm font-semibold text-foreground">Summary</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {report.summary}
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-border bg-background/90 overflow-hidden">
              <div className="px-6 py-5 border-b border-border bg-muted/10">
                <h2 className="text-sm font-semibold text-foreground">Flag analysis</h2>
              </div>
              <div className="p-6 grid gap-3">
                {flags.length ? (
                  flags.map((f: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      <p className="text-xs font-semibold text-muted-foreground">
                        {String(f?.severity ?? "").toUpperCase() || "FLAG"}
                      </p>
                      <p className="font-semibold text-foreground mt-1">
                        {String(f?.title ?? "")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {String(f?.detail ?? "")}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No flags.</p>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-border bg-background/90 overflow-hidden">
              <div className="px-6 py-5 border-b border-border bg-muted/10">
                <h2 className="text-sm font-semibold text-foreground">
                  Recommendations
                </h2>
              </div>
              <div className="p-6 grid gap-3">
                {recommendations.length ? (
                  recommendations.map((r: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground"
                    >
                      {String(r ?? "")}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recommendations.</p>
                )}
              </div>
            </div>

            <div className="lg:col-span-12 rounded-2xl border border-border bg-background/90 overflow-hidden">
              <div className="px-6 py-5 border-b border-border bg-muted/10">
                <h2 className="text-sm font-semibold text-foreground">Verdict</h2>
              </div>
              <div className="p-6">
                <p className="font-semibold text-foreground">{report.verdict_headline}</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
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

