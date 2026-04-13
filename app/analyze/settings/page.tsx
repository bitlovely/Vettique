export default function AnalyzeSettingsPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">Profile settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Basic settings will live here (name, password reset, plan management).
          </p>

          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
            <p className="text-sm text-muted-foreground">
              Coming next: update password, change email, and manage subscription.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

