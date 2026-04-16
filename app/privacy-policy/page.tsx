export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-3">
            Last updated: April 2026
          </p>
          <div className="mt-6 space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                1. What Vettique does
              </h2>
              <p>
                Vettique is a clean, functional web app called Vettique, an
                AI-powered supplier vetting tool for Amazon and Shopify sellers.
              </p>
              <p>
                Users enter supplier details such as company name, country,
                platform, product category, payment terms, and observations. The
                app sends this information to Google Gemini API, which returns a
                structured risk report with a 0-100 risk score, red / amber /
                green flags across 6 dimensions, and a clear verdict such as
                Proceed, Caution, or Do Not Wire.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                2. Information we collect
              </h2>
              <p>
                We may collect account information such as your email address,
                supplier details you submit for analysis, billing-related
                identifiers, and technical data needed to operate the service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                3. How we use your information
              </h2>
              <p>
                We use your information to provide risk reports, store your saved
                report history, manage subscriptions, improve product
                performance, and maintain service security.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                4. Third-party processors
              </h2>
              <p>
                Vettique uses third-party services including Google Gemini,
                Stripe, and Supabase. Information you submit may be processed by
                those providers only as needed to deliver the service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                5. Contact
              </h2>
              <p>
                For privacy questions, contact{" "}
                <a
                  className="text-brand hover:underline"
                  href="mailto:hello@vettique.com"
                >
                  hello@vettique.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
