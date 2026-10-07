import type { Metadata } from "next";
import { brandAssets, siteConfig } from "@/config/site";
import { businessConfig } from "@/config/business";

const SITE_LOCALE = "en_PK";

/**
 * Returns the canonical site URL.
 * Priority: APP_URL → AUTH_URL → NEXT_PUBLIC_APP_URL (build) → localhost fallback.
 * Set APP_URL or AUTH_URL in production .env so broker links work without a rebuild.
 */
export function getSiteUrl(): string {
  const url =
    process.env.APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://dev.abadraho.com";
  return url.replace(/\/$/, "");
}

export function isLocalSiteUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

/** Use live request origin when not localhost; otherwise env-based site URL. */
export function resolvePublicSiteUrl(origin?: string | null): string {
  const trimmed = origin?.trim().replace(/\/$/, "");
  if (trimmed && !isLocalSiteUrl(trimmed)) return trimmed;
  return getSiteUrl();
}

/** Absolute URL for canonical links, Open Graph images, and Twitter cards. */
export function absoluteUrl(path = ""): string {
  const base = getSiteUrl();
  if (!path) return base;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export interface PageSeoInput {
  title?: string;
  /**
   * Full <title> that skips the "%s | AbadRaho" template. Needed on the home page: a layout's
   * title template only applies to child segments, so the root page would otherwise get a bare title.
   */
  absoluteTitle?: string;
  description?: string;
  keywords?: string | string[];
  path?: string;
  image?: string | null;
  imageAlt?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}

function parseKeywords(keywords?: string | string[]): string[] | undefined {
  if (!keywords) return undefined;
  const list = Array.isArray(keywords)
    ? keywords
    : keywords.split(",").map((keyword) => keyword.trim());
  const filtered = list.filter(Boolean);
  return filtered.length ? filtered : undefined;
}

export function buildPageMetadata(input: PageSeoInput = {}): Metadata {
  const siteName = siteConfig.name;
  const defaultDescription = siteConfig.seoDescription;
  const absoluteTitle = input.absoluteTitle?.trim();
  const pageTitle = input.title?.trim();
  const description = input.description?.trim() || defaultDescription;
  const canonicalPath = input.path ?? "";
  const canonicalUrl = absoluteUrl(canonicalPath);
  const keywords = parseKeywords(input.keywords);

  const imagePath = input.image?.trim() || siteConfig.defaultOgImage;
  const imageUrl = imagePath ? absoluteUrl(imagePath) : undefined;
  const imageAlt = input.imageAlt?.trim() || `${siteName}: off-plan properties`;
  const socialTitle =
    absoluteTitle || (pageTitle ? `${pageTitle} | ${siteName}` : siteConfig.defaultTitle);

  return {
    ...(absoluteTitle
      ? { title: { absolute: absoluteTitle } }
      : pageTitle
        ? { title: pageTitle }
        : {}),
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: canonicalUrl,
        "en-PK": canonicalUrl,
      },
    },
    openGraph: {
      type: input.type ?? "website",
      locale: SITE_LOCALE,
      alternateLocale: ["en_US"],
      url: canonicalUrl,
      siteName,
      title: socialTitle,
      description,
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                alt: imageAlt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    robots: input.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteConfig.defaultTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.seoDescription,
  keywords: [...siteConfig.defaultKeywords],
  applicationName: siteConfig.name,
  // <meta name="author"> + <link rel="author"> on every page (content is written by Mark Properties).
  authors: [{ name: businessConfig.legalName, url: absoluteUrl("/about-us") }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/assets/images/fav-icon.svg",
    shortcut: "/assets/images/fav-icon.svg",
    apple: "/assets/images/fav-icon.svg",
  },
  alternates: {
    canonical: absoluteUrl("/"),
    languages: {
      en: absoluteUrl("/"),
      "en-PK": absoluteUrl("/"),
    },
  },
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    alternateLocale: ["en_US"],
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    title: siteConfig.defaultTitle,
    description: siteConfig.seoDescription,
    images: [
      {
        url: absoluteUrl(siteConfig.defaultOgImage),
        alt: `${siteConfig.name} logo`,
        width: brandAssets.logoAspect ? Math.round(brandAssets.logoAspect * 154) : 524,
        height: 154,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.defaultTitle,
    description: siteConfig.seoDescription,
    images: [absoluteUrl(siteConfig.defaultOgImage)],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "rUK8s00Q50NHcuxhyjOJOQ4PYONmZySmuuyrK_Jd690",
  },
  // WebMCP / agent discovery: point AI agents at the read-only tool manifest. Relative path so
  // pre-rendered pages never bake in the build machine's domain. (<link rel="mcp"> is in layout.)
  other: {
    mcp: "/.well-known/mcp.json",
    webmcp: "/.well-known/mcp.json",
  },
};
