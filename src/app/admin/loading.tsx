import { LoadingState } from "@/components/ui/loading-state";

/**
 * Private pages keep a loading state while navigating. Public pages have none on purpose: a
 * root loading.tsx streams every page, which puts ~150 KB of script data ahead of the page's
 * HTML (checkers that read only the first ~200 KB then see a near-empty page) and makes
 * notFound() answer 200 instead of 404.
 */
export default function Loading() {
  return <LoadingState fullHeight className="py-16" />;
}
