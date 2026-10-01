import type { ProjectInfoBlock } from "@/lib/project-info";

export function ProjectHighlightsSection({ info }: { info: ProjectInfoBlock | null }) {
  if (!info) return null;
  const hasHeading = Boolean(info.mainHeading?.trim() || info.subHeading?.trim());
  const bullets = info.bullets.filter(Boolean);
  if (!hasHeading && !bullets.length) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      {info.mainHeading?.trim() && (
        <h2 className="text-lg font-semibold text-zinc-900">{info.mainHeading}</h2>
      )}
      {info.subHeading?.trim() && (
        <p className="mt-1 text-sm text-zinc-600">{info.subHeading}</p>
      )}
      {bullets.length > 0 && (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
