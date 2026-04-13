import { Suspense } from "react";
import AuthForm from "./AuthForm";

export default function AuthPage() {
  // `useSearchParams` requires a Suspense boundary in App Router.
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AuthForm />
    </Suspense>
  );
}

