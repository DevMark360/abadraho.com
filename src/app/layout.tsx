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
  const siteSchema = buildSiteSchemaGraph();
  const organization = siteSchema.find((node) => node["@type"] === "Organization");

  return (
    <html lang="en-PK" dir="ltr" className={`${inter.variable} ${inter.className}`}>
      <head>
        {/* Agent discovery (WebMCP): read-only tools manifest; meta tags come from rootMetadata. */}
        <link rel="mcp" type="application/json" href="/.well-known/mcp.json" />
      </head>
      <body className="overflow-hidden bg-white font-sans antialiased">
        {/* Organization in its own block: some AI/SEO checkers only read a standalone
            {"@type":"Organization"} and miss it inside @graph. Other nodes still reference it
            by @id, which works across JSON-LD blocks on the same page. */}
        {organization ? <JsonLd data={organization} /> : null}
        <JsonLd data={siteSchema.filter((node) => node !== organization)} />
        <CsrfBootstrap />
        <AgentAttributionRoot />
        {children}
      </body>
    </html>
  );
}
