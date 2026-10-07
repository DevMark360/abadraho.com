/**
 * Home page answer-engine (AEO) copy: the hero's direct answer, the FAQ, and the "how to buy"
 * steps. The visible page and its FAQPage / HowTo JSON-LD are both built from these, so the
 * schema always matches what users see. Numbers come from live data where possible.
 */
import { assistanceSteps, popularPlaces } from "@/config/marketing";
import { trustStats } from "@/config/trust-signals";
import type { ProjectListItem } from "@/types/project";
import type { HomeListingStats } from "@/server/services/home-stats.service";

export type HomeFaq = { question: string; answer: string };

/**
 * Home page content dates for schema (freshness signals). Bump HOME_CONTENT_UPDATED whenever
 * the home copy (hero, FAQ, guide) changes; the page also uses the newest blog post date.
 */
export const HOME_CONTENT_PUBLISHED = "2026-10-05";
export const HOME_CONTENT_UPDATED = "2026-10-06";

const yearsExperience =
  trustStats.find((s) => s.label === "Years experience")?.value ?? "15+";
const builderPartners =
  trustStats.find((s) => s.label === "Builder partners")?.value ?? "50+";

/**
 * Visible copy never states project counts: numbers in text get copied and cached by search and
 * AI engines and go stale as projects are added or removed. Live counts only appear in UI that
 * re-renders (and in /llms-full.txt, which is generated per request).
 */

/**
 * Opening paragraph, right under the H1 ("Pakistan's platform for off-plan property"). The first
 * sentence answers the H1 on its own using the same words; the whole paragraph stays at ~50 words
 * (answer engines quote the first 40-60 words).
 */
export function homeLead(): string {
  return `AbadRaho is Pakistan's platform for buying off-plan property, operated by Mark Properties in Karachi. It lists verified pre-launch and under-construction projects with prices, down payments, monthly installments, and handover dates, so you can compare them side by side and get free advice from experts with ${yearsExperience} years in real estate.`;
}

export function homeFaqs(): HomeFaq[] {
  // Static list (config), not live counts: no database work and nothing to go stale.
  const areaSentence = ` Popular areas include ${popularPlaces
    .slice(0, 4)
    .map((p) => p.name)
    .join(", ")}.`;

  return [
    {
      question: "What is AbadRaho?",
      answer: `AbadRaho is a search and comparison platform for off-plan property in Pakistan, operated by Mark Properties. It lists verified pre-launch and under-construction projects, mainly in Karachi, with prices, payment plans, and handover dates on every project page.`,
    },
    {
      question: "Is AbadRaho free for buyers?",
      answer:
        "Yes. Searching listings, comparing projects, saving a shortlist, and sending inquiries are all free for buyers. Builders pay to advertise their projects; buyers never pay AbadRaho a fee.",
    },
    {
      question: "Which areas does AbadRaho cover?",
      answer: `AbadRaho focuses on Karachi, with projects from ${builderPartners} builder partners.${areaSentence} You can filter any listing by area, or open map view to see every project's location.`,
    },
    {
      question: "What is an off-plan property?",
      answer:
        "An off-plan property is sold before construction is finished, at pre-launch or while it is being built. Buyers pay a down payment first and the rest in installments until possession, which usually costs less up front than buying a finished property.",
    },
    {
      question: "How do I compare payment plans on AbadRaho?",
      answer:
        "Add up to 2 projects to Compare from any listing or project page. You then see location, starting price, handover date, and developer side by side, and can pick units to compare down payment, installment length, and monthly amounts.",
    },
    {
      question: "How do I book a site visit or talk to an advisor?",
      answer:
        "Open the project and send an inquiry, or use the contact page or email enquiry@abadraho.com. A Mark Properties advisor will call you back to answer payment plan questions and arrange a site visit, free of charge.",
    },
  ];
}

/**
 * Buyer's guide section — general, non-promotional guidance (not financial or legal advice).
 * Gives answer engines quotable passages, a comparison table, and a checklist.
 */
