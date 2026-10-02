/** GEO-optimized copy — concise summaries, intent answers, and EEAT signals for AI citation. */

export interface GeoIntentAnswer {
  question: string;
  answer: string;
}

export interface GeoPageContent {
  summary: string;
  bullets: string[];
  intents?: GeoIntentAnswer[];
}

export const geoContent = {
  home: {
    summary:
      "AbadRaho is Pakistan's off-plan property platform, operated by Mark Properties since 2020. Search pre-launch and under-construction projects in Karachi and across Pakistan, compare payment plans, and connect with verified builders.",
    bullets: [
      "Founded in 2020 by Mark Properties — a Karachi-based real estate advisory team",
      "Lists apartments, plots, houses, and commercial off-plan projects",
      "Compare prices, handover dates, installments, and unit plans side by side",
      "Map search for popular areas including North Karachi, Scheme 33, and Gulshan-e-Maymar",
      "Free buyer support: search, schedule site visits, submit inquiries, and download vouchers",
    ],
    intents: [
      {
        question: "What is AbadRaho?",
        answer:
          "AbadRaho is an off-plan property search and comparison platform in Pakistan, backed by Mark Properties, helping buyers find and evaluate projects before possession.",
      },
      {
        question: "Which cities does AbadRaho cover?",
        answer:
          "AbadRaho focuses on Karachi and other major Pakistani markets where Mark Properties lists verified off-plan residential and commercial developments.",
      },
    ],
  },
  listings: {
    summary:
      "Browse live off-plan listings on AbadRaho — filter by area, budget, unit type, handover timeline, and payment plan to find projects that match your investment goals in Pakistan.",
    bullets: [
      "Filter by location, price range, down payment, and monthly installment",
      "View project progress: pre-launch, under construction, and near handover",
      "Switch between list and map view to explore Karachi hotspots",
      "Open any project for unit pricing, floor plans, amenities, and developer details",
      "Create a free account to submit inquiries and request payment schedules",
    ],
    intents: [
      {
        question: "How do I find off-plan property in Karachi on AbadRaho?",
        answer:
          "Use the search bar or area filters on the listings page, or open map view to explore projects in North Karachi, Scheme 33, Jinnah Avenue, and other high-demand zones.",
      },
      {
        question: "Can I compare payment plans before buying?",
        answer:
          "Yes. Add projects to Compare, then review down payment, installment length, and unit-level pricing side by side before contacting the developer.",
      },
    ],
  },
  about: {
    summary:
      "AbadRaho is the digital property platform of Mark Properties, a Pakistan real estate company helping buyers source, evaluate, and secure off-plan residential and commercial investments with transparent advisory support.",
    bullets: [
      "Operator: Mark Properties — established real estate advisors in Pakistan",
      "Experience: end-to-end buyer assistance from search through deal closure",
      "Expertise: off-plan apartments, plots, villas, bungalows, shops, and commercial units",
      "Authority: partnerships with leading Karachi builders and developers",
      "Trust: transparent communication, ethical brokerage, and verified project listings",
    ],
    intents: [
      {
        question: "Who operates AbadRaho?",
        answer:
          "AbadRaho is operated by Mark Properties, a Pakistan-based real estate company led by experienced property advisors serving residential and commercial buyers.",
      },
      {
        question: "What makes Mark Properties trustworthy for off-plan buyers?",
        answer:
          "Mark Properties combines licensed advisory practice, long-standing builder relationships, and post-sale client support — with a focus on transparency in pricing and payment plans.",
      },
    ],
  },
  contact: {
    summary:
      "Contact AbadRaho for off-plan property inquiries, site visit scheduling, payment plan questions, and partnership requests. Our Mark Properties team responds to buyer and developer messages through this form.",
    bullets: [
      "Buyer inquiries: project availability, pricing, and installment breakdowns",
      "Site visits: schedule tours for shortlisted developments",
      "Investment guidance: area and project recommendations for your budget",
      "Developer & broker partnerships: list projects on AbadRaho",
      "Email: enquiry@abadraho.com",
    ],
    intents: [
      {
        question: "How do I ask about a specific off-plan project?",
        answer:
          "Open the project page and submit an inquiry while signed in, or use this contact form with the project name in your message for a callback from our team.",
      },
    ],
  },
  blog: {
    summary:
      "The AbadRaho blog publishes practical guides and market updates for off-plan property buyers in Pakistan — written to help you understand payment plans, area trends, and investment decisions.",
    bullets: [
      "Guides: how to compare installments, evaluate builders, and shortlist areas",
      "Market updates: Karachi and Pakistan off-plan trends",
      "Buyer education from the Mark Properties advisory team",
      "New articles added as projects and regulations evolve",
    ],
  },
  compare: {
    summary:
      "AbadRaho Compare lets you evaluate two off-plan projects side by side — including location, starting price, handover date, developer, installment length, and unit-level payment breakdowns.",
    bullets: [
      "Add up to two projects from any listing or project page",
      "Compare project specs: area, address, progress, and developer",
      "Select units to compare gross area, down payment, and monthly installments",
      "Sign in to unlock floor plans, payment schedules, and room breakdowns",
      "Submit a combined inquiry after you shortlist the right option",
    ],
    intents: [
      {
        question: "How does AbadRaho project comparison work?",
        answer:
          "Add two projects to Compare, pick a unit on each side, and review pricing, handover, and plan details in one table — then contact the developer for the project that fits your budget.",
      },
    ],
  },
  terms: {
    summary:
      "These terms govern use of AbadRaho, Mark Properties' off-plan property platform. By browsing listings, creating an account, or submitting inquiries you agree to our brokerage and data policies.",
    bullets: [
      "Listings are provided for information — verify details with developers before purchase",
      "Inquiries may be shared with project owners and Mark Properties advisors",
      "Account data is handled per our privacy and security practices",
      "Questions: contact form or enquiry@abadraho.com",
    ],
  },
  privacy: {
    summary:
      "How AbadRaho, operated by Mark Properties, collects, uses, and protects your personal information when you browse listings, create an account, or contact developers.",
    bullets: [
      "We collect what you give us (name, email, phone) plus basic usage data",
      "Inquiries are shared only with the relevant developer and Mark Properties advisors",
      "We do not sell your personal information",
      "Ask us to access, correct, or delete your data: enquiry@abadraho.com",
    ],
  },
} as const satisfies Record<string, GeoPageContent>;
