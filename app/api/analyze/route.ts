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
  | "TRUNCATED"
  | "CACHED"
  | "NON_JSON"
  | "INVALID_JSON";

function buildMockReport(input: SupplierInput): RiskReport {
  const cat = input.productCategory;
  const region = input.countryRegion;
  return {
    riskScore: 42,
    riskLevel: "MEDIUM",
    summary: `Demo fallback (AI unavailable). For ${input.companyName} in ${region}, selling ${cat}, this is a placeholder risk picture so you can test the UI — run again when Gemini is connected for a real assessment.`,
    flags: [
      {
        severity: "amber",
        title: `Business identity for ${input.companyName} not verified in this demo`,
        detail:
          "Request a company registration extract, VAT/tax ID, and a video call on a registered domain email before sharing designs or paying deposits. Match the legal entity name to the bank account beneficiary exactly.",
      },
      {
        severity: "amber",
        title: `Country exposure: ${region} logistics and dispute recovery`,
        detail:
          "Map realistic lead times and incoterms for this region and category. Confirm who pays duties and who holds title in transit. Agree in writing on defect rates, rework, and chargebacks before scaling volume.",
      },
      {
        severity: "amber",
        title: `Category controls for ${cat}: specs, compliance, and samples`,
        detail:
          "Lock a golden sample, material specs, packaging, and labeling (including marketplace compliance if you sell on Amazon). Book a third-party inspection on the first production lot if order value is material.",
      },
      {
        severity: "green",
        title: "Structural way to cap payment loss on a new supplier",
        detail:
          "Prefer purchase orders with milestone releases, escrow, or LC-style protections over unstructured T/T until track record exists. Cap the first wire to the smallest amount that still lets the factory start credibly.",
      },
    ],
    recommendations: [
      `Obtain and verify registration + banking details for ${input.companyName} and confirm they align with ${region} records you can check independently.`,
      "Negotiate payment milestones tied to inspection or shipment documents rather than a single large upfront transfer.",
      `Order a paid pilot shipment in ${cat} with agreed acceptance criteria before committing to bulk.`,
      "Use a written contract referencing incoterms, defect allowances, and clear remedies if quality or timing slips.",
    ],
    verdict: {
      class: "caution",
      headline: "Demo report — connect AI for supplier-specific findings",
      detail:
        "This four-flag layout mirrors the live product format. When Gemini is available, you will get the same structure with text grounded in your exact quote, platform signals, and notes. Until then, treat every field as illustrative only.",
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

const REPORT_MIN_FLAGS = 4;
const REPORT_MAX_FLAGS = 6;
const REPORT_MIN_RECS = 4;
const REPORT_MAX_RECS = 5;

function normalizeFlagsFromParsed(raw: unknown): RiskReport["flags"] {
  if (!Array.isArray(raw)) return [];
  const out: RiskReport["flags"] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const sevRaw = o.severity;
    const severity =
      sevRaw === "red" || sevRaw === "amber" || sevRaw === "green" ? sevRaw : "amber";
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const detail = typeof o.detail === "string" ? o.detail.trim() : "";
    if (!title && !detail) continue;
    out.push({
      severity,
      title: title || "Risk topic",
      detail: detail || title,
    });
  }
  return out;
}

function normalizeRecommendationsFromParsed(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
    .map((r) => r.trim());
}

function clampReportArrays(report: RiskReport): RiskReport {
  return {
    ...report,
    flags: report.flags.slice(0, REPORT_MAX_FLAGS),
    recommendations: report.recommendations.slice(0, REPORT_MAX_RECS),
  };
}

function parsedJsonToReport(parsed: unknown): RiskReport {
  const p = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
  const verdictRaw =
    p.verdict && typeof p.verdict === "object"
      ? (p.verdict as Record<string, unknown>)
      : {};
  return clampReportArrays({
    riskScore: clampScore(Number(p.riskScore)),
    riskLevel: normalizeRiskLevel(p.riskLevel),
    summary: typeof p.summary === "string" ? p.summary : "",
    flags: normalizeFlagsFromParsed(p.flags),
    recommendations: normalizeRecommendationsFromParsed(p.recommendations),
    verdict: {
      class: normalizeVerdictClass(verdictRaw.class),
      headline:
        typeof verdictRaw.headline === "string" ? verdictRaw.headline : "",
      detail: typeof verdictRaw.detail === "string" ? verdictRaw.detail : "",
    },
  });
}

function reportMeetsBriefCounts(report: RiskReport): boolean {
  const nf = report.flags.length;
  const nr = report.recommendations.length;
  return (
    nf >= REPORT_MIN_FLAGS &&
    nf <= REPORT_MAX_FLAGS &&
    nr >= REPORT_MIN_RECS &&
    nr <= REPORT_MAX_RECS
  );
}

/** Prefer reports that satisfy minimum counts; otherwise pick the densest response. */
function pickRicherReport(a: RiskReport, b: RiskReport): RiskReport {
  const score = (r: RiskReport) => {
    let s = r.flags.length * 10 + r.recommendations.length;
    if (r.flags.length >= REPORT_MIN_FLAGS) s += 1000;
    if (r.recommendations.length >= REPORT_MIN_RECS) s += 1000;
    return s;
  };
  return score(b) > score(a) ? b : a;
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

// Best-effort dedupe/cache to avoid burst 429s from double-submits.
// Note: This is in-memory per server instance (good for dev and single instance).
const inFlightByUser = new Map<string, Promise<GeminiResult>>();
const lastGoodByUser = new Map<
  string,
  { atMs: number; result: GeminiResult }
>();
const LAST_GOOD_TTL_MS = 5 * 60 * 1000;

async function callGemini(userId: string, input: SupplierInput): Promise<GeminiResult> {
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

Analyse this supplier profile and return ONLY valid JSON (no markdown, no code fences, no commentary before or after the JSON). Be realistic — not every supplier is high risk — but be genuinely critical where warranted.

Return valid JSON in exactly this structure:
{
  "riskScore": <integer 0-100, where 0=very safe, 100=extreme risk>,
  "riskLevel": "<LOW|MEDIUM|HIGH>",
  "summary": "<3-5 sentences in plain English. Reference this supplier by context: country/region, product category, platform (if known), tenure on platform, order size, quote/payment terms, and buyer observations. Say what is solid, what is weak, and what is unknown.>",
  "flags": [
    {
      "severity": "<red|amber|green>",
      "title": "<Precise label: name the issue or positive signal for THIS profile — not an umbrella phrase. Prefer roughly 6-14 words.>",
      "detail": "<2-4 sentences. Explain the mechanism: fraud, quality, logistics, IP, compliance, or financial exposure. Tie claims to the fields supplied; if data is missing, state exactly what is missing and how that increases risk. Aim for roughly 200-450 characters per flag.>"
    }
  ],
  "recommendations": [
    "<Concrete next step for this buyer: name the verification, document, payment structure, sample plan, or inspection — and why it matters for this country/category/terms. One or two sentences each, roughly 120-320 characters.>"
  ],
  "verdict": {
    "class": "<proceed|caution|avoid>",
    "headline": "<Verdict tied to evidence — not a slogan. Up to ~120 characters.>",
    "detail": "<3-4 sentences connecting the verdict to the strongest flags and the buyer's situation.>"
  }
}

STRICT COUNTS:
- flags: minimum 4, maximum 6 (never fewer than 4, never more than 6).
- recommendations: minimum 4, maximum 5.

COVERAGE: When CHECKS TO RUN lists enabled dimensions (legitimacy, paymentTerms, locationRisk, platformSignals, productCategoryRisk, operationalSignals), spread your flags across those themes where relevant. If a check is disabled, you may omit that theme. Include a mix of severities when the profile warrants it (use green flags for genuine positives, not filler).

FORBIDDEN — do not use these as flag titles, recommendation text, or vague substitutes for analysis (alone or as the bulk of a field): "Multiple issues found", "Various concerns", "Mixed signals", "Further investigation needed", "Further review needed", "Avoid engagement", "Be cautious", "Exercise caution", "Do your due diligence", "Do more research", "Proceed with caution" without naming specific controls. Every flag title must name a concrete topic (e.g. payment structure, platform traceability, category compliance, MOQ vs. order size, shipping/incoterms, buyer-stated red flags).

QUALITY BAR: A competent importer reading the JSON should know exactly what to verify next for this supplier — not generic e-commerce advice.`;

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

  const basePayload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${system}\n\n${prompt}` }],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      responseMimeType: "application/json",
      // Enough room for 4-6 detailed flags + 4-5 recommendations without truncation.
      maxOutputTokens: 4096,
    },
  } as const;

  const retrySystem = `${system}

RETRY: If your previous attempt was truncated or invalid JSON, output one complete valid JSON object only. If you must shorten text to fit, trim adjectives first — never reduce the number of flags below 4 or recommendations below 4, and never replace specifics with generic phrases.`;

  const compactPayload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${retrySystem}\n\n${prompt}` }],
      },
    ],
    generationConfig: {
      temperature: 0.25,
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
    },
  } as const;

  function buildExpandCountsPayload(partial: RiskReport, strict: boolean) {
    const intro = strict
      ? `CRITICAL: The previous JSON still had fewer than ${REPORT_MIN_FLAGS} flags or fewer than ${REPORT_MIN_RECS} recommendations. Your response will be discarded unless flags.length is ${REPORT_MIN_FLAGS}-${REPORT_MAX_FLAGS} AND recommendations.length is ${REPORT_MIN_RECS}-${REPORT_MAX_RECS}.`
      : `The draft report violates the contract: "flags" must have length ${REPORT_MIN_FLAGS}-${REPORT_MAX_FLAGS} (inclusive) and "recommendations" must have length ${REPORT_MIN_RECS}-${REPORT_MAX_RECS} (inclusive).`;

    const expandSystem = `${intro}

