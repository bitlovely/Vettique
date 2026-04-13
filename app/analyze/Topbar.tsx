"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

function ChevronDownIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={props.className}>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Topbar(props: { email: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const initials = useMemo(() => {
    if (!props.email) return "U";
    const s = props.email.split("@")[0] ?? "user";
    return (s[0] ?? "U").toUpperCase();
  }, [props.email]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function onSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark className="h-7 w-7 text-brand" />
            <span className="text-xl font-bold text-foreground tracking-tight">
              Vettique
            </span>
          </Link>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full gradient-brand text-brand-foreground text-sm font-bold">
              {initials}
            </span>
            <span className="hidden sm:block max-w-[180px] truncate text-sm font-semibold text-foreground">
              {props.email ?? "Account"}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
          </button>

          {open ? (
            <>
              <button
                type="button"
                className="fixed inset-0 cursor-default"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              />
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-lg p-1 z-50"
              >
                <Link
                  role="menuitem"
                  href="/analyze/settings"
                  className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  Profile settings
                </Link>
                <div className="h-px bg-border my-1" />
                <button
                  role="menuitem"
                  type="button"
                  onClick={onSignOut}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

