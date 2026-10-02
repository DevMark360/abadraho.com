import Link from "next/link";
import { GeoPageSummary } from "@/components/marketing/geo-page-summary";
import {
  PublicPage,
  PublicPageBody,
  PublicPageHeader,
} from "@/components/layout/public-page-layout";
import { geoContent } from "@/config/geo-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Terms & conditions",
  description:
    "Read AbadRaho terms and conditions for browsing listings, submitting inquiries, and using our off-plan property platform.",
  path: "/terms-conditions",
});

export default function TermsPage() {
  return (
    <PublicPage>
      <PublicPageHeader
        title="Terms & conditions"
        subtitle={geoContent.terms.summary}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Terms" },
        ]}
      />

      <PublicPageBody className="max-w-3xl">
        <GeoPageSummary
          variant="chips"
          bullets={geoContent.terms.bullets}
          factsToggleLabel="Key points"
          collapseSummaryOnMobile={false}
        />

        <div className="prose prose-lg prose-zinc mt-8 max-w-2xl prose-headings:tracking-tight prose-a:text-brand">
          <h2>Platform use</h2>
          <p>
            Use of AbadRaho is subject to these terms. By browsing listings, submitting
            inquiries, or creating an account you agree to our data handling and brokerage
            policies operated by Mark Properties. See our{" "}
            <Link href="/privacy-policy">privacy policy</Link> for how we handle your data.
          </p>

          <h2>Listing accuracy</h2>
          <p>
            Project details, prices, and payment plans are supplied by developers and may
            change without notice. Always confirm final terms directly with the project
            owner before making a financial commitment.
          </p>

          <h2>Inquiries &amp; communications</h2>
          <p>
            When you submit an inquiry, your contact details may be shared with the
            relevant developer and Mark Properties advisors so we can respond to your
            request.
          </p>

          <h2>Contact</h2>
          <p>
            For questions about these terms, use the{" "}
            <Link href="/contact">contact form</Link> or email{" "}
            <a href="mailto:enquiry@abadraho.com">enquiry@abadraho.com</a>.
          </p>
        </div>
      </PublicPageBody>
    </PublicPage>
  );
}
