import { Suspense } from "react";
import ResetPasswordClient from "./reset-password-client";

function ResetPasswordFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="h-5 w-48 bg-muted/60 rounded mb-4" />
            <div className="h-10 w-full bg-muted/60 rounded mb-3" />
            <div className="h-10 w-full bg-muted/60 rounded mb-6" />
            <div className="h-12 w-full bg-muted/60 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordClient />
    </Suspense>
  );
}

