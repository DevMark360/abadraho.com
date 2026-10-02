import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Mail,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { PublicPage, PublicPageHeader } from "@/components/layout/public-page-layout";
import { FaqSchema } from "@/components/seo/faq-schema";
import { JsonLd } from "@/components/seo/json-ld";
import type { GeoIntentAnswer } from "@/config/geo-content";
import { designTw } from "@/config/design-tokens";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/schema-markup";
import { absoluteUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";

export type LegalSection = { id: string; title: string; content: ReactNode };

type LegalDoc = "privacy" | "terms";

const DOCS: Record<LegalDoc, { label: string; href: "/privacy-policy" | "/terms-conditions"; icon: typeof FileText }> = {
  privacy: { label: "Privacy policy", href: "/privacy-policy", icon: ShieldCheck },
  terms: { label: "Terms & conditions", href: "/terms-conditions", icon: FileText },
};

/**
 * Shared layout for legal pages: answer-first summary ("At a glance") and FAQ for answer
 * engines, numbered anchor sections with a sticky table of contents, and WebPage +
 * BreadcrumbList + FAQPage JSON-LD. Fully server-rendered so crawlers see every word.
 */
export function LegalPage({
  doc,
  title,
  summary,
  updated,
  readingMinutes,
  highlights,
  sections,
  faqs,
}: {
  doc: LegalDoc;
  title: string;
  summary: string;
  /** ISO date (YYYY-MM-DD) the text last changed. */
  updated: string;
  readingMinutes: number;
  highlights: readonly string[];
  sections: LegalSection[];
  faqs: readonly GeoIntentAnswer[];
}) {
  const { href: path, icon: DocIcon } = DOCS[doc];
  const other = DOCS[doc === "privacy" ? "terms" : "privacy"];
  const updatedLabel = new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <PublicPage>
      <JsonLd
        data={[
          {
            ...buildWebPageSchema({ name: title, description: summary, path }),
            dateModified: updated,
            breadcrumb: { "@id": `${absoluteUrl(path)}#breadcrumb` },
            hasPart: sections.map((s) => ({
              "@type": "WebPageElement",
              name: s.title,
              url: absoluteUrl(`${path}#${s.id}`),
            })),
          },
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: title, path },
          ]),
        ]}
      />
      <FaqSchema items={[...faqs]} />

      <PublicPageHeader
        title={title}
        subtitle={summary}
        crumbs={[{ label: "Home", href: "/" }, { label: title }]}
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <DocIcon className="h-4 w-4" aria-hidden />
            Legal
          </span>
        }
        aside={
          <ul className="space-y-3 text-sm text-zinc-600">
            <li className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-accent" aria-hidden />
              Last updated <time dateTime={updated} className="font-medium text-zinc-900">{updatedLabel}</time>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-accent" aria-hidden />
              {readingMinutes} min read
            </li>
            <li>
              <Link
                href={other.href}
                className="flex items-center gap-2 font-semibold text-zinc-900 hover:text-brand-accent"
              >
                <other.icon className="h-4 w-4 text-brand-accent" aria-hidden />
                Read our {other.label.toLowerCase()}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </li>
          </ul>
        }
      />

      <div className={cn(designTw.publicContainer, "py-6 sm:py-8")}>
        <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-12">
          {/* Table of contents */}
          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="sticky top-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">On this page</p>
              <ol className="mt-3 space-y-0.5 border-l border-zinc-200">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="-ml-px flex gap-2 border-l-2 border-transparent py-1.5 pl-3 text-sm text-zinc-600 transition-colors hover:border-brand-accent hover:text-zinc-900"
                    >
                      <span className="tabular-nums text-zinc-400">{String(i + 1).padStart(2, "0")}</span>
                      {s.title}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href="#faq"
                    className="-ml-px flex gap-2 border-l-2 border-transparent py-1.5 pl-3 text-sm text-zinc-600 transition-colors hover:border-brand-accent hover:text-zinc-900"
                  >
                    <span className="text-zinc-400">?</span>
                    Common questions
                  </a>
                </li>
              </ol>
            </nav>
          </aside>

          <main className="min-w-0 max-w-3xl space-y-6">
            {/* Mobile table of contents */}
            <details className={cn(designTw.publicCard, "group lg:hidden")}>
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-zinc-900">
                On this page
                <ChevronDown className="h-4 w-4 text-zinc-400 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <ol className="space-y-1 border-t border-zinc-100 px-5 py-3">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="flex gap-2 py-1 text-sm text-zinc-600 hover:text-zinc-900">
                      <span className="tabular-nums text-zinc-400">{String(i + 1).padStart(2, "0")}</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </details>

            {/* At a glance — short, quotable answers */}
            <section
              aria-labelledby="at-a-glance"
              className="rounded-2xl border border-brand-accent/15 bg-gradient-to-br from-white to-red-50/40 p-5 sm:p-6"
            >
              <h2 id="at-a-glance" className="text-sm font-semibold text-zinc-900">
                At a glance
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {highlights.map((h) => (
                  <li key={h} className="flex gap-2.5 text-sm leading-6 text-zinc-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
            </section>

            {/* Sections */}
            <article className={cn(designTw.publicCard, "divide-y divide-zinc-100")}>
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-6 p-5 sm:p-7">
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm font-semibold tabular-nums text-brand-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2 id={`${s.id}-title`} className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
                      {s.title}
                    </h2>
                  </div>
                  <div className="legal-prose mt-3 sm:pl-8">{s.content}</div>
                </section>
              ))}
            </article>

            {/* FAQ */}
            <section id="faq" aria-labelledby="faq-title" className="scroll-mt-6">
              <h2 id="faq-title" className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
                Common questions
              </h2>
              <div className={cn(designTw.publicCard, "mt-4 divide-y divide-zinc-100")}>
                {faqs.map((f) => (
                  <details key={f.question} className="group px-5 py-4 sm:px-6">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[15px] font-medium text-zinc-900">
                      <h3 className="text-[15px] font-medium leading-6">{f.question}</h3>
                      <ChevronDown
                        className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <p className="mt-2 text-[15px] leading-7 text-zinc-600">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>

            {/* Contact */}
            <section className="flex flex-col gap-4 rounded-2xl bg-zinc-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Questions about this {doc === "privacy" ? "policy" : "page"}?</h2>
                <p className="mt-1 text-sm text-zinc-300">Use the contact form or email us — we&apos;re happy to help.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                >
                  <MessageSquare className="h-4 w-4" aria-hidden />
                  Contact form
                </Link>
                <a
                  href="mailto:enquiry@abadraho.com"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  enquiry@abadraho.com
                </a>
              </div>
            </section>
          </main>
        </div>
      </div>
    </PublicPage>
  );
}
