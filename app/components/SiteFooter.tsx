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

export default function SiteFooter(props: { variant?: "primary" }) {
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
            </div>
            <p className="text-sm text-primary-foreground/40">
              © {year} Vettique. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return null;
}

