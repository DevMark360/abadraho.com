import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { geoContent } from "@/config/geo-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Privacy policy",
  description:
    "AbadRaho privacy policy: what personal data we collect, how it is used and shared, cookies, WhatsApp verification, and how to access or delete your data.",
  keywords: [
    "AbadRaho privacy policy",
    "Mark Properties privacy",
    "property portal data protection Pakistan",
  ],
  path: "/privacy-policy",
});

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    content: (
      <p>
        AbadRaho (abadraho.com) is an off-plan property platform in Pakistan operated by Mark
        Properties (&ldquo;we&rdquo;, &ldquo;us&rdquo;). This policy explains what personal
        information we collect, why, who we share it with, and the choices you have. It applies
        together with our <Link href="/terms-conditions">terms &amp; conditions</Link>.
      </p>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    content: (
      <ul>
        <li>
          <strong>Account details</strong> — your name, email address, password (stored only in
          hashed form), and optionally your WhatsApp / mobile number, city, address, and profile
          information.
        </li>
        <li>
          <strong>Google sign-in</strong> — if you continue with Google, we receive your name,
          email address, and profile picture. We never receive your Google password.
        </li>
        <li>
          <strong>Inquiries and contact forms</strong> — the details you submit, such as your
          name, phone, email, message, and the project you are asking about.
        </li>
        <li>
          <strong>Activity on the site</strong> — projects you view, save, or compare and the
          searches and filters you use. We also record technical data such as IP address,
          browser, and device type for security.
        </li>
        <li>
          <strong>Builders and agents</strong> — business details for your listings and, for
          advertising wallet top-ups, the amount, transaction ID, and payment screenshot you
          upload.
        </li>
      </ul>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use your information",
    content: (
      <ul>
        <li>To create and manage your account and keep you signed in.</li>
        <li>
          To verify your mobile number with a one-time code sent to WhatsApp through Meta&apos;s
          WhatsApp Business Platform.
        </li>
        <li>To send account emails such as email verification and password resets.</li>
        <li>To answer your inquiries and connect you with the right developer or advisor.</li>
        <li>To recommend relevant projects and improve search and listings.</li>
        <li>To verify payments, prevent fraud and abuse, and keep the platform secure.</li>
        <li>To meet legal, accounting, and regulatory obligations.</li>
      </ul>
    ),
  },
  {
    id: "sharing",
    title: "How we share information",
    content: (
      <>
        <p>
          <strong>We do not sell your personal information.</strong> We share it only:
        </p>
        <ul>
          <li>
            With the <strong>developer / builder</strong> of a project you inquire about, and the{" "}
            <strong>Mark Properties advisors and partner agents</strong> handling your request.
          </li>
          <li>
            With <strong>service providers</strong> that run parts of the platform for us —
            hosting, email delivery, Meta (WhatsApp codes), and Google (sign-in) — only as needed.
          </li>
          <li>When required by law, or to protect the rights and safety of our users and us.</li>
        </ul>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    content: (
      <p>
        We use essential cookies to keep you signed in, protect forms against misuse, and
        remember an agent referral link you followed. Your browser&apos;s local storage keeps your
        compare list and recently viewed projects. We do not use third-party advertising cookies.
        Clearing cookies signs you out and may reset these features.
      </p>
    ),
  },
  {
    id: "retention-security",
    title: "Data retention and security",
    content: (
      <p>
        We keep your information while your account is active and as long as needed for the
        purposes above, including legal and accounting requirements. It is protected with
        encrypted connections (HTTPS), hashed passwords, and restricted access to payment
        documents. No online service is perfectly secure, so please use a strong, unique password.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your choices and rights",
    content: (
      <ul>
        <li>Update your profile details any time from your account page.</li>
        <li>
          Ask for a copy of your data, a correction, or deletion of your account by emailing{" "}
          <a href="mailto:enquiry@abadraho.com">enquiry@abadraho.com</a>.
        </li>
        <li>
          If you signed in with Google, you can remove AbadRaho&apos;s access from your Google
          Account settings.
        </li>
      </ul>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <p>
        AbadRaho is intended for adults. We do not knowingly collect personal information from
        anyone under 18.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <p>
        We may update this policy from time to time. The &ldquo;last updated&rdquo; date at the
        top shows when it last changed, and significant changes will be highlighted on the site.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      doc="privacy"
      title="Privacy policy"
      summary={geoContent.privacy.summary}
      updated="2026-10-02"
      readingMinutes={4}
      highlights={geoContent.privacy.bullets}
      sections={sections}
      faqs={geoContent.privacy.intents}
    />
  );
}
