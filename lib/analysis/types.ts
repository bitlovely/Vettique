export type RiskFlagSeverity = "red" | "amber" | "green";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type VerdictClass = "proceed" | "caution" | "avoid";

export type RiskFlag = {
  severity: RiskFlagSeverity;
  title: string;
  detail: string;
};

export type SupplierInput = {
  companyName: string;
  countryRegion: string;
  platformFoundOn?: string;
  yearsOnPlatform?: string;
  productCategory: string;
  orderSizeUnits?: string;
  quoteReceived?: string;
  observations?: string;
  checksToRun: {
    legitimacy: boolean;
    paymentTerms: boolean;
    locationRisk: boolean;
    platformSignals: boolean;
    productCategoryRisk: boolean;
    operationalSignals: boolean;
  };
};

export type RiskReport = {
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  summary: string;
  flags: RiskFlag[];
  recommendations: string[];
  verdict: {
    class: VerdictClass;
    headline: string;
    detail: string;
  };
};

