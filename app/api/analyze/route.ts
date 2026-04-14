import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RiskReport, SupplierInput } from "@/lib/analysis/types";

function clampScore(n: number) {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeRiskLevel(v: unknown): RiskReport["riskLevel"] {
  if (v === "LOW" || v === "MEDIUM" || v === "HIGH") return v;
  return "MEDIUM";
}

function normalizeVerdictClass(v: unknown): RiskReport["verdict"]["class"] {
  if (v === "proceed" || v === "caution" || v === "avoid") return v;
  return "caution";
}

type MockedCode =
  | "NO_API_KEY"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "NON_JSON"
  | "INVALID_JSON";

function buildMockReport(input: SupplierInput): RiskReport {
  return {
    riskScore: 42,
    riskLevel: "MEDIUM",
    summary: `Fallback report. Supplier: ${input.companyName}.`,
    flags: [
      {
        severity: "amber",
        title: "Verification gaps",
        detail:
          "Provide website, business registration, and references to validate legitimacy.",
      },
      {
        severity: "green",
        title: "Risk-limiting next step",
        detail: "Use escrow or a small trial order to reduce risk.",
      },
    ],
    recommendations: [
      "Start with a small trial order to verify product quality and shipping reliability.",
      "Avoid wiring large upfront payments without proof of track record.",
    ],
    verdict: {
      class: "caution",
      headline: "Proceed only with controls",
      detail:
        "There are enough unknowns that you should treat this supplier as medium risk until verification is complete. Use protective terms and verify identity before sending meaningful funds.",
    },
  };
}

function validateInput(body: unknown): SupplierInput {
  if (!body || typeof body !== "object") throw new Error("Invalid payload");
  const b = body as Record<string, unknown>;

  const required = ["companyName", "countryRegion", "productCategory"] as const;

  for (const k of required) {
    if (typeof b[k] !== "string" || b[k]!.trim().length < 2) {
      throw new Error(`Missing or invalid field: ${k}`);
    }
  }

  if (
    !b.checksToRun ||
    typeof b.checksToRun !== "object" ||
    Array.isArray(b.checksToRun)
  ) {
    throw new Error("Missing or invalid field: checksToRun");
  }

  const c = b.checksToRun as Record<string, unknown>;
  const checkKeys = [
    "legitimacy",
    "paymentTerms",
    "locationRisk",
    "platformSignals",
    "productCategoryRisk",
    "operationalSignals",
  ] as const;

  for (const k of checkKeys) {
    if (typeof c[k] !== "boolean") {
      throw new Error(`Missing or invalid check: checksToRun.${k}`);
    }
  }

  const observations =
    typeof b.observations === "string" ? b.observations.trim() : undefined;
  const platformFoundOn =
    typeof b.platformFoundOn === "string" ? b.platformFoundOn.trim() : undefined;
  const yearsOnPlatform =
    typeof b.yearsOnPlatform === "string" ? b.yearsOnPlatform.trim() : undefined;
  const orderSizeUnits =
    typeof b.orderSizeUnits === "string" ? b.orderSizeUnits.trim() : undefined;
  const quoteReceived =
    typeof b.quoteReceived === "string" ? b.quoteReceived.trim() : undefined;

  return {
    companyName: (b.companyName as string).trim(),
    countryRegion: (b.countryRegion as string).trim(),
    ...(platformFoundOn ? { platformFoundOn } : {}),
    ...(yearsOnPlatform ? { yearsOnPlatform } : {}),
    productCategory: (b.productCategory as string).trim(),
    ...(orderSizeUnits ? { orderSizeUnits } : {}),
    ...(quoteReceived ? { quoteReceived } : {}),
    ...(observations ? { observations } : {}),
    checksToRun: {
      legitimacy: c.legitimacy as boolean,
      paymentTerms: c.paymentTerms as boolean,
      locationRisk: c.locationRisk as boolean,
      platformSignals: c.platformSignals as boolean,
      productCategoryRisk: c.productCategoryRisk as boolean,
      operationalSignals: c.operationalSignals as boolean,
    },
  };
}

type GeminiResult = {
  report: RiskReport;
  mocked: boolean;
  mockedCode?: MockedCode;
  mockedReason?: string;
  geminiFinishReason?: string;
  geminiSafetyRatings?: unknown;
  geminiTextSnippet?: string;
};

async function callGemini(input: SupplierInput): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      report: buildMockReport(input),
      mocked: true,
      mockedCode: "NO_API_KEY",
      mockedReason: "Missing GEMINI_API_KEY (using fallback).",
    };
  }

  const model =
    process.env.GEMINI_MODEL?.trim() ||
    // Default to a lighter model to avoid dev-time 429s on free tier.
    "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  async function sleep(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
  }

  function parseRetryAfterMs(res: Response): number | null {
    const v = res.headers.get("retry-after");
    if (!v) return null;
    // retry-after can be seconds or an HTTP date. We handle seconds.
    const seconds = Number(v);
    if (Number.isFinite(seconds) && seconds > 0) return Math.round(seconds * 1000);
    return null;
  }

  const system = `You are a senior import/export risk analyst with 15 years of experience vetting overseas suppliers for small e-commerce and Amazon sellers. You are direct, specific, and never sugarcoat risks.

Analyse this supplier profile and return a structured JSON report. Be realistic — not every supplier is high risk, but be genuinely critical where warranted.

Return ONLY valid JSON in exactly this structure (no markdown, no backticks):
{
  "riskScore": <integer 0-100, where 0=very safe, 100=extreme risk>,
  "riskLevel": "<LOW|MEDIUM|HIGH>",
  "summary": "<2-3 sentence plain English summary of the overall risk picture>",
  "flags": [
    {
      "severity": "<red|amber|green>",
      "title": "<short flag title>",
      "detail": "<1-2 sentence specific explanation relevant to this supplier>"
    }
  ],
  "recommendations": [
    "<specific actionable step the buyer should take before proceeding>"
  ],
  "verdict": {
    "class": "<proceed|caution|avoid>",
    "headline": "<short verdict headline>",
    "detail": "<2 sentence verdict explanation>"
  }
}

Produce 4-6 flags and 4-5 recommendations. Make them specific to the details given, not generic boilerplate.`;

  const enabledChecks = Object.entries(input.checksToRun)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const prompt = `SUPPLIER DETAILS:
- Company name: ${input.companyName}
- Country: ${input.countryRegion}
- Platform: ${input.platformFoundOn ?? "Unknown"}
- Years on platform: ${input.yearsOnPlatform ?? "Unknown"}
- Product category: ${input.productCategory}
- Order size: ${input.orderSizeUnits ?? "Unknown"}
- Quote/payment terms: ${input.quoteReceived ?? "None provided"}
- Buyer observations: ${input.observations ?? "None provided"}

CHECKS TO RUN (enabled):
${enabledChecks.length ? enabledChecks.join(", ") : "none (still provide a balanced report)"}\n`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${system}\n\n${prompt}` }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      // Encourage the API to return machine-readable JSON.
      // (If the model still returns non-JSON, we fallback gracefully below.)
      responseMimeType: "application/json",
      // Keep this moderate to reduce token-per-minute throttling on free tier.
      maxOutputTokens: 650,
    },
  };

  let res: Response | null = null;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) break;
    // Retry on transient capacity/rate-limit errors.
    if (res.status !== 429 && res.status !== 503) break;

    if (attempt < maxAttempts) {
      const retryAfterMs = parseRetryAfterMs(res);
      const backoffMs =
        retryAfterMs ??
        // Exponential backoff with jitter, capped.
        Math.min(
          8000,
          Math.round((400 * 2 ** (attempt - 1)) * (0.8 + Math.random() * 0.6)),
        );
      await sleep(backoffMs);
      continue;
    }
  }

  if (!res) {
    throw new Error("Gemini error: no response");
  }

  if (!res.ok) {
    if (res.status === 429) {
      return {
        report: buildMockReport(input),
        mocked: true,
        mockedCode: "RATE_LIMITED",
        mockedReason: "Gemini rate-limited the request (429).",
      };
    }
    if (res.status === 503) {
      return {
        report: buildMockReport(input),
        mocked: true,
        mockedCode: "UNAVAILABLE",
        mockedReason:
          "Gemini is temporarily unavailable due to high demand (503).",
      };
    }
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini error: ${res.status} ${text}`.slice(0, 500));
  }

  const data = (await res.json()) as any;
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join("") ?? "";
  const finishReason = data?.candidates?.[0]?.finishReason as unknown;
  const safetyRatings = data?.candidates?.[0]?.safetyRatings as unknown;
  const textSnippet =
    typeof text === "string" && text.trim().length
      ? text.trim().slice(0, 200)
      : "";

  let parsed: any;
  try {
    const cleaned = String(text)
      .trim()
      // Remove common markdown fences if they slip through.
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    parsed = JSON.parse(cleaned);
  } catch {
    // Try extracting JSON from any surrounding text
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        report: buildMockReport(input),
        mocked: true,
        mockedCode: "NON_JSON",
        mockedReason:
          "Gemini returned non-JSON output (cannot parse). This can happen if the model adds extra text, returns an empty response, or safety-filters content.",
        geminiFinishReason:
          typeof finishReason === "string" ? finishReason : undefined,
        geminiSafetyRatings: safetyRatings,
        geminiTextSnippet: textSnippet || undefined,
      };
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return {
        report: buildMockReport(input),
        mocked: true,
        mockedCode: "INVALID_JSON",
        mockedReason: "Gemini returned invalid JSON (malformed).",
        geminiFinishReason:
          typeof finishReason === "string" ? finishReason : undefined,
        geminiSafetyRatings: safetyRatings,
        geminiTextSnippet: textSnippet || undefined,
      };
    }
  }

  return {
    mocked: false,
    report: {
      riskScore: clampScore(Number(parsed?.riskScore)),
      riskLevel: normalizeRiskLevel(parsed?.riskLevel),
      summary: typeof parsed?.summary === "string" ? parsed.summary : "",
      flags: Array.isArray(parsed?.flags) ? parsed.flags : [],
      recommendations: Array.isArray(parsed?.recommendations)
        ? parsed.recommendations
        : [],
      verdict: {
        class: normalizeVerdictClass(parsed?.verdict?.class),
        headline:
          typeof parsed?.verdict?.headline === "string"
            ? parsed.verdict.headline
            : "",
        detail:
          typeof parsed?.verdict?.detail === "string"
            ? parsed.verdict.detail
            : "",
      },
    },
  };
}

