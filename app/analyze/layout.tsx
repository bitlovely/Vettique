import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "./Topbar";
import SiteFooter from "../components/SiteFooter";

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
      <SiteFooter />
    </div>
  );
}

