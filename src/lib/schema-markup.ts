import { brandAssets, siteConfig } from "@/config/site";
import { businessConfig } from "@/config/business";
import { absoluteUrl } from "@/lib/seo";

type JsonLdNode = Record<string, unknown>;

function pruneEmpty<T>(value: T): T {
  if (Array.isArray(value)) {
    const next = value.map((item) => pruneEmpty(item)).filter((item) => item != null);
    return next as T;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, pruneEmpty(item)] as const)
      .filter(([, item]) => item != null && item !== "");
    return Object.fromEntries(entries) as T;
  }
  return value;
}

function entityId(fragment: string): string {
  return `${absoluteUrl("/")}#${fragment}`;
}

function logoImageObject(): JsonLdNode {
  return {
    "@type": "ImageObject",
    url: absoluteUrl(brandAssets.logo),
  };
}

function postalAddress(
  input: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  } = businessConfig.address
): JsonLdNode | undefined {
  const address = pruneEmpty({
    "@type": "PostalAddress",
    streetAddress: input.streetAddress,
    addressLocality: input.addressLocality,
    addressRegion: input.addressRegion,
    postalCode: input.postalCode,
    addressCountry: input.addressCountry,
  });
  return Object.keys(address).length > 1 ? address : undefined;
}

export function buildSiteSchemaGraph(): JsonLdNode[] {
  const organizationId = entityId("organization");
  const websiteId = entityId("website");
  const businessId = entityId("local-business");

  const organization = pruneEmpty({
    "@type": "Organization",
    "@id": organizationId,
    name: businessConfig.brandName,
    alternateName: businessConfig.legalName,
    url: absoluteUrl("/"),
    logo: logoImageObject(),
    description: siteConfig.seoDescription,
    email: businessConfig.email,
    ...(businessConfig.phone ? { telephone: businessConfig.phone } : {}),
    sameAs: businessConfig.sameAs.length ? businessConfig.sameAs : undefined,
  });

  const website = pruneEmpty({
    "@type": "WebSite",
    "@id": websiteId,
    url: absoluteUrl("/"),
    name: businessConfig.brandName,
    description: siteConfig.seoDescription,
    publisher: { "@id": organizationId },
    inLanguage: "en-PK",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });

  const localBusiness = pruneEmpty({
    "@type": "RealEstateAgent",
    "@id": businessId,
    name: businessConfig.brandName,
    alternateName: businessConfig.legalName,
    url: absoluteUrl("/"),
    image: absoluteUrl(siteConfig.defaultOgImage),
    logo: logoImageObject(),
    description: siteConfig.seoDescription,
    email: businessConfig.email,
    ...(businessConfig.phone ? { telephone: businessConfig.phone } : {}),
    address: postalAddress(),
    ...(businessConfig.mapUrl ? { hasMap: businessConfig.mapUrl } : {}),
    ...(businessConfig.geo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: businessConfig.geo.latitude,
            longitude: businessConfig.geo.longitude,
          },
        }
      : {}),
    areaServed: businessConfig.areaServed.map((name) => ({
      "@type": "AdministrativeArea",
      name,
    })),
    parentOrganization: { "@id": organizationId },
    sameAs: businessConfig.sameAs.length ? businessConfig.sameAs : undefined,
  });

  return [organization, website, localBusiness];
}

export function buildWebPageSchema(input: {
  name: string;
  description?: string;
  path: string;
  type?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
  /** Freshness signals: only pass real dates (content first published / last changed). */
  datePublished?: string | Date | null;
  dateModified?: string | Date | null;
}): JsonLdNode {
  const pageUrl = absoluteUrl(input.path);
  return pruneEmpty({
    "@type": input.type ?? "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: input.name,
    description: input.description ?? siteConfig.seoDescription,
    datePublished: toIsoDate(input.datePublished ?? input.dateModified),
    dateModified: toIsoDate(input.dateModified ?? input.datePublished),
    isPartOf: { "@id": entityId("website") },
    about: { "@id": entityId("local-business") },
    inLanguage: "en-PK",
  });
}