export function homeGuide() {
  return {
    title: "Buying off-plan property in Karachi: what to know",
    intro: `Many new projects in Karachi are sold off-plan, from apartments in North Karachi and Scheme 33 to plots and houses on the city's edges. AbadRaho lists these projects in one place, so you can check prices, payment plans, and handover dates before you speak to a developer. The notes below cover what buyers most often ask Mark Properties advisors before booking.`,
    paymentPlans: {
      question: "How do off-plan payment plans work?",
      paragraphs: [
        "Most off-plan projects ask for a down payment at booking, then spread the rest of the price over installments (usually monthly or quarterly) until possession. Many plans also include larger balloon payments at milestones such as confirmation, structure completion, or handover.",
        "Each project page on AbadRaho shows the plan the developer has shared: down payment, installment length, monthly amount, and unit-level prices where available. Plans change between phases, so always confirm the current schedule in writing before you pay.",
      ],
    },
    comparison: {
      question: "Off-plan vs ready property: how do they compare?",
      caption:
        "Off-plan compared with ready (completed) property for buyers in Pakistan",
      columns: ["", "Off-plan property", "Ready property"] as const,
      columnNotes: [
        "",
        "Bought before construction finishes",
        "Completed and ready to move in",
      ] as const,
      rows: [
        [
          "Price",
          "Usually lower at pre-launch; prices often rise in later phases",
          "Market price for a finished unit",
        ],
        [
          "Upfront payment",
          "Down payment only, rest in installments",
          "Full price or a bank loan at purchase",
        ],
        [
          "Payment period",
          "Spread over the construction period",
          "Paid at or near transfer",
        ],
        [
          "Possession",
          "At handover, after construction finishes",
          "Immediately after transfer",
        ],
        [
          "Unit choice",
          "Wider choice of floors, views, and layouts early on",
          "Limited to what is on the market",
        ],
      ],
    },
    checklist: {
      question: "What should you check before booking an off-plan project?",
      items: [
        "Approvals: in Karachi, ask for the Sindh Building Control Authority (SBCA) approval and NOC for the project; other cities have their own development authorities.",
        "Land title: confirm the developer owns the land or has a registered agreement to build on it.",
        "Developer track record: visit projects they have already handed over and ask owners about delays.",
        "Written payment schedule: get every installment, milestone payment, and late-payment charge in writing.",
        "Booking documents: read the booking form or allotment letter, including cancellation and refund terms.",
        "Site progress: visit the site and compare progress with the timeline the developer promised.",
      ],
    },
    afterBooking: {
      question: "What happens after you book?",
      paragraph:
        "After booking you receive a booking or allotment document and follow the installment schedule until handover. Keep every receipt, track construction progress, and contact the developer (or your Mark Properties advisor) if milestones slip. At possession, check the unit against the agreed specifications before taking the keys.",
    },
  };
}

/**
 * "By the numbers" paragraphs for the buyer's guide, from live listing data. Percentages and
 * medians only, so the copy never states a project count. Returns [] when there is too little data.
 */
export function homeListingInsights(stats: HomeListingStats): {
  question: string;
  paragraphs: string[];
} {
  const paragraphs: string[] = [];
  if (stats.medianDownPaymentPct != null) {
    paragraphs.push(
      `Based on AbadRaho listing data, the median down payment is ${stats.medianDownPaymentPct}% of the unit price. That means a buyer of a PKR 1 crore apartment would typically pay around ${formatPkrShort(stats.medianDownPaymentPct * 100_000)} at booking, with the rest spread over installments.`,
    );
  }
  if (stats.medianPlanMonths != null) {
    const years = Math.round((stats.medianPlanMonths / 12) * 2) / 2;
    const longShare =
      stats.longPlanSharePct != null
        ? ` ${stats.longPlanSharePct}% of published plans run 3 years or longer, which keeps monthly installments lower.`
        : "";
    paragraphs.push(
      `The median installment plan on AbadRaho runs ${stats.medianPlanMonths} months, or about ${years} years, according to the payment plans developers have published.${longShare}`,
    );
  }
  if (stats.offPlanSharePct != null) {
    paragraphs.push(
      `${stats.offPlanSharePct}% of the projects listed on AbadRaho are still at pre-launch or under construction; the rest are ready for possession.${
        stats.offPlanSharePct >= 50
          ? " In other words, most homes listed on AbadRaho are bought off-plan, so comparing payment plans matters as much as comparing prices."
          : ""
      }`,
    );
  }
  return {
    question: "What does AbadRaho's listing data show?",
    paragraphs,
  };
}

/** "How to buy" — same four steps as the How it works section, with where each one happens. */
export const homeHowTo = {
  name: "How to buy off-plan property on AbadRaho",
  description:
    "Four steps from search to booking an off-plan property in Pakistan, with free Mark Properties advisor support.",
  steps: assistanceSteps.map((step, i) => ({
    name: step.title,
    text: step.description,
    path: ["/projects", "/contact", "/contact", "/compare"][i] ?? "/",
  })),
};

