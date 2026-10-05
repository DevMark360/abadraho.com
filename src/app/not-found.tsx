import Link from "next/link";
import { PublicPage, PublicPageBody } from "@/components/layout/public-page-layout";
import { Button } from "@/components/ui/button";
import { Illustration3D } from "@/components/ui/illustration-3d";
import { designTw } from "@/config/design-tokens";
import { buildPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const metadata = buildPageMetadata({
  title: "Page not found",
  description: "The page you were looking for could not be found on AbadRaho.",
  noIndex: true,
});

export default function NotFound() {
  return (
    <PublicPage>
      <PublicPageBody className="pt-4 sm:pt-6">
        <div
          className={cn(
            designTw.publicCard,
            "mx-auto flex max-w-2xl flex-col items-center px-6 py-14 text-center sm:py-16"
          )}
        >
          <Illustration3D name="location-pin" size={128} priority />
          <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand-accent">
            404: page not found
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            This address doesn&apos;t exist
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600 sm:text-base">
            The page may have moved, or the link might be mistyped. Let&apos;s get you back to
            finding the right property.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/projects">Browse projects</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Go to home page</Link>
            </Button>
          </div>
        </div>
      </PublicPageBody>
    </PublicPage>
  );
}
