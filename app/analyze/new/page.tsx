import NewSupplierCheckForm from "./NewSupplierCheckForm";

export default async function NewAnalyzePage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">New Supplier Check</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the supplier details below. Our AI will generate a full risk report.
          </p>

          <div className="mt-6">
            <NewSupplierCheckForm />
          </div>
        </div>
      </div>
    </div>
  );
}

