import NewSupplierCheckForm from "./NewSupplierCheckForm";

export default async function NewAnalyzePage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-8 border-b border-border bg-muted/10">
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

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <a
                  href="/analyze"
                  className="inline-flex items-center justify-center rounded-md font-semibold h-10 px-4 border border-border bg-background text-foreground hover:bg-muted/40 transition-colors"
                >
                  Back to dashboard
                </a>
              </div>
            </div>
          </div>

          <div className="p-8">
            <NewSupplierCheckForm />
          </div>
        </div>
      </div>
    </div>
  );
}

