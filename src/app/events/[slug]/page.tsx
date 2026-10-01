import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Building2, Users, PartyPopper } from "lucide-react";
import {
  PublicPage,
  PublicPageBody,
  PublicPageHeader,
} from "@/components/layout/public-page-layout";
import { Button } from "@/components/ui/button";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";
import { getPublicEventBySlug } from "@/server/services/event.service";
import { eventTypeLabel, isEventType } from "@/lib/event-status";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short" }).format(date);
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) return buildPageMetadata({ title: "Event not found", path: `/events/${slug}` });
  return buildPageMetadata({
    title: event.title,
    description: event.description?.slice(0, 160) || undefined,
    path: `/events/${event.slug}`,
    image: event.coverImage ?? undefined,
  });
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
        <Icon className="h-4 w-4 text-zinc-600" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-zinc-900">{children}</div>
      </div>
    </div>
  );
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();

  const typeLabel = isEventType(event.eventType) ? eventTypeLabel(event.eventType) : event.eventType;

  return (
    <PublicPage>
      <PublicPageHeader
        title={event.title}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Events", href: "/events" },
          { label: event.title },
        ]}
      />

      <PublicPageBody>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className={cn(designTw.publicCard, "overflow-hidden lg:col-span-2")}>
            <div className="relative aspect-video w-full bg-zinc-100">
              {event.coverImage ? (
                <Image
                  src={event.coverImage}
                  alt={event.title}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
                  <PartyPopper className="h-14 w-14 text-zinc-300" aria-hidden />
                </div>
              )}
              <div className="absolute left-3 top-3">
                <span className="rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-zinc-800 shadow-sm">
                  {typeLabel}
                </span>
              </div>
            </div>

            {event.description && (
              <div className="p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  About this event
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-zinc-700">
                  {event.description}
                </p>
              </div>
            )}
          </div>

          <aside
            className={cn(
              designTw.publicCard,
              "h-fit space-y-5 p-5 lg:sticky lg:top-4 lg:self-start"
            )}
          >
            <InfoRow icon={CalendarDays} label="Date & time">
              {formatEventDate(event.startDate)}
              {event.endDate && (
                <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                  until {formatEventDate(event.endDate)}
                </span>
              )}
            </InfoRow>

            {event.venue && (
              <>
                <div className="border-t border-zinc-100" />
                <InfoRow icon={MapPin} label="Venue">
                  {event.venue}
                </InfoRow>
              </>
            )}

            {event.projectName && (
              <>
                <div className="border-t border-zinc-100" />
                <InfoRow icon={Building2} label="Project">
                  {event.projectSlug ? (
                    <Link
                      href={`/project/${event.projectSlug}`}
                      className="text-brand hover:underline"
                    >
                      {event.projectName}
                    </Link>
                  ) : (
                    event.projectName
                  )}
                </InfoRow>
              </>
            )}

            {event.builderName && (
              <>
                <div className="border-t border-zinc-100" />
                <InfoRow icon={Users} label="Hosted by">
                  {event.builderName}
                </InfoRow>
              </>
            )}

            {event.projectSlug && (
              <Button asChild className={cn(designTw.btnPrimary, "w-full")}>
                <Link href={`/project/${event.projectSlug}`}>View project</Link>
              </Button>
            )}
          </aside>
        </div>
      </PublicPageBody>
    </PublicPage>
  );
}
