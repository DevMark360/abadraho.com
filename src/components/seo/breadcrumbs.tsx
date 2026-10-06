import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbSchema } from "@/lib/schema-markup";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

/**
 * Visible breadcrumb trail plus its BreadcrumbList JSON-LD, built from the same list so the
 * two never drift. Server component (schema URLs need the server's runtime site URL).
 * The last crumb is the current page: pass `currentPath` so its schema item gets a URL.
 */
export function Breadcrumbs({
  crumbs,
  currentPath,
  className,
}: {
  crumbs: Crumb[];
  currentPath?: string;
  className?: string;
}) {
  if (!crumbs.length) return null;
  const schema = buildBreadcrumbSchema(
    crumbs.map((c, i) => ({
      name: c.label,
      path: c.href ?? (i === crumbs.length - 1 ? currentPath : undefined),
    }))
  );

  return (
    <>
      <JsonLd data={schema} />
      <nav aria-label="Breadcrumb" className={cn("text-sm text-zinc-500", className)}>
        <ol className="flex flex-wrap items-center gap-1">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={`${c.label}-${i}`} className="inline-flex min-w-0 items-center gap-1">
                {i > 0 ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" aria-hidden />
                ) : null}
                {c.href && !last ? (
                  <Link href={c.href as "/"} className="hover:text-zinc-900">
                    {c.label}
                  </Link>
                ) : (
                  <span
                    className="truncate font-medium text-zinc-900"
                    aria-current={last ? "page" : undefined}
                  >
                    {c.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
