import { PrismaClient } from "@prisma/client";
import { resolveProjectDocuments } from "../src/lib/project-media.ts";

const p = new PrismaClient();
const slug = process.argv[2] ?? "saima-arabian-ranches";
const proj = await p.project.findFirst({
  where: { slug },
  select: { id: true, slug: true, projectDoc: true },
});
console.log("prisma row:", proj);
if (proj) {
  console.log("resolved docs:", resolveProjectDocuments(proj.id, proj.projectDoc));
}
await p.$disconnect();
