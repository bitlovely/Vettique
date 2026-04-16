import Link from "next/link";

function MarkIcon(props: { className?: string }) {
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
        d="M9.2 12.4l2 2 3.8-4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SiteFooter(props: { variant?: "primary" | "app" }) {
  const year = new Date().getFullYear();
  const variant = props.variant ?? "primary";

  if (variant === "primary") {
    return (
      <footer className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center text-brand-glow">
                <MarkIcon className="h-6 w-6" />
              </span>
              <span className="text-lg font-bold text-primary-foreground">
                Vettique
              </span>
            </div>
            <div className="flex gap-6 text-sm text-primary-foreground/60">
              <a
                href="/#features"
                className="hover:text-primary-foreground transition-colors"
              >
                Features
              </a>
              <a
                href="/#pricing"
                className="hover:text-primary-foreground transition-colors"
              >
                Pricing
              </a>
              <Link
                href="/auth"
                className="hover:text-primary-foreground transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/privacy-policy"
                className="hover:text-primary-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms-of-service"
                className="hover:text-primary-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <a
                href="mailto:hello@vettique.com"
                className="hover:text-primary-foreground transition-colors"
              >
                hello@vettique.com
              </a>
            </div>
            <p className="text-sm text-primary-foreground/40">
              © {year} Vettique. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  if (variant === "app") {
    return (
      <footer className="border-t border-border bg-card/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center text-brand">
                <MarkIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold text-foreground">Vettique</span>
            </div>
            <div className="flex gap-5 text-sm text-muted-foreground">
              <a className="hover:text-foreground transition-colors" href="/#features">
                Features
              </a>
              <a className="hover:text-foreground transition-colors" href="/#pricing">
                Pricing
              </a>
              <Link
                href="/privacy-policy"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms-of-service"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <a
                href="mailto:hello@vettique.com"
                className="hover:text-foreground transition-colors"
              >
                hello@vettique.com
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              © {year} Vettique. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return null;
}