export function buildBreadcrumbSchema(
  items: Array<{ name: string; path?: string }>
): JsonLdNode {
  const last = items[items.length - 1];
  return pruneEmpty({
    "@type": "BreadcrumbList",
    // Only when the current page URL is known (otherwise it would clash with the home page id).
    ...(last?.path ? { "@id": `${absoluteUrl(last.path)}#breadcrumb` } : {}),
    itemListElement: items.map((item, index) =>
      pruneEmpty({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        ...(item.path ? { item: absoluteUrl(item.path) } : {}),
      })
    ),
  });
}

export function buildArticleSchema(input: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  datePublished?: string | Date | null;
  dateModified?: string | Date | null;
  category?: string | null;
  wordCount?: number;
}): JsonLdNode[] {
  const pageUrl = absoluteUrl(input.path);
  const published = toIsoDate(input.datePublished ?? input.dateModified);
  const modified = toIsoDate(input.dateModified ?? input.datePublished);
  const images = input.image ? [absoluteUrl(input.image)] : [absoluteUrl(siteConfig.defaultOgImage)];

  // BlogPosting (a more specific Article) is what AI/SEO checkers look for on blog pages.
  const article = pruneEmpty({
    "@type": "BlogPosting",
    "@id": `${pageUrl}#article`,
    headline: input.title,
    description: input.description,
    url: pageUrl,
    mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
    image: images,
    datePublished: published,
    dateModified: modified,
    author: {
      "@type": "Organization",
      "@id": entityId("organization"),
      name: businessConfig.brandName,
    },
    publisher: {
      "@type": "Organization",
      "@id": entityId("organization"),
      name: businessConfig.brandName,
      logo: logoImageObject(),
    },
    inLanguage: "en-PK",
    ...(input.category ? { articleSection: input.category } : {}),
    ...(input.wordCount ? { wordCount: input.wordCount } : {}),
    isPartOf: { "@id": entityId("website") },
  });

  const webpage = buildWebPageSchema({
    name: input.title,
    description: input.description,
    path: input.path,
    type: "WebPage",
  });

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: input.title, path: input.path },
  ]);

  return [webpage, article, breadcrumb];
}

export type BlogSchemaPost = {
  title: string;
  path: string;
  image?: string | null;
  datePublished?: string | Date | null;
  description?: string | null;
};

/**
 * Blog node listing posts as BlogPosting. Used on /blog and on the home page "Buyer guides"
 * section, so editorial content is identifiable wherever the posts are shown.
 */
export function buildBlogSchema(posts: BlogSchemaPost[]): JsonLdNode {
  const blogUrl = absoluteUrl("/blog");
  return pruneEmpty({
    "@type": "Blog",
    "@id": `${blogUrl}#blog`,
    name: `${businessConfig.brandName} Blog`,
    description:
      "Guides, market updates, and investment tips for off-plan property buyers in Pakistan.",
    url: blogUrl,
    inLanguage: "en-PK",
    publisher: { "@id": entityId("organization") },
    blogPost: posts.map((post) =>
      pruneEmpty({
        "@type": "BlogPosting",
        "@id": `${absoluteUrl(post.path)}#article`,
        headline: post.title,
        url: absoluteUrl(post.path),
        description: post.description?.trim() || undefined,
        image: post.image ? absoluteUrl(post.image) : undefined,
        datePublished: toIsoDate(post.datePublished),
        author: { "@id": entityId("organization") },
      })
    ),
  });
}

export function buildBlogListSchema(posts: BlogSchemaPost[]): JsonLdNode[] {
  const collection = buildWebPageSchema({
    name: "AbadRaho Blog",
    description:
      "Guides, market updates, and investment tips for off-plan property buyers in Pakistan.",
    path: "/blog",
    type: "CollectionPage",
  });

  const itemList = pruneEmpty({
    "@type": "ItemList",
    "@id": `${absoluteUrl("/blog")}#itemlist`,
    name: "Latest blog posts",
    numberOfItems: posts.length,
    itemListElement: posts.map((post, index) =>
      pruneEmpty({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(post.path),
        name: post.title,
        ...(post.image ? { image: absoluteUrl(post.image) } : {}),
      })
    ),
  });

  // BreadcrumbList comes from the page header crumbs (<Breadcrumbs>).
  return [collection, buildBlogSchema(posts), itemList];
}

