import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BuilderPublicPage } from "@/components/builder/builder-public-page";
import { builderPublicPath } from "@/config/builder-pages";
import { buildPageMetadata } from "@/lib/seo";
import { getSession } from "@/lib/session";
import { getBuilderPageData } from "@/server/services/builder-page.service";

export const dynamicParams = true;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const session = await getSession();
  const data = await getBuilderPageData(slug, session?.id);

  if (!data) {
    return buildPageMetadata({
      title: "Builder not found",
      path: builderPublicPath(slug),
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${data.profile.fullName} — Developer Profile`,
    description: data.description,
    keywords: [
      data.profile.fullName,
      `${data.profile.fullName} projects`,
      "off-plan developer Pakistan",
      "AbadRaho builder",
    ],
    path: builderPublicPath(slug),
  });
}

export default async function BuilderProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getSession();
  const data = await getBuilderPageData(slug, session?.id);
  if (!data) notFound();

  return (
    <AppShell>
      <BuilderPublicPage data={data} />
    </AppShell>
  );
}
