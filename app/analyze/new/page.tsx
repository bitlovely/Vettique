import NewSupplierCheckForm from "./NewSupplierCheckForm";

export default async function NewAnalyzePage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-border bg-gradient-to-br from-muted/30 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  <a href="/analyze" className="hover:underline">
                    Dashboard
                  </a>{" "}
                  <span aria-hidden="true">/</span>{" "}
                  <span className="text-foreground">New check</span>
                </p>
                <h1 className="text-2xl font-bold text-foreground mt-2">
                  New supplier check
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter supplier details. We’ll generate a structured risk report.
                </p>
              </div>

              <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3 sm:items-center">
                <a
                  href="/analyze"
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-md font-semibold h-10 px-4 border border-border/70 bg-background/60 dark:bg-background/35 text-foreground hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors shadow-sm hover:shadow-md active:translate-y-px motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Back to dashboard
                </a>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <NewSupplierCheckForm />
          </div>
        </div>
      </div>
    </div>
  );
}

