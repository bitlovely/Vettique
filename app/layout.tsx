import type { Metadata } from "next";
import { AppToaster } from "@/components/AppToaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vettique — AI Supplier Vetting for Amazon & Shopify Sellers",
  description:
    "Vet your suppliers before you wire. Get instant AI risk reports with a 0-100 score, red/amber/green flags, and clear verdicts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
