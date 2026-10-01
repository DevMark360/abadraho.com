import DOMPurify from "isomorphic-dompurify";

/** CMS / WYSIWYG HTML — strips scripts, event handlers, and other XSS vectors. */
export function sanitizeCmsHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
    /** Block document-level / section tags that break PDP layout when nested in cards */
    FORBID_TAGS: ["article", "html", "body", "head", "script", "style", "iframe"],
  });
}
