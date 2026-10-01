import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin, PartyPopper } from "lucide-react";
import { PublicPage, PublicPageBody } from "@/components/layout/public-page-layout";
import { listPublicEvents } from "@/server/services/event.service";
import { eventTypeLabel, isEventType } from "@/lib/event-status";
import { buildPageMetadata } from "@/lib/seo";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Events",
  description:
    "Upcoming project launches, open houses, and marketing events from builders across abadraho.com.",
  path: "/events",
});

function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    date
  );
}

export default async function EventsPage() {
  const events = await listPublicEvents();

  return (
    <PublicPage>
      <div className="border-b border-zinc-200 bg-white">
        <div className={cn(designTw.publicContainer, "py-4")}>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-zinc-500">
            <Link href="/" className="hover:text-zinc-900">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" aria-hidden />
            <span className="font-medium text-zinc-900">Events</span>
          </nav>
        </div>
      </div>

      <PublicPageBody>
        {events.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
              <PartyPopper className="h-7 w-7 text-zinc-400" aria-hidden />
            </div>
            <h2 className="mt-4 text-base font-semibold text-zinc-900">No events yet</h2>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
              Check back soon — builders regularly announce launches and open houses here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
            {events.map((event) => (
              <article
                key={event.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 ease-in-out hover:border-zinc-300 hover:shadow-md"
              >
                <Link href={`/events/${event.slug}`} className="flex flex-1 flex-col">
                  <div className="relative aspect-video overflow-hidden bg-zinc-100">
                    {event.coverImage ? (
                      <Image
                        src={event.coverImage}
                        alt={event.title}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
                        <PartyPopper className="h-10 w-10 text-zinc-300" aria-hidden />
                      </div>
                    )}

                    <div className="absolute left-2.5 top-2.5">
                      <span className="rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-zinc-800 shadow-sm">
                        {isEventType(event.eventType)
                          ? eventTypeLabel(event.eventType)
                          : event.eventType}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-2 border-t border-zinc-100 bg-zinc-50/40 p-4">
                    <h2 className="line-clamp-1 text-base font-bold text-zinc-900 group-hover:text-brand">
                      {event.title}
                    </h2>

                    <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
                      <CalendarDays className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                      <span className="line-clamp-1">{formatEventDate(event.startDate)}</span>
                    </p>

                    {event.venue && (
                      <p className="flex items-center gap-1.5 text-sm text-zinc-600">
                        <MapPin className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                        <span className="line-clamp-1">{event.venue}</span>
                      </p>
                    )}

                    {event.projectName && (
                      <p className="mt-auto pt-1 text-xs font-medium text-zinc-400">
                        {event.projectName}
                      </p>
                    )}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </PublicPageBody>
    </PublicPage>
  );
}
