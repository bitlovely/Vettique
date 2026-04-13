"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Tab = "login" | "signup";

function LogoMark(props: { className?: string }) {
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
        d="M7.5 12l3.2 3.2L16.8 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
        props.active ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {props.children}
    </button>
  );
}

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = useMemo<Tab>(() => {
    const t = searchParams.get("tab");
    return t === "signup" ? "signup" : "login";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submitLabel = tab === "signup" ? "Create account" : "Log in";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const supabase = createClient();

    startTransition(async () => {
      const { data, error: authError } =
        tab === "signup"
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (tab === "signup" && !data.session) {
        setNotice("Sign up successful — please confirm your email. Check your inbox to continue.");
        return;
      }

      router.push("/analyze");
      router.refresh();
    });
  }

  function setTab(next: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.push(`/auth?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <LogoMark className="h-8 w-8 text-brand" />
              <span className="text-xl font-bold tracking-tight text-foreground">
                Vettique
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">
              {tab === "signup" ? "Start vetting smarter" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tab === "signup"
                ? "Create an account to save reports and track your checks."
                : "Log in to continue your supplier checks."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-1 mb-6">
              <TabButton active={tab === "login"} onClick={() => setTab("login")}>
                Log in
              </TabButton>
              <TabButton active={tab === "signup"} onClick={() => setTab("signup")}>
                Sign up
              </TabButton>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  placeholder="you@company.com"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={tab === "signup" ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  placeholder="••••••••"
                />
              </div>

              {error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              {notice ? (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                  {notice}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center justify-center rounded-md font-semibold w-full h-12 gradient-brand text-brand-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {pending ? "Working…" : submitLabel}
              </button>
            </form>

            <p className="text-xs text-muted-foreground mt-6">
              By continuing, you agree to basic account usage for storing supplier reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