export function buildRealEstateListingSchema(project: {
  name: string;
  slug: string;
  description: string;
  imageUrl?: string | null;
  galleryImages?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  address?: string | null;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  builderName?: string | null;
  builderNames?: string[];
  projectTypeName?: string | null;
  ratingAverage?: number;
  ratingCount?: number;
}): JsonLdNode[] {
  const pageUrl = absoluteUrl(`/project/${project.slug}`);
  const images = [
    ...(project.galleryImages ?? []),
    project.imageUrl,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => absoluteUrl(value));
  const uniqueImages = [...new Set(images)];
  const builder =
    project.builderNames?.filter(Boolean).join(", ") ||
    project.builderName?.trim() ||
    undefined;

  const listing = pruneEmpty({
    "@type": "RealEstateListing",
    "@id": `${pageUrl}#listing`,
    name: project.name,
    description: project.description,
    url: pageUrl,
    mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
    image: uniqueImages.length ? uniqueImages : [absoluteUrl(siteConfig.defaultOgImage)],
    inLanguage: "en-PK",
    ...(builder
      ? {
          seller: {
            "@type": "Organization",
            name: builder,
          },
        }
      : {}),
    ...(project.projectTypeName ? { category: project.projectTypeName } : {}),
    address: postalAddress({
      streetAddress: project.address ?? undefined,
      addressLocality: project.area ?? businessConfig.address.addressLocality,
      addressRegion: businessConfig.address.addressRegion,
      addressCountry: businessConfig.address.addressCountry,
    }),
    ...(project.latitude != null && project.longitude != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: project.latitude,
            longitude: project.longitude,
          },
        }
      : {}),
    ...(project.minPrice != null
      ? {
          offers: pruneEmpty(
            project.maxPrice != null && project.maxPrice !== project.minPrice
              ? {
                  "@type": "AggregateOffer",
                  lowPrice: project.minPrice,
                  highPrice: project.maxPrice,
                  priceCurrency: "PKR",
                  offerCount: 1,
                  availability: "https://schema.org/PreOrder",
                  url: pageUrl,
                  seller: { "@id": entityId("local-business") },
                }
              : {
                  "@type": "Offer",
                  price: project.minPrice,
                  priceCurrency: "PKR",
                  availability: "https://schema.org/PreOrder",
                  url: pageUrl,
                  seller: { "@id": entityId("local-business") },
                }
          ),
        }
      : {}),
    ...(project.ratingCount && project.ratingCount > 0
      ? {
          aggregateRating: pruneEmpty({
            "@type": "AggregateRating",
            ratingValue: Number(project.ratingAverage?.toFixed(1)),
            reviewCount: project.ratingCount,
            bestRating: 5,
            worstRating: 1,
          }),
        }
      : {}),
  });

  const webpage = buildWebPageSchema({
    name: project.name,
    description: project.description,
    path: `/project/${project.slug}`,
  });

  // BreadcrumbList comes from the visible <Breadcrumbs> on the project page.
  return [webpage, listing];
}

/**
 * Product schema — used alongside RealEstateListing for broader search engine compatibility.
 * Google's "Product" rich result surfaces price, availability, and seller information.
 */
