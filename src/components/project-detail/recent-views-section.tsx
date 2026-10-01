import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import {
  GUEST_COOKIE,
  getUserRecentViews,
  parseGuestRecentIds,
} from "@/server/services/recent-view.service";
import { listProjectsByIds } from "@/server/services/project.service";
import { ProjectCard } from "@/components/projects/project-card";
import { uniqueById } from "@/lib/unique-by-id";
import type { ProjectListItem } from "@/types/project";

export async function RecentViewsSection({
  excludeProjectId,
}: {
  excludeProjectId?: number;
}) {
  const session = await getSession();
  let projects;

  if (session) {
    projects = uniqueById(await getUserRecentViews(session.id, excludeProjectId));
  } else {
    const jar = await cookies();
    const ids = parseGuestRecentIds(jar.get(GUEST_COOKIE)?.value).filter(
      (id) => id !== excludeProjectId
    );
    projects = uniqueById(await listProjectsByIds(ids));
  }

  if (!projects?.length) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Recently viewed</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </section>
  );
}
