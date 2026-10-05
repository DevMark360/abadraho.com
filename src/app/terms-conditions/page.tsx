import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { geoContent } from "@/config/geo-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Terms & Conditions for Buyers and Builders",
  description:
    "AbadRaho terms and conditions: using the off-plan property platform, accounts, listing accuracy, inquiries, builder advertising and wallet top-ups, and acceptable use.",
  keywords: [
    "AbadRaho terms and conditions",
    "Mark Properties terms",
    "off-plan property platform terms Pakistan",
  ],
  path: "/terms-conditions",
});

const sections: LegalSection[] = [
  {
    id: "about-these-terms",
    title: "About these terms",
    content: (
      <p>
        AbadRaho (abadraho.com) is an off-plan property platform in Pakistan operated by Mark
        Properties. By browsing listings, creating an account, submitting an inquiry, or
        advertising on AbadRaho you agree to these terms and to our{" "}
        <Link href="/privacy-policy">privacy policy</Link>. If you do not agree, please do not use
        the platform.
      </p>
    ),
  },
  {
    id: "our-role",
    title: "Our role",
    content: (
      <p>
        AbadRaho helps buyers discover, compare, and inquire about off-plan projects, and Mark
        Properties advisors may assist with your inquiry. Projects are built and sold by their
        developers. <strong>Any booking or purchase agreement is between you and the
        developer</strong>, not AbadRaho.
      </p>
    ),
  },
  {
    id: "listing-accuracy",
    title: "Listing accuracy",
    content: (
      <p>
        Project details, prices, payment plans, images, and handover dates are supplied by
        developers and may change without notice. We work to keep listings accurate but cannot
        guarantee them. <strong>Always confirm final prices and terms in writing with the
        developer before making any payment.</strong>
      </p>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    content: (
      <ul>
        <li>Give accurate information and keep your password private.</li>
        <li>You are responsible for activity on your account. Tell us if you suspect misuse.</li>
        <li>
          Buyer accounts are created at signup; agent and builder accounts are set up by our team.
        </li>
        <li>We may suspend accounts that break these terms or put other users at risk.</li>
      </ul>
    ),
  },
  {
    id: "inquiries",
    title: "Inquiries and communications",
    content: (
      <p>
        When you submit an inquiry, your contact details and message are shared with the relevant
        developer and Mark Properties advisors so they can respond by phone, WhatsApp, or email.
        Please only submit inquiries you genuinely intend to discuss.
      </p>
    ),
  },
  {
    id: "builders-advertising",
    title: "Builders, advertising, and wallet top-ups",
    content: (
      <ul>
        <li>Builders are responsible for the accuracy and legality of their listings and ads.</li>
        <li>
          Wallet top-ups are made by transfer to the account shown on the Wallet page. The wallet
          is credited only after our team verifies the payment using the amount, transaction ID,
          and screenshot you submit.
        </li>
        <li>
          Submitting a false or duplicate payment proof leads to rejection and may lead to account
          suspension.
        </li>
      </ul>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <ul>
        <li>No false, misleading, or spam listings, inquiries, or reviews.</li>
        <li>No scraping, automated bulk access, or attempts to break the platform&apos;s security.</li>
        <li>No copying or reusing AbadRaho content, images, or branding without permission.</li>
      </ul>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: (
      <p>
        AbadRaho is provided &ldquo;as is&rdquo;. To the extent permitted by law, Mark Properties is
        not liable for losses arising from decisions made using listing information, from a
        developer&apos;s actions or delays, or from temporary unavailability of the site.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    content: (
      <p>
        We may update these terms from time to time. The &ldquo;last updated&rdquo; date at the top
        shows when they last changed; continuing to use AbadRaho after a change means you accept
        the updated terms.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      doc="terms"
      title="Terms & conditions"
      summary={geoContent.terms.summary}
      updated="2026-10-02"
      readingMinutes={4}
      highlights={geoContent.terms.bullets}
      sections={sections}
      faqs={geoContent.terms.intents}
    />
  );
}
