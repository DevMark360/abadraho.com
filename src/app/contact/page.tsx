import {
  PublicPage,
  PublicPageBody,
  PublicPageHeader,
} from "@/components/layout/public-page-layout";
import { ContactForm } from "@/components/marketing/contact-form";
import { ContactInfoPanel } from "@/components/marketing/contact-info-panel";
import { geoContent } from "@/config/geo-content";

export default function ContactPage() {
  return (
    <PublicPage>
      <PublicPageHeader
        title="Contact AbadRaho"
        subtitle={geoContent.contact.summary}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Contact" },
        ]}
      />

      <PublicPageBody>
        <div className="grid gap-8 lg:grid-cols-5">
          <aside className="lg:col-span-2">
            <ContactInfoPanel />
          </aside>
          <ContactForm />
        </div>
      </PublicPageBody>
    </PublicPage>
  );
}
