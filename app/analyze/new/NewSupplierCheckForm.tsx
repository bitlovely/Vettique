"use client";

import { useMemo, useState, useTransition } from "react";
import type { RiskReport, SupplierInput } from "@/lib/analysis/types";

function Pill(props: {
  severity: "red" | "amber" | "green";
  children: React.ReactNode;
}) {
  const styles =
    props.severity === "green"
      ? "risk-green-bg text-risk-green border border-risk-green/20"
      : props.severity === "amber"
        ? "risk-amber-bg text-risk-amber border border-risk-amber/20"
        : "risk-red-bg text-risk-red border border-risk-red/20";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      {props.children}
    </span>
  );
}

function scoreColor(score: number) {
  if (score >= 70) return "text-risk-red";
  if (score >= 40) return "text-risk-amber";
  return "text-risk-green";
}

function riskLevelPill(level: RiskReport["riskLevel"]) {
  if (level === "LOW") return { severity: "green" as const, label: "LOW" };
  if (level === "HIGH") return { severity: "red" as const, label: "HIGH" };
  return { severity: "amber" as const, label: "MEDIUM" };
}

export default function NewSupplierCheckForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [report, setReport] = useState<RiskReport | null>(null);
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);

  const fieldBase =
    "flex w-full rounded-xl border border-border/70 bg-background/90 px-3.5 py-2 text-sm text-foreground shadow-sm transition-colors " +
    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand " +
    "focus-visible:ring-offset-2 ring-offset-background";
  const inputClass = `${fieldBase} h-11`;
  const selectClass = `${fieldBase} h-11 pr-10`;
  const textareaClass = `${fieldBase} min-h-[112px]`;

  const [form, setForm] = useState<SupplierInput>({
    companyName: "",
    countryRegion: "",
    platformFoundOn: "",
    yearsOnPlatform: "",
    productCategory: "",
    orderSizeUnits: "",
    quoteReceived: "",
    observations: "",
    checksToRun: {
      legitimacy: true,
      paymentTerms: true,
      locationRisk: true,
      platformSignals: true,
      productCategoryRisk: true,
      operationalSignals: true,
    },
  });

  const canSubmit = useMemo(() => {
    return (
      form.companyName.trim().length > 1 &&
      form.countryRegion.trim().length > 1 &&
      form.productCategory.trim().length > 1
    );
  }, [form]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setReport(null);
    setUpgradeUrl(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...form,
            platformFoundOn: form.platformFoundOn?.trim()
              ? form.platformFoundOn
              : undefined,
            yearsOnPlatform: form.yearsOnPlatform?.trim()
              ? form.yearsOnPlatform
              : undefined,
            orderSizeUnits: form.orderSizeUnits?.trim()
              ? form.orderSizeUnits
              : undefined,
            quoteReceived: form.quoteReceived?.trim() ? form.quoteReceived : undefined,
            observations: form.observations?.trim() ? form.observations : undefined,
          }),
        });

        const data = (await res.json()) as any;
        if (!res.ok) {
          if (res.status === 402 && data?.code === "LIMIT_REACHED") {
            setError(data?.error ?? "Free plan limit reached.");
            // Create checkout session lazily when needed
            try {
              const ck = await fetch("/api/stripe/checkout", { method: "POST" });
              const ckData = (await ck.json()) as any;
              if (ck.ok && ckData?.url) setUpgradeUrl(ckData.url);
            } catch {
              // ignore
            }
          } else {
            setError(data?.error ?? "Something went wrong.");
          }
          return;
        }

        if (data?.mocked) {
          setNotice(
            "Gemini quota is currently unavailable — showing a demo report so you can keep testing.",
          );
        }
        setReport(data.report as RiskReport);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      }
    });
  }

  return (
    <div className="grid gap-6">
      {/* "Cute selector" inspired style */}
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="companyName">
              Company Name
            </label>
            <input
              id="companyName"
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              className={inputClass}
              placeholder="Example Trading Co., Ltd"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="countryRegion">
              Country / Region
            </label>
            <select
              id="countryRegion"
              value={form.countryRegion}
              onChange={(e) => setForm((f) => ({ ...f, countryRegion: e.target.value }))}
              className={selectClass}
              required
            >
              <option value="" disabled>
                Select a country / region
              </option>
              <option value="China">China</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="India">India</option>
              <option value="Vietnam">Vietnam</option>
              <option value="Turkey">Turkey</option>
              <option value="Mexico">Mexico</option>
              <option value="Germany">Germany</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="platformFoundOn">
              Platform Found On
            </label>
            <select
              id="platformFoundOn"
              value={form.platformFoundOn ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, platformFoundOn: e.target.value }))}
              className={selectClass}
            >
              <option value="">Select a platform (optional)</option>
              <option value="Alibaba">Alibaba</option>
              <option value="1688">1688</option>
              <option value="Amazon">Amazon</option>
              <option value="Shopify">Shopify</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="WeChat">WeChat</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="productCategory">
              Product Category
            </label>
            <input
              id="productCategory"
              value={form.productCategory}
              onChange={(e) => setForm((f) => ({ ...f, productCategory: e.target.value }))}
              className={inputClass}
              placeholder="Home & Kitchen"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="yearsOnPlatform">
              Years on Platform
            </label>
            <select
              id="yearsOnPlatform"
              value={form.yearsOnPlatform ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, yearsOnPlatform: e.target.value }))}
              className={selectClass}
            >
              <option value="">Select (optional)</option>
              <option value="Under 1 year">Under 1 year</option>
              <option value="1–2 years">1–2 years</option>
              <option value="3–5 years">3–5 years</option>
              <option value="6–10 years">6–10 years</option>
              <option value="10+ years">10+ years</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="orderSizeUnits">
              Order Size in Units
            </label>
            <select
              id="orderSizeUnits"
              value={form.orderSizeUnits ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, orderSizeUnits: e.target.value }))}
              className={selectClass}
            >
              <option value="">Select (optional)</option>
              <option value="1–50">1–50</option>
              <option value="51–200">51–200</option>
              <option value="201–500">201–500</option>
              <option value="501–1,000">501–1,000</option>
              <option value="1,001–5,000">1,001–5,000</option>
              <option value="5,001+">5,001+</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="quoteReceived">
            Quote Received (optional)
          </label>
          <input
            id="quoteReceived"
            value={form.quoteReceived ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, quoteReceived: e.target.value }))}
            className={inputClass}
            placeholder="e.g., $1.25/unit + $980 shipping, lead time 15 days"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="observations">
            Observations / Red Flags (optional)
          </label>
          <textarea
            id="observations"
            value={form.observations ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
            className={textareaClass}
            placeholder="Any red flags you noticed, links, screenshots, unusual requests, etc."
          />
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Checks to run</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                All enabled by default. Turn off anything you don’t need.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(
              [
                ["legitimacy", "Legitimacy & business verification"],
                ["paymentTerms", "Payment terms risk"],
                ["locationRisk", "Country / location risk"],
                ["platformSignals", "Platform signals & reputation"],
                ["productCategoryRisk", "Product category risk"],
                ["operationalSignals", "Operational / communication signals"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[hsl(var(--brand))]"
                  checked={form.checksToRun[key]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      checksToRun: { ...f.checksToRun, [key]: e.target.checked },
                    }))
                  }
                />
                <span className="text-sm text-foreground">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <div>{error}</div>
            {upgradeUrl ? (
              <div className="mt-3">
                <a
                  href={upgradeUrl}
                  className="inline-flex items-center justify-center rounded-md font-semibold h-10 px-4 gradient-brand text-brand-foreground hover:opacity-90 transition-opacity"
                >
                  Upgrade to Pro — $19/month
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
            {notice}
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Tip: Start with a small trial order for new suppliers.
          </p>
          <button
            type="submit"
            disabled={!canSubmit || pending}
            className="inline-flex items-center justify-center rounded-md font-semibold h-11 px-5 gradient-brand text-brand-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {pending ? "Analyzing Supplier…" : "Run AI Analysis"}
          </button>
        </div>
      </form>

      {report ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Full AI risk reports</h2>
              <p className="text-sm text-muted-foreground mt-1">{report.summary}</p>
              <div className="mt-3">
                <Pill
                  severity={riskLevelPill(report.riskLevel).severity}
                >
                  Risk: {riskLevelPill(report.riskLevel).label}
                </Pill>
              </div>
            </div>

            <div className="flex items-end gap-3">
              <div className="text-right">
                <div className={`text-4xl font-extrabold ${scoreColor(report.riskScore)}`}>
                  {report.riskScore}
                  <span className="text-base text-muted-foreground font-bold"> / 100</span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {report.verdict.headline}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Risk Flag Analysis
              </h3>
              <div className="space-y-3">
                {report.flags?.length ? (
                  report.flags.map((f, idx) => (
                    <div key={`${f.title}-${idx}`} className="flex gap-3">
                      <div className="pt-0.5">
                        <Pill severity={f.severity}>
                          {f.severity === "green"
                            ? "Low Risk"
                            : f.severity === "amber"
                              ? "Medium Risk"
                              : "High Risk"}
                        </Pill>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">{f.title}</div>
                        <div className="text-sm text-muted-foreground">{f.detail}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No flags returned.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Recommendations
              </h3>
              <ul className="space-y-2">
                {(report.recommendations ?? []).map((r, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">
                    - {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-background p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">Verdict</h3>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="text-base font-bold text-foreground">
                  {report.verdict.headline}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{report.verdict.detail}</div>
              </div>
              <Pill
                severity={
                  report.verdict.class === "proceed"
                    ? "green"
                    : report.verdict.class === "avoid"
                      ? "red"
                      : "amber"
                }
              >
                {report.verdict.class.toUpperCase()}
              </Pill>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

