export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mt-3">
            Last updated: April 2026
          </p>
          <div className="mt-6 space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                1. Service Description
              </h2>
              <p>
                Vettique is a clean, functional web app called Vettique, an
                AI-powered supplier vetting tool for Amazon and Shopify sellers.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                2. How the Service Works
              </h2>
              <p>
                Users enter supplier details including company name, country,
                platform, product category, payment terms, and observations.
              </p>
              <p>
                Vettique sends this information to Google Gemini API, which
                returns a structured risk report with a 0-100 risk score, red /
                amber / green flags across 6 dimensions, and a clear verdict such
                as Proceed, Caution, or Do Not Wire.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                3. Contact
              </h2>
              <p>
                For questions about these terms, contact{" "}
                <a
                  className="text-brand hover:underline"
                  href="mailto:ziad@vettique.com"
                >
                  ziad@vettique.com
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
