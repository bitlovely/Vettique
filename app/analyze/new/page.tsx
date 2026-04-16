import NewSupplierCheckForm from "./NewSupplierCheckForm";

export default async function NewAnalyzePage() {
  return (
    <div className="h-full w-full px-4 sm:px-6 lg:px-10 py-6">
      <div className="h-full w-full">
        <div className="vettique-fade-up rounded-3xl border border-primary-foreground/10 bg-card/90 backdrop-blur-xl shadow-[0_28px_110px_-44px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="p-6 lg:p-7 border-b border-border/60 bg-gradient-to-br from-muted/40 to-transparent">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  <a href="/analyze" className="hover:underline">
                    Dashboard
                  </a>{" "}
                  <span aria-hidden="true">/</span>{" "}
                  <span className="text-foreground">New check</span>
                </p>
                <h1 className="text-2xl lg:text-[30px] font-bold text-foreground mt-2 leading-tight">
                  New supplier check
                </h1>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Enter supplier details. We’ll generate a structured risk report.
                </p>
              </div>

              <div className="flex w-full lg:w-auto flex-col sm:flex-row gap-3 sm:items-center">
                <a
                  href="/analyze"
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl font-semibold h-11 px-6 border border-border bg-background hover:bg-muted/30 transition-colors shadow-sm hover:shadow-md active:translate-y-px motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  Back to dashboard
                </a>
              </div>
            </div>
          </div>

          <div className="p-7 lg:p-8">
            <div className="rounded-2xl border border-primary-foreground/10 bg-background/90 shadow-sm">
              <div className="px-6 py-5 border-b border-primary-foreground/10 bg-muted/10">
                <h2 className="text-sm font-semibold text-foreground">
                  Supplier details
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Fill in what you know. Missing info increases risk.
                </p>
              </div>
              <div className="p-6">
                <NewSupplierCheckForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

