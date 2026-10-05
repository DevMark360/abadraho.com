import { CompareView } from "@/components/compare/compare-view";
import { parseCompareUrlIds } from "@/lib/compare-url";
import { getSession } from "@/lib/session";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Compare Off-plan Projects & Payment Plans",
  description:
    "Compare off-plan projects side by side — payment plans, prices, handover timelines, and unit details on AbadRaho.",
  path: "/compare",
});

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const initialUrlIds = parseCompareUrlIds(params.ids);
  return (
    <CompareView
      initialLoggedIn={Boolean(session)}
      initialUrlIds={initialUrlIds}
    />
  );
}
