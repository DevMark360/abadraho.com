import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { CsrfBootstrap } from "@/components/csrf-bootstrap";
import { AgentAttributionRoot } from "@/components/project-detail/agent-attribution-root";
import { JsonLd } from "@/components/seo/json-ld";
import { buildSiteSchemaGraph } from "@/lib/schema-markup";
import { rootMetadata } from "@/lib/seo";
import "./globals.css";
import "@/styles/mobile.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  fallback: ["system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

export const metadata: Metadata = rootMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-PK" dir="ltr" className={`${inter.variable} ${inter.className}`}>
      <body className="overflow-hidden bg-white font-sans antialiased">
        <JsonLd data={buildSiteSchemaGraph()} />
        <CsrfBootstrap />
        <AgentAttributionRoot />
        {children}
      </body>
    </html>
  );
}
