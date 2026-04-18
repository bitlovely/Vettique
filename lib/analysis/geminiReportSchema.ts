/**
 * Gemini controlled generation schema (JSON Schema style).
 * @see https://ai.google.dev/gemini-api/docs/structured-output
 */
export const GEMINI_REPORT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    riskScore: { type: "integer" },
    riskLevel: {
      type: "string",
      enum: ["LOW", "MEDIUM", "HIGH"],
    },
    summary: { type: "string" },
    flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: {
            type: "string",
            enum: ["red", "amber", "green"],
          },
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["severity", "title", "detail"],
      },
    },
    recommendations: {
      type: "array",
      items: { type: "string" },
    },
    verdict: {
      type: "object",
      properties: {
        class: {
          type: "string",
          enum: ["proceed", "caution", "avoid"],
        },
        headline: { type: "string" },
        detail: { type: "string" },
      },
      required: ["class", "headline", "detail"],
    },
  },
  required: ["riskScore", "riskLevel", "summary", "flags", "recommendations", "verdict"],
} as const;
