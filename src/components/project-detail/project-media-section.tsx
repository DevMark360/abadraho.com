import { Play } from "lucide-react";
import type { ProjectVideoItem } from "@/types/project-detail";

export function ProjectMediaSection({
  projectVideoEmbed,
  projectVideoUrl,
  videos,
}: {
  projectVideoEmbed: string | null;
  projectVideoUrl: string | null;
  videos: ProjectVideoItem[];
}) {
  const hasVideo = Boolean(projectVideoEmbed || projectVideoUrl || videos.length);
  if (!hasVideo) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">Property video</h2>

      {projectVideoEmbed && (
        <div className="mb-6 aspect-video overflow-hidden rounded-xl bg-zinc-900">
          <iframe
            src={projectVideoEmbed}
            title="Project video"
            className="h-full w-full"
            allowFullScreen
          />
        </div>
      )}

      {!projectVideoEmbed && projectVideoUrl && (
        <a
          href={projectVideoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
        >
          <Play className="h-4 w-4" />
          Watch project video
        </a>
      )}

      {videos.length > 0 && (
        <ul className="mb-6 space-y-2">
          {videos.map((v) => (
            <li key={v.id}>
              <a
                href={v.embedUrl ?? v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Play className="h-4 w-4" />
                {v.title}
              </a>
            </li>
          ))}
        </ul>
      )}

    </section>
  );
}