export function buildProductSchema(project: {
  name: string;
  slug: string;
  description: string;
  imageUrl?: string | null;
  galleryImages?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  address?: string | null;
  area?: string | null;
  builderName?: string | null;
  builderNames?: string[];
  projectTypeName?: string | null;
  ratingAverage?: number;
  ratingCount?: number;
}): JsonLdNode {
  const pageUrl = absoluteUrl(`/project/${project.slug}`);
  const images = [
    ...(project.galleryImages ?? []),
    project.imageUrl,
  ]
    .filter((v): v is string => Boolean(v?.trim()))
    .map((v) => absoluteUrl(v));
  const uniqueImages = [...new Set(images)];
  const builder =
    project.builderNames?.filter(Boolean).join(", ") ||
    project.builderName?.trim() ||
    undefined;

  return pruneEmpty({
    "@type": "Product",
    "@id": `${pageUrl}#product`,
    name: project.name,
    description: project.description,
    url: pageUrl,
    image: uniqueImages.length ? uniqueImages : [absoluteUrl(siteConfig.defaultOgImage)],
    category: project.projectTypeName ?? "Real Estate",
    ...(builder
      ? { brand: { "@type": "Brand", name: builder } }
      : { brand: { "@type": "Brand", name: businessConfig.brandName } }),
    ...(project.minPrice != null
      ? {
          offers:
            project.maxPrice != null && project.maxPrice !== project.minPrice
              ? pruneEmpty({
                  "@type": "AggregateOffer",
                  lowPrice: project.minPrice,
                  highPrice: project.maxPrice,
                  priceCurrency: "PKR",
                  offerCount: 1,
                  availability: "https://schema.org/PreOrder",
                  url: pageUrl,
                  seller: {
                    "@type": "RealEstateAgent",
                    "@id": entityId("local-business"),
                    name: businessConfig.brandName,
                  },
                })
              : pruneEmpty({
                  "@type": "Offer",
                  price: project.minPrice,
                  priceCurrency: "PKR",
                  availability: "https://schema.org/PreOrder",
                  url: pageUrl,
                  seller: {
                    "@type": "RealEstateAgent",
                    "@id": entityId("local-business"),
                    name: businessConfig.brandName,
                  },
                }),
        }
      : {}),
    ...(project.ratingCount && project.ratingCount > 0
      ? {
          aggregateRating: pruneEmpty({
            "@type": "AggregateRating",
            ratingValue: Number(project.ratingAverage?.toFixed(1)),
            reviewCount: project.ratingCount,
            bestRating: 5,
            worstRating: 1,
          }),
        }
      : {}),
    address: postalAddress({
      streetAddress: project.address ?? undefined,
      addressLocality: project.area ?? businessConfig.address.addressLocality,
      addressRegion: businessConfig.address.addressRegion,
      addressCountry: businessConfig.address.addressCountry,
    }),
  });
}

export function buildAreaSchema(area: {
  name: string;
  slug: string;
  description: string;
  projectCount: number;
  cityName?: string;
}): JsonLdNode[] {
  const cityName = area.cityName ?? "Karachi";
  const pageUrl = absoluteUrl(`/area/${area.slug}`);

  const localBusiness = pruneEmpty({
    "@type": "RealEstateAgent",
    "@id": `${pageUrl}#local-business`,
    name: `${businessConfig.brandName}: ${area.name} Properties`,
    description: area.description,
    url: pageUrl,
    image: absoluteUrl(siteConfig.defaultOgImage),
    logo: logoImageObject(),
    email: businessConfig.email,
    ...(businessConfig.phone ? { telephone: businessConfig.phone } : {}),
    address: postalAddress({
      addressLocality: area.name,
      addressRegion: businessConfig.address.addressRegion,
      addressCountry: businessConfig.address.addressCountry,
    }),
    areaServed: [
      { "@type": "AdministrativeArea", name: area.name },
      { "@type": "AdministrativeArea", name: cityName },
      { "@type": "AdministrativeArea", name: "Pakistan" },
    ],
    parentOrganization: { "@id": entityId("organization") },
    sameAs: businessConfig.sameAs.length ? businessConfig.sameAs : undefined,
  });

  const webpage = buildWebPageSchema({
    name: `Off-plan Properties in ${area.name} | ${businessConfig.brandName}`,
    description: area.description,
    path: `/area/${area.slug}`,
    type: "CollectionPage",
  });

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects" },
    { name: area.name, path: `/area/${area.slug}` },
  ]);

  const itemList = pruneEmpty({
    "@type": "ItemList",
    "@id": `${pageUrl}#itemlist`,
    name: `Off-plan projects in ${area.name}`,
    numberOfItems: area.projectCount,
  });

  return [webpage, localBusiness, breadcrumb, itemList];
}

export function buildFaqSchema(
  items: Array<{ question: string; answer: string }>
): JsonLdNode {
  return {
    "@type": "FAQPage",
    mainEntity: items.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}

export function buildHowToSchema(input: {
  name: string;
  description: string;
  path: string;
  steps: Array<{ name: string; text: string; path?: string }>;
}): JsonLdNode {
  const pageUrl = absoluteUrl(input.path);
  return pruneEmpty({
    "@type": "HowTo",
    "@id": `${pageUrl}#howto`,
    name: input.name,
    description: input.description,
    inLanguage: "en-PK",
    step: input.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
      url: step.path ? absoluteUrl(step.path) : undefined,
    })),
  });
}

function toIsoDate(value?: string | Date | null): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}
