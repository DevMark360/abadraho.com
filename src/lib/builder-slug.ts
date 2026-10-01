import { builderPublicPath } from "@/config/builder-pages";
import { slugify } from "@/lib/slugify";

export type BuilderSlugEntry = {
  id: number;
  fullName: string;
  slug: string;
};

export function buildUniqueBuilderSlugs(
  builders: { id: number; fullName: string }[]
): BuilderSlugEntry[] {
  const used = new Set<string>();
  return builders.map((builder) => {
    const base = slugify(builder.fullName) || `builder-${builder.id}`;
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(slug);
    return { id: builder.id, fullName: builder.fullName, slug };
  });
}

export function builderPagePathForName(
  fullName: string,
  id: number,
  allBuilders: { id: number; fullName: string }[]
): string {
  const slug =
    buildUniqueBuilderSlugs(allBuilders).find((entry) => entry.id === id)?.slug ??
    (slugify(fullName) || `builder-${id}`);
  return builderPublicPath(slug);
}
