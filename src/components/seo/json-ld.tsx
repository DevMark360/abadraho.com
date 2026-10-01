type JsonLdNode = Record<string, unknown>;

function escapeJsonLd(json: string): string {
  return json.replace(/</g, "\\u003c");
}

/** Injects Schema.org JSON-LD for crawlers and AI search engines. */
export function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  const payload = Array.isArray(data)
    ? { "@context": "https://schema.org", "@graph": data }
    : { "@context": "https://schema.org", ...data };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escapeJsonLd(JSON.stringify(payload)) }}
    />
  );
}
