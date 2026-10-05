"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  GitCompare,
  Hammer,
  MapPin,
  Search,
  UserPlus,
} from "lucide-react";
import type { GeoIntentAnswer } from "@/config/geo-content";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { cn } from "@/lib/utils";

export type GeoBullet = string | { text: string; icon?: BulletIconKey };

type BulletIconKey =
  | "location"
  | "developer"
  | "price"
  | "progress"
  | "compare"
  | "account"
  | "search"
  | "schedule"
  | "default";

export type GeoSummaryVariant = "inline" | "card" | "accordion" | "chips";

const BULLET_ICONS: Record<BulletIconKey, LucideIcon> = {
  location: MapPin,
  developer: Building2,
  price: CreditCard,
  progress: Hammer,
  compare: GitCompare,
  account: UserPlus,
  search: Search,
  schedule: Calendar,
  default: CheckCircle2,
};

function inferBulletIcon(text: string): LucideIcon {
  const lower = text.toLowerCase();
  if (/location|area|karachi|zone|map|north|scheme|gulshan|avenue/.test(lower)) {
    return BULLET_ICONS.location;
  }
  if (/developer|builder|marketed|by /.test(lower)) {
    return BULLET_ICONS.developer;
  }
  if (/price|payment|pkr|installment|budget|down payment|pricing/.test(lower)) {
    return BULLET_ICONS.price;
  }
  if (/construction|progress|handover|pre-launch|possession|under /.test(lower)) {
    return BULLET_ICONS.progress;
  }
  if (/compare/.test(lower)) {
    return BULLET_ICONS.compare;
  }
  if (/account|sign in|register|inquir/.test(lower)) {
    return BULLET_ICONS.account;
  }
  if (/search|filter|browse/.test(lower)) {
    return BULLET_ICONS.search;
  }
  if (/schedule|visit|site/.test(lower)) {
    return BULLET_ICONS.schedule;
  }
  return BULLET_ICONS.default;
}

function normalizeBullet(bullet: GeoBullet): { text: string; Icon: LucideIcon } {
  if (typeof bullet === "string") {
    return { text: bullet, Icon: inferBulletIcon(bullet) };
  }
  const Icon = bullet.icon ? BULLET_ICONS[bullet.icon] : inferBulletIcon(bullet.text);
  return { text: bullet.text, Icon };
}

export function GeoSectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="border-l-2 border-brand-accent pl-3 text-xs font-semibold uppercase tracking-wider text-brand-accent">
      {children}
    </span>
  );
}

interface GeoPageSummaryProps {
  summary?: string;
  bullets?: GeoBullet[];
  intents?: GeoIntentAnswer[];
  className?: string;
  variant?: GeoSummaryVariant;
  compact?: boolean;
  /** @deprecated Use variant="inline" */
  embedded?: boolean;
  contentWidth?: "narrow" | "wide";
  factsToggleLabel?: string;
  faqToggleLabel?: string;
  /** Collapse long summary in accordion on mobile (default closed) */
  collapseSummaryOnMobile?: boolean;
}

