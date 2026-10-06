import { legacyStaticUrl } from "@/lib/legacy-url";

export const assistanceSteps = [
  {
    title: "Search projects",
    description:
      "Filter off-plan listings by area, budget, unit type, and handover date to build a shortlist that matches your goals.",
    icon: "search" as const,
  },
  {
    title: "Schedule a site visit",
    description:
      "Book a guided visit with Mark Properties advisors once you have shortlisted developments worth seeing in person.",
    icon: "schedule" as const,
  },
  {
    title: "Talk to an advisor",
    description:
      "Get expert answers on payment plans, developer track records, and area growth before you commit.",
    icon: "phone" as const,
  },
  {
    title: "Invest with confidence",
    description:
      "Submit inquiries, compare final options, and move forward with transparent pricing and documented plans.",
    icon: "invest" as const,
  },
];

export const propertyCategories = [
  {
    title: "Apartments",
    description:
      "Off-plan flats, apartments, and townhouses from trusted Karachi builders, with installment plans.",
    href: "/projects?unitType=11",
    icon: "building" as const,
    image: legacyStaticUrl("/assets/images/home/jinnah_avenue.jpg"),
  },
  {
    title: "Plots",
    description:
      "Residential and commercial plot files and land projects for long-term and mid-term investors.",
    href: "/projects?unitType=3",
    icon: "plot" as const,
    image: legacyStaticUrl("/assets/images/home/northkarachi.jpg"),
  },
  {
    title: "Houses",
    description:
      "Under-construction houses and villa schemes with flexible down payment and monthly plans.",
    href: "/projects?unitType=2",
    icon: "house" as const,
    image: legacyStaticUrl("/assets/images/home/maymaar.jpg"),
  },
  {
    title: "Commercial",
    description:
      "Shops, offices, and mixed-use off-plan commercial inventory listed on AbadRaho.",
    href: "/projects?unitType=6",
    icon: "commercial" as const,
    image: legacyStaticUrl("/assets/images/home/scheme33.jpg"),
  },
];

export const popularPlaces = [
  {
    name: "North Karachi",
    query: "North Karachi",
    href: "/projects?q=North+Karachi",
    image: legacyStaticUrl("/assets/images/home/northkarachi.jpg"),
    // Intrinsic size: width/height attributes reserve space (no layout shift).
    imageWidth: 360,
    imageHeight: 380,
    large: false,
  },
  {
    name: "Scheme 33",
    query: "Scheme 33",
    href: "/projects?q=Scheme+33",
    image: legacyStaticUrl("/assets/images/home/scheme33.jpg"),
    // Intrinsic size: width/height attributes reserve space (no layout shift).
    imageWidth: 750,
    imageHeight: 380,
    large: true,
  },
  {
    name: "Jinnah Avenue",
    query: "Jinnah Avenue",
    href: "/projects?q=Jinnah+Avenue",
    image: legacyStaticUrl("/assets/images/home/jinnah_avenue.jpg"),
    // Intrinsic size: width/height attributes reserve space (no layout shift).
    imageWidth: 750,
    imageHeight: 380,
    large: true,
  },
  {
    name: "Gulshan - e - Maymaar",
    query: "Gulshan Maymaar",
    href: "/projects?q=Gulshan+Maymaar",
    image: legacyStaticUrl("/assets/images/home/maymaar.jpg"),
    // Intrinsic size: width/height attributes reserve space (no layout shift).
    imageWidth: 360,
    imageHeight: 380,
    large: false,
  },
];

/** Builder partner logos — `name` is the logo's alt text (accessibility + image SEO). */
export type PartnerLogo = { name: string; src: string };

