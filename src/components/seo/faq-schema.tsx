import { JsonLd } from "@/components/seo/json-ld";
import { buildFaqSchema } from "@/lib/schema-markup";

export interface FaqItem {
  question: string;
  answer: string;
}

/** Drop this anywhere on a page to inject FAQPage JSON-LD. */
export function FaqSchema({ items }: { items: FaqItem[] }) {
  if (!items.length) return null;
  return <JsonLd data={buildFaqSchema(items)} />;
}
