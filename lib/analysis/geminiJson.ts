/**
 * Normalize Gemini / model text into parseable JSON (handles markdown fences,
 * preamble, smart quotes, trailing commas, and balanced-object extraction).
 */

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, "");
}

/** Remove common ```json ... ``` wrappers (including multiple fences). */
export function stripMarkdownCodeFences(s: string): string {
  let t = stripBom(s).trim();
  const fullFence =
    /^```(?:json|JSON)?\s*\r?\n?([\s\S]*?)\r?\n?```\s*$/m.exec(t);
  if (fullFence) t = fullFence[1].trim();

  t = t.replace(/^```(?:json|JSON)?\s*\r?\n?/m, "");
  t = t.replace(/\r?\n?```\s*$/m, "");
  t = t.trim();

  const brace = t.indexOf("{");
  if (brace > 0) {
    const noise = t.slice(0, brace).trim();
    if (
      /^(?:here|the|below|following|ok|sure|output|this\s+is|below\s+is)/i.test(
        noise,
      )
    ) {
      t = t.slice(brace);
    }
  }

  return t.trim();
}

function normalizeQuotes(s: string): string {
  return s
    .replace(/\u201c|\u201d/g, "\"")
    .replace(/\u2018|\u2019/g, "'");
}

export function stripTrailingCommas(s: string): string {
  let prev = "";
  let cur = s;
  while (cur !== prev) {
    prev = cur;
    cur = cur.replace(/,(\s*[}\]])/g, "$1");
  }
  return cur;
}

/**
 * Extract the outermost JSON object by brace counting, respecting strings.
 */
export function extractBalancedJsonObject(source: string): string | null {
  const start = source.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") escaped = true;
      else if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

export type ParseModelJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export function parseModelJson(rawText: string): ParseModelJsonResult {
  if (typeof rawText !== "string" || !rawText.trim()) {
    return { ok: false, error: "empty" };
  }

  const bases = new Set<string>();
  const add = (s: string | null | undefined) => {
    if (!s) return;
    const t = s.trim();
    if (t) bases.add(t);
  };

  const rawTrim = stripBom(rawText).trim();
  add(rawTrim);
  add(stripMarkdownCodeFences(rawText));
  add(extractBalancedJsonObject(rawTrim));
  const fenced = stripMarkdownCodeFences(rawText);
  add(fenced);
  add(extractBalancedJsonObject(fenced));

  for (const base of bases) {
    const variants = [
      base,
      normalizeQuotes(base),
      stripTrailingCommas(base),
      stripTrailingCommas(normalizeQuotes(base)),
    ];
    for (const v of variants) {
      try {
        return { ok: true, value: JSON.parse(v) };
      } catch {
        // try next variant
      }
    }
  }

  return { ok: false, error: "parse_failed" };
}
