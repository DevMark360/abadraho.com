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
      "AbadRaho is Pakistan's off-plan property platform, operated by Mark Properties. Search pre-launch and under-construction projects in Karachi and across Pakistan, compare payment plans, and connect with verified builders.",
    bullets: [
      "Operated by Mark Properties — a Karachi-based real estate advisory team",
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
      "These terms explain the rules for using AbadRaho, the off-plan property platform operated by Mark Properties in Pakistan — for buyers browsing listings, account holders, and builders who advertise.",
    bullets: [
      "Browsing listings and sending inquiries is free for buyers",
      "Prices and payment plans come from developers — always confirm before you pay",
      "AbadRaho connects buyers with developers; the sale contract is with the developer",
      "Builder wallet top-ups are credited after our team verifies the payment",
    ],
    intents: [
      {
        question: "Is AbadRaho free to use for property buyers?",
        answer:
          "Yes. Browsing off-plan listings, comparing projects, saving favourites, and sending inquiries on AbadRaho is free for buyers.",
      },
      {
        question: "Are the prices and payment plans on AbadRaho final?",
        answer:
          "No. Prices, payment plans, and availability are supplied by developers and can change. Always confirm the final price and terms in writing with the developer before making any payment.",
      },
      {
        question: "Is AbadRaho the developer of the projects it lists?",
        answer:
          "No. AbadRaho is a listing and advisory platform operated by Mark Properties. Projects are built and sold by their developers, and your purchase agreement is with the developer.",
      },
      {
        question: "How do builders add money to their AbadRaho advertising wallet?",
        answer:
          "Builders transfer the amount to the account shown on their Wallet page, then submit the amount, transaction ID, and a payment screenshot. The AbadRaho team verifies the payment before the wallet is credited.",
      },
    ],
  },
  privacy: {
    summary:
      "How AbadRaho, operated by Mark Properties, collects, uses, shares, and protects your personal information — and how you can access, correct, or delete it.",
    bullets: [
      "We collect what you give us (name, email, phone) plus basic usage data",
      "Your inquiry goes only to that project's developer and Mark Properties advisors",
      "We never sell your personal information",
      "Request a copy or deletion of your data anytime at enquiry@abadraho.com",
    ],
    intents: [
      {
        question: "Does AbadRaho sell my personal information?",
        answer:
          "No. AbadRaho does not sell personal information. It is shared only with the developer and Mark Properties advisors handling your inquiry, and with service providers needed to run the site.",
      },
      {
        question: "Who can see my inquiry on AbadRaho?",
        answer:
          "When you send an inquiry, your name, contact details, and message are shared with the developer of that project and the Mark Properties advisors responding to you.",
      },
      {
        question: "Why does AbadRaho send a code to my WhatsApp?",
        answer:
          "AbadRaho verifies your mobile number by sending a one-time code to WhatsApp through Meta's WhatsApp Business Platform. The code is only used to confirm the number belongs to you.",
      },
      {
        question: "How do I delete my AbadRaho account and data?",
        answer:
          "Email enquiry@abadraho.com from the address on your account and ask for deletion. You can also ask for a copy of your data or for corrections.",
      },
    ],
  },
} as const satisfies Record<string, GeoPageContent>;
