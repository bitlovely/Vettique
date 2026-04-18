import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppToaster } from "@/components/AppToaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
