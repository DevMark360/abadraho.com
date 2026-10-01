import { sanitizeCmsHtml } from "@/lib/sanitize-html";

type SanitizedHtmlProps = {
  html: string | null | undefined;
  className?: string;
  as?: "div" | "article";
};

export function SanitizedHtml({
  html,
  className,
  as: Tag = "div",
}: SanitizedHtmlProps) {
  const safe = sanitizeCmsHtml(html);
  if (!safe) return null;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}