Return ONLY valid JSON (no markdown, no code fences). Keep riskScore, riskLevel, summary, and verdict aligned with the draft when still accurate — but you MUST replace "flags" and "recommendations" so the final arrays meet the counts exactly within those ranges. Merge strong items from the draft, then add new distinct flags and recommendations until counts are valid. Each flag: severity, concrete title, detail with 2+ sentences tied to this supplier. No umbrella titles.

Schema:
{
  "riskScore": <integer 0-100>,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "summary": "<string>",
  "flags": [{"severity":"red"|"amber"|"green","title":"<string>","detail":"<string>"}],
  "recommendations": ["<string>"],
  "verdict": {"class":"proceed"|"caution"|"avoid","headline":"<string>","detail":"<string>"}
}`;

    return {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${expandSystem}\n\n${prompt}\n\nCURRENT_DRAFT_JSON:\n${JSON.stringify(partial)}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: strict ? 0.1 : 0.2,
        responseMimeType: "application/json",
        maxOutputTokens: 4096,
      },
    } as const;
  }

  function buildRepairPayload(truncatedJson: string) {
    const repairSystem = `You will be given a TRUNCATED or partial JSON supplier risk report.
Output ONLY one complete, valid JSON object. No markdown or backticks.
- Preserve and expand existing specific wording where it is already concrete.
- Ensure the final object has 4-6 flags and 4-5 recommendations (add missing entries with supplier-specific content inferred from whatever fields are present in the partial JSON — never generic placeholders like "Multiple issues found" or "Further investigation needed").
- Each flag needs severity, title (concrete topic), and detail (2-4 sentences when possible).
- Each recommendation must name a specific action.