/** PKR in the units Pakistani buyers use: crore (10,000,000) and lakh (100,000). */
export function formatPkrShort(value: number): string {
  const oneDecimal = (n: number) => (Math.round(n * 10) / 10).toString();
  if (value >= 1e7) return `PKR ${oneDecimal(value / 1e7)} crore`;
  if (value >= 1e5) return `PKR ${oneDecimal(value / 1e5)} lakh`;
  return `PKR ${Math.round(value).toLocaleString("en-PK")}`;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const pct = (part: number, whole: number) => Math.round((part / whole) * 100);

export type HomeInsight = { value: string; label: string; detail: string };

/** Minimum data points before a statistic is shown — avoids "insights" from 1–2 projects. */
const MIN_SAMPLE = 5;

/**
 * Data-backed insights computed from AbadRaho's own live listings (not third-party research).
 * Each stat is only shown when enough projects carry that field.
 */
export function homeInsights(
  projects: ProjectListItem[],
  total: number,
): HomeInsight[] {
  const out: HomeInsight[] = [];
  const n = projects.length;
  if (n < MIN_SAMPLE) return out;
  const sampleNote =
    total > n ? ` (based on ${n} of ${total} listed projects)` : "";

  const statuses = projects
    .map((p) => p.progressName?.trim())
    .filter((s): s is string => Boolean(s));
  if (statuses.length >= MIN_SAMPLE) {
    const counts = new Map<string, number>();
    for (const s of statuses) counts.set(s, (counts.get(s) ?? 0) + 1);
    const [topStatus, topCount] = [...counts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0];
    out.push({
      value: `${pct(topCount, statuses.length)}%`,
      label: `of projects are ${topStatus.toLowerCase()}`,
      detail: `${topCount} of ${statuses.length} projects with a published stage are at the ${topStatus.toLowerCase()} stage${sampleNote}.`,
    });
  }

  const months = projects
    .map((p) => p.installmentMonths)
    .filter((m): m is number => m != null && m > 0);
  const medMonths = months.length >= MIN_SAMPLE ? median(months) : null;
  if (medMonths) {
    const years = Math.round((medMonths / 12) * 10) / 10;
    out.push({
      value: `${years} years`,
      label: "typical installment plan",
      detail: `The median payment plan runs ${Math.round(medMonths)} months across ${months.length} projects with a published plan${sampleNote}.`,
    });
  }

  const prices = projects
    .map((p) => p.minPrice)
    .filter((v): v is number => v != null && v > 0);
  const medPrice = prices.length >= MIN_SAMPLE ? median(prices) : null;
  if (medPrice) {
    out.push({
      value: formatPkrShort(medPrice),
      label: "median starting price",
      detail: `Half of the ${prices.length} projects with published prices start below ${formatPkrShort(medPrice)}${sampleNote}.`,
    });
  }

  const monthly = projects
    .map((p) => p.minMonthlyInstallment)
    .filter((v): v is number => v != null && v > 0);
  const medMonthly = monthly.length >= MIN_SAMPLE ? median(monthly) : null;
  if (medMonthly) {
    out.push({
      value: formatPkrShort(medMonthly),
      label: "median lowest monthly installment",
      detail: `Across ${monthly.length} projects with unit-level plans, the cheapest unit's monthly installment has a median of ${formatPkrShort(medMonthly)}${sampleNote}.`,
    });
  }

  const builders = new Set(
    projects.map((p) => p.builderName?.trim()).filter(Boolean),
  );
  if (builders.size >= MIN_SAMPLE) {
    out.push({
      value: String(builders.size),
      label: "developers with live projects",
      detail: `${builders.size} different developers currently have off-plan projects listed on AbadRaho${sampleNote}.`,
    });
  }

  return out;
}

/**
 * Official sources the buyer's guide refers to — cited as external links for readers and AI
 * engines. Government development authorities only.
 */
export const homeSources = [
  {
    name: "Sindh Building Control Authority (SBCA)",
    url: "https://sbca.gos.pk/",
    note: "Building plan approvals and NOCs for projects in Karachi and Sindh",
  },
  {
    name: "Lahore Development Authority (LDA)",
    url: "https://www.lda.gop.pk/",
    note: "Approved housing schemes and building plans in Lahore",
  },
  {
    name: "Capital Development Authority (CDA)",
    url: "https://www.cda.gov.pk/",
    note: "Approved housing schemes and planning in Islamabad",
  },
] as const;
