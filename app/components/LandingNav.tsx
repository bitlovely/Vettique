"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

function MenuIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={props.className}
    >
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function XIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={props.className}
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ButtonLink(props: {
  href: string;
  children: React.ReactNode;
  variant: "brand" | "ghost";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background";
  const styles =
    props.variant === "brand"
      ? "gradient-brand text-brand-foreground hover:opacity-90"
      : "text-foreground hover:bg-muted/50";
  const size = "h-9 px-3";
  return (
    <Link href={props.href} className={`${base} ${styles} ${size} ${props.className ?? ""}`}>
      {props.children}
    </Link>
  );
}

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserEmail(null);
    router.refresh();
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="h-7 w-7 text-brand" />
          <span className="text-xl font-bold text-foreground tracking-tight">
            Vettique
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <a
            href="#features"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </a>
          {userEmail ? (
            <>
              <ButtonLink href="/analyze" variant="brand">
                Dashboard
              </ButtonLink>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center justify-center rounded-md text-sm font-semibold h-9 px-3 text-foreground hover:bg-muted/50 transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <ButtonLink href="/auth" variant="ghost">
                Log in
              </ButtonLink>
              <ButtonLink href="/auth?tab=signup" variant="brand">
                Start Free
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden text-foreground"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {open ? (
        <div className="md:hidden bg-card border-b border-border px-4 pb-4 space-y-2">
          <a
            href="#features"
            className="block py-2 text-sm text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            Features
          </a>
          <a
            href="#pricing"
            className="block py-2 text-sm text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            Pricing
          </a>
          {userEmail ? (
            <>
              <ButtonLink
                href="/analyze"
                variant="brand"
                className="w-full h-10"
              >
                Dashboard
              </ButtonLink>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setOpen(false);
                }}
                className="inline-flex items-center justify-center rounded-md text-sm font-semibold h-10 w-full text-foreground hover:bg-muted/50 transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <ButtonLink
                href="/auth"
                variant="ghost"
                className="w-full h-10"
              >
                Log in
              </ButtonLink>
              <ButtonLink
                href="/auth?tab=signup"
                variant="brand"
                className="w-full h-10"
              >
                Start Free
              </ButtonLink>
            </>
          )}
        </div>
      ) : null}
    </nav>
  );
}

