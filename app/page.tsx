import Link from "next/link";
import { LandingNav } from "./components/LandingNav";
import PricingCTA from "./components/PricingCTA";
import SiteFooter from "./components/SiteFooter";

function SparkleIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={props.className}
    >
      <path
        d="M12 2l1.3 5.2L18 9l-4.7 1.8L12 16l-1.3-5.2L6 9l4.7-1.8L12 2z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function ArrowRightIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={props.className}
    >
      <path
        d="M5 12h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={props.className}
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeatureIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={props.className}
    >
      <path
        d="M12 2.5l8.5 4.9v9.8L12 22.1l-8.5-4.9V7.4L12 2.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        opacity="0.9"
      />
      <path
        d="M9.2 12.4l2 2 3.8-4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const features = [
  {
    title: "AI Risk Analysis",
    description:
      "Gemini-powered intelligence evaluates supplier legitimacy across 6 key dimensions.",
  },
  {
    title: "Red / Amber / Green Flags",
    description:
      "Clear visual flags for payment terms, location risk, platform history, and more.",
  },
  {
    title: "0–100 Risk Score",
    description: "A single composite score so you know exactly where a supplier stands.",
  },
  {
    title: "Global Coverage",
    description: "Assess suppliers from any country, across Amazon, Alibaba, 1688, and more.",
  },
  {
    title: "Wire Decision Verdict",
    description:
      "Proceed / Caution / Do Not Wire — actionable guidance, not vague analysis.",
  },
  {
    title: "Saved Reports",
    description: "Every analysis is stored in your account for reference and comparison.",
  },
] as const;

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying Vettique before committing.",
    features: [
      "3 supplier checks per month",
      "Full AI risk reports",
      "6-dimension flag analysis",
      "Email support",
    ],
    cta: "Start Free",
    popular: false,
    variant: "outline",
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For active sellers who source regularly.",
    features: [
      "Unlimited supplier checks",
      "Full AI risk reports",
      "6-dimension flag analysis",
      "Saved report history",
      "Priority support",
      "Export reports (coming soon)",
    ],
    cta: "Go Pro",
    popular: true,
    variant: "brand",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen">
      <LandingNav />

      <section className="relative gradient-hero overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 mb-6">
              <SparkleIcon className="h-4 w-4 text-brand-glow" />
              <span className="text-sm font-medium text-brand-glow">
                AI-Powered Supplier Intelligence
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-[1.1] mb-6">
              Vet Your Suppliers
              <br />
              <span className="text-brand-glow">Before You Wire.</span>
            </h1>

            <p className="text-lg sm:text-xl text-primary-foreground/70 mb-10 max-w-2xl mx-auto leading-relaxed">
              Enter supplier details. Get an instant AI risk report with a 0–100 score,
              red/amber/green flags, and a clear verdict — Proceed, Caution, or Do Not
              Wire.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth?tab=signup"
                className="inline-flex items-center justify-center rounded-md font-semibold h-13 px-8 text-brand-foreground gradient-brand hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              >
                Start Free — 3 Checks/Month
                <ArrowRightIcon className="h-5 w-5 ml-1" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-md font-semibold h-13 px-8 border border-primary-foreground/20 text-primary-foreground bg-transparent hover:bg-primary-foreground/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              >
                See How It Works
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 lg:py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Vet Safely
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Six dimensions of AI analysis. One clear answer.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f) => (
              <div
                key={f.title}
                className="gradient-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow"
              >
                <div className="h-11 w-11 rounded-lg gradient-brand flex items-center justify-center mb-4">
                  <FeatureIcon className="h-5 w-5 text-brand-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 lg:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Start free. Upgrade when you need unlimited checks.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl border p-8 bg-card ${
                  p.popular
                    ? "border-brand shadow-xl shadow-brand/10"
                    : "border-border"
                }`}
              >
                {p.popular ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-brand text-xs font-semibold text-brand-foreground">
                    Most Popular
                  </div>
                ) : null}

                <h3 className="text-xl font-bold text-foreground mb-1">{p.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{p.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-foreground">
                    {p.price}
                  </span>
                  <span className="text-muted-foreground ml-1">{p.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-foreground">
                      <CheckIcon className="h-4 w-4 text-risk-green mt-0.5 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <PricingCTA planName={p.name as "Free" | "Pro"} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
