import { PrismaClient } from "@prisma/client";

function resolveProjectDocuments(projectId, projectDoc) {
  if (!projectDoc?.trim()) return [];
  return projectDoc
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const filename = decodeURIComponent(entry.split("/").pop() ?? entry);
      return { filename, projectId, projectDoc };
    });
}

const p = new PrismaClient();
const slug = process.argv[2] ?? "saima-arabian-ranches";
const project = await p.project.findFirst({
  where: { slug, isArchive: false },
  select: { id: true, projectDoc: true },
});
console.log("project:", project);
console.log("docs count:", resolveProjectDocuments(project?.id, project?.projectDoc).length);
await p.$disconnect();
