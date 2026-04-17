"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

function isStrongEnough(pw: string) {
  return pw.length >= 8;
}

export default function ResetPasswordClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const code = sp.get("code");
  const accessToken = sp.get("access_token");
  const refreshToken = sp.get("refresh_token");
  const type = sp.get("type");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const passwordOk = useMemo(() => isStrongEnough(password), [password]);
  const match = password && confirm && password === confirm;

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      try {
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) setError(exErr.message);
          return;
        }

        if (accessToken && refreshToken && type === "recovery") {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setErr) setError(setErr.message);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to validate reset link.");
      }
    })();
  }, [code, accessToken, refreshToken, type]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!passwordOk) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!match) {
      setError("Passwords do not match.");
      return;
    }

    const supabase = createClient();
    startTransition(async () => {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) {
        setError(updErr.message);
        return;
      }

      setNotice("Password updated. Redirecting…");
      router.push("/analyze");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <span className="text-xl font-bold tracking-tight text-foreground">
                Vettique
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Choose a new password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set a new password for your account.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="pw">
                  New password
                </label>
                <input
                  id="pw"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  placeholder="••••••••"
                />
                <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="pw2">
                  Confirm password
                </label>
                <input
                  id="pw2"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                {pending ? "Updating…" : "Update password"}
              </button>
            </form>

            <div className="mt-6 text-sm text-muted-foreground">
              <Link href="/auth?tab=login" className="text-brand font-medium hover:underline">
                Back to log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

