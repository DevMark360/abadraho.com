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
  title: "Privacy policy",
  description:
    "How AbadRaho collects, uses, shares, and protects your personal information, and how to access or delete your data.",
  path: "/privacy-policy",
});

const LAST_UPDATED = "2 October 2026";

export default function PrivacyPolicyPage() {
  return (
    <PublicPage>
      <PublicPageHeader
        title="Privacy policy"
        subtitle={geoContent.privacy.summary}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Privacy policy" },
        ]}
      />

      <PublicPageBody className="max-w-3xl">
        <GeoPageSummary
          variant="chips"
          bullets={geoContent.privacy.bullets}
          factsToggleLabel="Key points"
          collapseSummaryOnMobile={false}
        />

        <div className="prose prose-lg prose-zinc mt-8 max-w-2xl prose-headings:tracking-tight prose-a:text-brand">
          <p className="text-sm text-zinc-500">Last updated: {LAST_UPDATED}</p>

          <p>
            AbadRaho (abadraho.com) is an off-plan property platform operated by Mark Properties
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;). This policy explains what personal information we
            collect, why we collect it, who we share it with, and the choices you have. By using
            AbadRaho you agree to this policy and our{" "}
            <Link href="/terms-conditions">terms &amp; conditions</Link>.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Account details</strong> — your name, email address, password (stored only
              in encrypted, hashed form), and optionally your WhatsApp / mobile number, city,
              address, and profile information.
            </li>
            <li>
              <strong>Google sign-in</strong> — if you sign in with Google, we receive your name,
              email address, and profile picture from Google. We do not receive your Google
              password.
            </li>
            <li>
              <strong>Inquiries and contact forms</strong> — the details you submit, such as your
              name, phone number, email, and message, and the project you are asking about.
            </li>
            <li>
              <strong>Activity on the site</strong> — projects you view, save to your wishlist, or
              compare, and searches and filters you use, so we can show relevant listings and
              improve the platform. We also record technical data such as IP address, browser,
              and device type for security and fraud prevention.
            </li>
            <li>
              <strong>Builders and agents</strong> — business details for your listings and, for
              advertising wallet top-ups, the payment amount, transaction ID, and payment
              screenshot you upload.
            </li>
          </ul>

          <h2>How we use your information</h2>
          <ul>
            <li>To create and manage your account and keep you signed in.</li>
            <li>
              To verify your phone number — we send a one-time code to your WhatsApp through
              Meta&apos;s WhatsApp Business Platform.
            </li>
            <li>To send account emails such as email verification and password resets.</li>
            <li>To respond to your inquiries and connect you with the right developer or advisor.</li>
            <li>To recommend projects and improve search, listings, and site features.</li>
            <li>To verify payments, prevent fraud and abuse, and keep the platform secure.</li>
            <li>To meet legal, accounting, and regulatory obligations.</li>
          </ul>

          <h2>How we share information</h2>
          <p>We do not sell your personal information. We share it only:</p>
          <ul>
            <li>
              With the <strong>developer / builder</strong> of a project you inquire about, and
              with <strong>Mark Properties advisors and partner agents</strong> handling your
              request.
            </li>
            <li>
              With <strong>service providers</strong> that help us run the platform — our hosting
              provider, email delivery, Meta (WhatsApp verification codes), and Google (sign-in) —
              only as needed to provide those services.
            </li>
            <li>When required by law, or to protect the rights and safety of our users and us.</li>
          </ul>

          <h2>Cookies and local storage</h2>
          <p>
            We use essential cookies to keep you signed in, protect forms against misuse, and
            remember an agent referral link you followed. Your browser&apos;s local storage keeps
            items such as your compare list and recently viewed projects. We do not use
            third-party advertising cookies. You can clear cookies in your browser at any time,
            but you may be signed out and some features may not work.
          </p>

          <h2>Data retention and security</h2>
          <p>
            We keep your information while your account is active and as long as needed for the
            purposes above, including legal and accounting requirements. We protect it with
            measures such as encrypted connections (HTTPS), hashed passwords, and restricted
            access to payment documents. No online service can be completely secure, so please
            use a strong, unique password.
          </p>

          <h2>Your choices and rights</h2>
          <ul>
            <li>View and update your profile details from your account page.</li>
            <li>
              Ask us for a copy of your data, to correct it, or to delete your account by
              emailing <a href="mailto:enquiry@abadraho.com">enquiry@abadraho.com</a>.
            </li>
            <li>
              If you signed in with Google, you can also remove AbadRaho&apos;s access from your
              Google Account settings.
            </li>
          </ul>

          <h2>Children</h2>
          <p>
            AbadRaho is intended for adults. We do not knowingly collect personal information
            from children under 18.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this policy from time to time. The &ldquo;last updated&rdquo; date above
            shows when it last changed; significant changes will be highlighted on the site.
          </p>

          <h2>Contact</h2>
          <p>
            For privacy questions or requests, use the{" "}
            <Link href="/contact">contact form</Link> or email{" "}
            <a href="mailto:enquiry@abadraho.com">enquiry@abadraho.com</a>.
          </p>
        </div>
      </PublicPageBody>
    </PublicPage>
  );
}
