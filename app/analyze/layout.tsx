import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "./Topbar";

export default async function AnalyzeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Topbar email={user.email ?? null} />
      <main className="flex-1 pt-16">{children}</main>
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Vettique. All rights reserved.
          </p>
          <div className="flex gap-5 text-sm text-muted-foreground">
            <a className="hover:text-foreground transition-colors" href="/#features">
              Features
            </a>
            <a className="hover:text-foreground transition-colors" href="/#pricing">
              Pricing
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