Schema (must match exactly):
{
  "riskScore": <integer 0-100>,
  "riskLevel": "<LOW|MEDIUM|HIGH>",
  "summary": "<string>",
  "flags": [{"severity":"<red|amber|green>","title":"<string>","detail":"<string>"}],
  "recommendations": ["<string>"],
  "verdict": {"class":"<proceed|caution|avoid>","headline":"<string>","detail":"<string>"}
}`;

    return {
      contents: [
        {
          role: "user",
          parts: [{ text: `${repairSystem}\n\nTRUNCATED_JSON:\n${truncatedJson}` }],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        maxOutputTokens: 3072,
      },
    } as const;
  }

  const apiKeySafe = apiKey as string;

  async function fetchWithRetry(payload: unknown): Promise<Response> {
    let res: Response;
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKeySafe)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) return res;
      // Retry on transient capacity/rate-limit errors.
      if (res.status !== 429 && res.status !== 503) return res;

      if (attempt < maxAttempts) {
        const retryAfterMs = parseRetryAfterMs(res);
        const backoffMs =
          retryAfterMs ??
          Math.min(
            30000,
            Math.round((800 * 2 ** (attempt - 1)) * (0.8 + Math.random() * 0.6)),
          );
        await sleep(backoffMs);
      }
    }
    // TypeScript: res is assigned in loop before possible return.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return res!;
  }

  function getCachedGood(): GeminiResult | null {
    const v = lastGoodByUser.get(userId);
    if (!v) return null;
    if (Date.now() - v.atMs > LAST_GOOD_TTL_MS) return null;
    return {
      ...v.result,
      mocked: true,
      mockedCode: "CACHED",
      mockedReason:
        "Using a recent successful AI result (cached) due to rate limiting.",
    };
  }

  async function parseResponseOrFallback(res: Response): Promise<GeminiResult> {
    if (!res.ok) {
      if (res.status === 429) {
        // If we have a recent good result, prefer returning that over a fallback.
        // This avoids showing "rate limited" to the user on repeated submits.
        // (Still does NOT count usage because it's returned as mocked.)
        const cached = getCachedGood();
        if (cached) return cached;
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
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text)
        .join("") ?? "";
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
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "");
      parsed = JSON.parse(cleaned);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        if (finishReason === "MAX_TOKENS") {
          return {
            report: buildMockReport(input),
            mocked: true,
            mockedCode: "TRUNCATED",
            mockedReason:
              "Gemini response was truncated (MAX_TOKENS) before completing valid JSON.",
            geminiFinishReason:
              typeof finishReason === "string" ? finishReason : undefined,
            geminiSafetyRatings: safetyRatings,
            geminiTextSnippet: textSnippet || undefined,
          };
        }
        return {
          report: buildMockReport(input),
          mocked: true,
          mockedCode: "NON_JSON",
          mockedReason: "Gemini returned non-JSON output.",
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
      report: parsedJsonToReport(parsed),
    };
  }

  async function ensureReportCountsIfNeeded(result: GeminiResult): Promise<GeminiResult> {
    if (result.mocked) return result;
    if (reportMeetsBriefCounts(result.report)) return result;

    const first = await parseResponseOrFallback(
      await fetchWithRetry(buildExpandCountsPayload(result.report, false)),
    );
    if (!first.mocked && reportMeetsBriefCounts(first.report)) return first;

    const richerDraft = !first.mocked
      ? pickRicherReport(result.report, first.report)
      : result.report;

    const second = await parseResponseOrFallback(
      await fetchWithRetry(buildExpandCountsPayload(richerDraft, true)),
    );
    if (!second.mocked && reportMeetsBriefCounts(second.report)) return second;

    const pool: GeminiResult[] = [result];
    if (!first.mocked) pool.push(first);
    if (!second.mocked) pool.push(second);
    let best = result;
    for (const c of pool) {
      if (reportMeetsBriefCounts(c.report)) return c;
      if (pickRicherReport(best.report, c.report) === c.report) best = c;
    }
    return best;
  }

  const existing = inFlightByUser.get(userId);
  if (existing) return existing;

  const work = (async (): Promise<GeminiResult> => {
    // First attempt (normal). If it gets truncated/non-JSON, retry once compact.
    const first = await parseResponseOrFallback(
      await fetchWithRetry(basePayload),
    );
    if (!first.mocked) {
      const finalized = await ensureReportCountsIfNeeded(first);
      lastGoodByUser.set(userId, { atMs: Date.now(), result: finalized });
      return finalized;
    }
    if (first.mockedCode !== "TRUNCATED" && first.mockedCode !== "NON_JSON") {
      return first;
    }

    const second = await parseResponseOrFallback(
      await fetchWithRetry(compactPayload),
    );
    if (!second.mocked) {
      const finalized = await ensureReportCountsIfNeeded(second);
      lastGoodByUser.set(userId, { atMs: Date.now(), result: finalized });
      return finalized;
    }

    // If we hit MAX_TOKENS, do one small "JSON repair" pass using the partial output.
    const repairCandidate =
      (second.mockedCode === "TRUNCATED" && second.geminiTextSnippet) ||
      (first.mockedCode === "TRUNCATED" && first.geminiTextSnippet) ||
      undefined;

    if (repairCandidate) {
      const repaired = await parseResponseOrFallback(
        await fetchWithRetry(buildRepairPayload(repairCandidate)),
      );
      if (!repaired.mocked) {
        const finalized = await ensureReportCountsIfNeeded(repaired);
        lastGoodByUser.set(userId, { atMs: Date.now(), result: finalized });
        return finalized;
      }
    }

    return first;
  })();

  inFlightByUser.set(userId, work);
  try {
    return await work;
  } finally {
    inFlightByUser.delete(userId);
  }
}

async function analyzeWithUsagePolicy(userId: string, input: SupplierInput): Promise<{
  report: RiskReport;
  mocked: boolean;
  mockedCode?: MockedCode;
  mockedReason?: string;
  geminiFinishReason?: string;
  geminiSafetyRatings?: unknown;
  geminiTextSnippet?: string;
  shouldCountUsage: boolean;
  shouldPersistReport: boolean;
}> {
  const result = await callGemini(userId, input);
  const freshAi = !result.mocked;
  return {
    report: result.report,
    mocked: result.mocked,
    mockedCode: result.mockedCode,
    mockedReason: result.mockedReason,
    geminiFinishReason: result.geminiFinishReason,
    geminiSafetyRatings: result.geminiSafetyRatings,
    geminiTextSnippet: result.geminiTextSnippet,
    // Only completed Gemini JSON counts toward monthly limits (not quota errors or demo).
    shouldCountUsage: freshAi,
    shouldPersistReport: freshAi,
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
      shouldPersistReport,
    } = await analyzeWithUsagePolicy(user.id, input);

    // No demo/fallback report when Gemini is unavailable — client shows an error instead.
    if (mocked && mockedCode !== "CACHED") {
      return NextResponse.json(
        {
          error:
            mockedReason ??
            "AI analysis is temporarily unavailable. Please try again in a few minutes.",
          code: mockedCode ?? "GEMINI_UNAVAILABLE",
          mockedReason,
          geminiFinishReason,
          geminiSafetyRatings,
          geminiTextSnippet,
        },
        { status: 503 },
      );
    }

    if (shouldCountUsage) {
      await supabase
        .from("profiles")
        .update({ checks_this_month: checksThisMonth + 1 })
        .eq("user_id", user.id);
    }

    if (shouldPersistReport) {
      await supabase.from("supplier_reports").insert({
        user_id: user.id,
        company_name: input.companyName,
        country: input.countryRegion,
        platform: input.platformFoundOn ?? null,
        category: input.productCategory,
        risk_score: report.riskScore,
        risk_level: report.riskLevel,
        summary: report.summary,
        flags: report.flags,
        recommendations: report.recommendations,
        verdict_class: report.verdict.class,
        verdict_headline: report.verdict.headline,
        verdict_detail: report.verdict.detail,
      });
    }

    return NextResponse.json(
      {
        report,
        mocked,
        mockedCode,
        mockedReason,
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