export const partnerLogos: PartnerLogo[] = [
  { file: "Firdouse-01.jpg", name: "Firdous Builders and Developers" },
  { file: "Domanin-01.jpg", name: "Dominion" },
  { file: "Elite-01.jpg", name: "Elite Villas" },
  { file: "Untitled-2-01.jpg", name: "Saima Group" },
  { file: "NB-01.jpg", name: "Nadeem Brothers (NB) Group" },
  { file: "Falaknaz-01.jpg", name: "Falaknaz" },
  { file: "Goldline-01.jpg", name: "Goldline" },
  { file: "Shahmeer-01.jpg", name: "Shahmir Residency" },
].map(({ file, name }) => ({ name, src: legacyStaticUrl(`/assets/images/partners/${file}`) }));

export const homeStatCards = [
  { label: "Search", description: "Live off-plan listings across Karachi & Pakistan", icon: "search" as const },
  { label: "Compare", description: "Payment plans, handover & installments side by side", icon: "compare" as const },
  { label: "Invest", description: "Advisor support from search through inquiry", icon: "invest" as const },
];

export const homeQuickPills = [
  { label: "Apartments", href: "/projects?unitType=11" },
  { label: "Plots", href: "/projects?unitType=3" },
  { label: "Compare", href: "/compare" },
  { label: "Scheme 33", href: "/projects?q=Scheme+33" },
] as const;

export const homeHeroImage = legacyStaticUrl("/assets/images/home/jinnah_avenue.jpg");

export const homeHeroAccentImage = legacyStaticUrl("/assets/images/home/scheme33.jpg");

export const homeValueProps = [
  {
    title: "Verified listings",
    description: "Every project reviewed by Mark Properties advisors before going live.",
    icon: "shield" as const,
  },
  {
    title: "Compare payment plans",
    description: "Side-by-side installment breakdowns, unique to AbadRaho.",
    icon: "compare" as const,
  },
  {
    title: "Expert guidance",
    description: "Free advisor support from shortlist to site visit and inquiry.",
    icon: "advisor" as const,
  },
  {
    title: "Karachi market focus",
    description: "Deep coverage of Scheme 33, North Karachi, and high-growth corridors.",
    icon: "map" as const,
  },
] as const;

export const homeTestimonial = {
  quote:
    "AbadRaho made it easy to compare off-plan projects and understand payment plans before I invested.",
  author: "Off-plan buyer",
  location: "Karachi",
};

export const builderPartnerBenefits = [
  {
    title: "Showcase your inventory",
    description:
      "List apartments, plots, houses, and commercial units with photos, payment plans, and handover timelines.",
    icon: "building" as const,
  },
  {
    title: "Reach serious buyers",
    description:
      "Connect with investors actively searching off-plan projects in Karachi and across Pakistan.",
    icon: "users" as const,
  },
  {
    title: "Verified partner badge",
    description:
      "Stand out with Mark Properties–backed listings that build buyer trust from the first click.",
    icon: "shield" as const,
  },
  {
    title: "Dedicated onboarding",
    description:
      "Our team helps you add projects, keep listings updated, and respond to buyer inquiries.",
    icon: "headset" as const,
  },
] as const;

export const aboutContent = {
  pullQuote: "A leading real estate company in Pakistan, trusted by off-plan buyers.",
  ceoParagraphs: [
    "Mark Properties has grown into one of Pakistan's trusted real estate advisory firms. Since our founding, we have helped buyers locate off-plan residential and commercial projects, evaluate payment plans, and complete purchases with clear documentation and ethical guidance.",
    "Our clients return to us because we combine market expertise with responsive service. Every AbadRaho listing is supported by trained property advisors who explain pricing, handover timelines, and developer credentials in plain language.",
    "Our reputation is built on transparency, honest communication, and consistent follow-through, whether you are buying an apartment in Karachi, a plot in a growing corridor, or a commercial unit for rental income.",
  ],
  mission:
    "Deliver residential and commercial off-plan opportunities that match real buyer needs, backed by competent advisors and an integrated team from search to closing.",
  vision:
    "Become Pakistan's most trusted digital gateway for off-plan property, expanding reach while keeping every client relationship transparent and accountable.",
  values:
    "Communication, commitment, and client care guide every recommendation. We provide holistic real estate advice, not just listings.",
  bannerImage: legacyStaticUrl("/assets/images/about/banner.jpg"),
};
