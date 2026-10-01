import { redirect } from "next/navigation";

/** Legacy /projects/{slug} → v2 /project/{slug} */
export default async function ProjectsSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/project/${slug}`);
}