export function IconBulletList({
  bullets,
  compact,
}: {
  bullets: GeoBullet[];
  compact: boolean;
}) {
  return (
    <ul className={cn("space-y-2.5", compact ? "text-xs" : "text-sm md:text-base")}>
      {bullets.map((bullet) => {
        const { text, Icon } = normalizeBullet(bullet);
        return (
          <li key={text} className="flex gap-2.5 text-zinc-700">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent/80" aria-hidden />
            <span className="leading-relaxed">{text}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function BulletChips({
  bullets,
  column,
}: {
  bullets: GeoBullet[];
  /** Single column on mobile — use on project PDP */
  column?: boolean;
}) {
  return (
    <div
      className={cn(
        "gap-2",
        column ? "flex flex-col sm:flex-row sm:flex-wrap" : "flex flex-wrap"
      )}
    >
      {bullets.map((bullet) => {
        const { text, Icon } = normalizeBullet(bullet);
        return (
          <span
            key={text}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm",
              column ? "w-full sm:max-w-full sm:w-auto" : "max-w-full"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-brand-accent/70" aria-hidden />
            <span className={cn("leading-snug", column ? "" : "line-clamp-2")}>{text}</span>
          </span>
        );
      })}
    </div>
  );
}

export function FaqAccordion({
  intents,
  compact,
  groupLabel,
}: {
  intents: GeoIntentAnswer[];
  compact: boolean;
  groupLabel: string;
}) {
  const labelClassName = compact ? "text-xs" : "text-sm";
  const answerClassName = compact
    ? "text-xs leading-relaxed text-zinc-700"
    : "text-sm leading-relaxed text-zinc-700 md:text-base";

  if (intents.length === 1) {
    const { question, answer } = intents[0];
    return (
      <CollapsiblePanel
        label={question}
        hint="Show answer"
        labelClassName={labelClassName}
        bodyClassName="px-4 py-3"
        defaultOpen={false}
      >
        <p className={answerClassName}>{answer}</p>
      </CollapsiblePanel>
    );
  }

  return (
    <CollapsiblePanel
      label={<GeoSectionLabel>{groupLabel}</GeoSectionLabel>}
      hint={`${intents.length} questions`}
      labelClassName={labelClassName}
      bodyClassName="space-y-2 p-3"
      defaultOpen={false}
    >
      {intents.map(({ question, answer }) => (
        <CollapsiblePanel
          key={question}
          label={question}
          labelClassName={cn(labelClassName, "px-3 py-2.5")}
          bodyClassName="px-3 py-2.5"
          className="border-zinc-100 bg-zinc-50/50"
          defaultOpen={false}
        >
          <p className={answerClassName}>{answer}</p>
        </CollapsiblePanel>
      ))}
    </CollapsiblePanel>
  );
}

function SummaryText({
  summary,
  compact,
  contentWidth,
}: {
  summary: string;
  compact: boolean;
  contentWidth: "narrow" | "wide";
}) {
  return (
    <p
      className={cn(
        "leading-relaxed text-zinc-700",
        compact ? "text-sm" : "text-base md:text-lg",
        contentWidth === "wide" ? "max-w-3xl" : "max-w-2xl"
      )}
    >
      {summary}
    </p>
  );
}

function SummaryBlock({
  summary,
  compact,
  contentWidth,
  collapseOnMobile,
}: {
  summary: string;
  compact: boolean;
  contentWidth: "narrow" | "wide";
  collapseOnMobile: boolean;
}) {
  const text = (
    <SummaryText summary={summary} compact={compact} contentWidth={contentWidth} />
  );

  if (!collapseOnMobile) return text;

  return (
    <>
      <div className="md:hidden">
        <CollapsiblePanel
          label={<GeoSectionLabel>Summary</GeoSectionLabel>}
          hint="Read more"
          labelClassName={compact ? "text-xs" : "text-sm"}
          bodyClassName="px-4 py-3"
          defaultOpen={false}
        >
          {text}
        </CollapsiblePanel>
      </div>
      <div className="hidden md:block">{text}</div>
    </>
  );
}

/** Lead summary + facts / FAQ — variant controls layout; content stays in DOM for GEO. */
export function GeoPageSummary({
  summary,
  bullets,
  intents,
  className,
  variant = "card",
  compact = false,
  embedded = false,
  contentWidth = "narrow",
  factsToggleLabel = "Key facts",
  faqToggleLabel = "Common questions",
  collapseSummaryOnMobile = true,
}: GeoPageSummaryProps) {
  const resolvedVariant: GeoSummaryVariant = embedded ? "inline" : variant;
  const hasBullets = Boolean(bullets?.length);
  const hasIntents = Boolean(intents?.length);
  const collapseSummary =
    collapseSummaryOnMobile &&
    resolvedVariant !== "inline" &&
    Boolean(summary && summary.length > 120);

  if (!summary && !hasBullets && !hasIntents) return null;

  const summaryBlock = summary ? (
    <SummaryBlock
      summary={summary}
      compact={compact}
      contentWidth={contentWidth}
      collapseOnMobile={collapseSummary}
    />
  ) : null;

  const bulletsBlock = hasBullets ? (
    resolvedVariant === "chips" ? (
      <BulletChips bullets={bullets!} column />
    ) : resolvedVariant === "inline" ? (
      <div className={cn(summary ? "mt-4" : undefined)}>
        <GeoSectionLabel>{factsToggleLabel}</GeoSectionLabel>
        <div className="mt-3">
          <IconBulletList bullets={bullets!} compact={compact} />
        </div>
      </div>
    ) : (
      <CollapsiblePanel
        label={<GeoSectionLabel>{factsToggleLabel}</GeoSectionLabel>}
        hint={`${bullets!.length} items`}
        labelClassName={compact ? "text-xs" : "text-sm"}
        bodyClassName="px-4 py-3"
        defaultOpen={false}
        className={summary ? (compact ? "mt-3" : "mt-4") : undefined}
      >
        <IconBulletList bullets={bullets!} compact={compact} />
      </CollapsiblePanel>
    )
  ) : null;

  const intentsBlock = hasIntents ? (
    <div className={cn((summary || hasBullets) && (compact ? "mt-2" : "mt-3"))}>
      <FaqAccordion
        intents={intents!}
        compact={compact}
        groupLabel={faqToggleLabel}
      />
    </div>
  ) : null;

  const inner = (
    <>
      {summaryBlock}
      {bulletsBlock}
      {intentsBlock}
    </>
  );

  if (resolvedVariant === "inline") {
    return (
      <section aria-label="Page summary" className={cn("space-y-3", className)}>
        {inner}
      </section>
    );
  }

  if (resolvedVariant === "accordion") {
    return (
      <section aria-label="Page summary" className={cn("space-y-3", className)}>
        {summaryBlock}
        {bulletsBlock}
        {intentsBlock}
      </section>
    );
  }

  if (resolvedVariant === "chips") {
    return (
      <section
        aria-label="Page summary"
        className={cn(
          "rounded-clay border border-white/80 bg-clay-surface shadow-clay-sm p-4 md:p-5",
          className
        )}
      >
        {inner}
      </section>
    );
  }

  /* card (default) */
  return (
    <section
      aria-label="Page summary"
      className={cn(
        "rounded-xl border border-zinc-200 bg-zinc-50/80",
        compact ? "p-4" : "p-5 md:p-6",
        className
      )}
    >
      {inner}
    </section>
  );
}

export function StatChip({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