async function analyzeWithUsagePolicy(input: SupplierInput): Promise<{
  report: RiskReport;
  mocked: boolean;
  mockedCode?: MockedCode;
  mockedReason?: string;
  geminiFinishReason?: string;
  geminiSafetyRatings?: unknown;
  geminiTextSnippet?: string;
  shouldCountUsage: boolean;
}> {
  const result = await callGemini(input);
  return {
    report: result.report,
    mocked: result.mocked,
    mockedCode: result.mockedCode,
    mockedReason: result.mockedReason,
    geminiFinishReason: result.geminiFinishReason,
    geminiSafetyRatings: result.geminiSafetyRatings,
    geminiTextSnippet: result.geminiTextSnippet,
    shouldCountUsage: !result.mocked,
  };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const input = validateInput(body);

    // Ensure profile exists
    await supabase.from("profiles").upsert({ user_id: user.id }, { onConflict: "user_id" });

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthStartISO = monthStart.toISOString().slice(0, 10);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan, checks_this_month, checks_month")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Unable to load billing profile." },
        { status: 400 },
      );
    }

    const plan = (profile.plan as "free" | "pro") ?? "free";
    const checksMonth = (profile.checks_month as string) ?? monthStartISO;
    let checksThisMonth = Number(profile.checks_this_month ?? 0);

    // Reset monthly counter if needed.
    if (checksMonth !== monthStartISO) {
      checksThisMonth = 0;
      await supabase
        .from("profiles")
        .update({ checks_this_month: 0, checks_month: monthStartISO })
        .eq("user_id", user.id);
    }

    // Enforce limits
    if (plan === "free" && checksThisMonth >= 3) {
      return NextResponse.json(
        {
          error: "Free plan limit reached (3 checks/month). Please upgrade to Pro.",
          code: "LIMIT_REACHED",
          limit: 3,
          checksThisMonth,
          plan,
        },
        { status: 402 },
      );
    }

    const {
      report,
      mocked,
      mockedCode,
      mockedReason,
      geminiFinishReason,
      geminiSafetyRatings,
      geminiTextSnippet,
      shouldCountUsage,
    } = await analyzeWithUsagePolicy(input);

    // Count usage only on non-mocked successful AI responses.
    // This ensures transient Gemini failures (e.g. 503/429) don't burn a free check.
    if (shouldCountUsage) {
      await supabase
        .from("profiles")
        .update({ checks_this_month: checksThisMonth + 1 })
        .eq("user_id", user.id);
    }

    return NextResponse.json(
      {
        report,
        mocked,
        mockedCode,
        mockedReason,
        // Optional debugging hints for the UI/logs when mocked === true.
        geminiFinishReason,
        geminiSafetyRatings,
        geminiTextSnippet,
      },
      { status: 200 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

