import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageSchema } from "@/lib/schema-markup";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Contact Us: Off-plan Property Inquiries",
  description:
    "Get in touch with AbadRaho for property inquiries, investment guidance, and support for off-plan buyers in Pakistan.",
  path: "/contact",
});

export default function ContactLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd
        data={buildWebPageSchema({
          name: "Contact AbadRaho",
          description:
            "Get in touch with AbadRaho for property inquiries, investment guidance, and support for off-plan buyers in Pakistan.",
          path: "/contact",
          type: "ContactPage",
        })}
      />
      {children}
    </>
  );
}
