import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, PartyPopper } from "lucide-react";
import { Illustration3D } from "@/components/ui/illustration-3d";
import {
  PublicPage,
  PublicPageBody,
  PublicPageHeader,
} from "@/components/layout/public-page-layout";
import { Button } from "@/components/ui/button";
import { listPublicEvents } from "@/server/services/event.service";
import { eventTypeLabel, isEventType } from "@/lib/event-status";
import { buildPageMetadata } from "@/lib/seo";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Property Launches & Builder Events in Karachi",
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
      <PublicPageHeader
        title="Events"
        subtitle="Project launches, open houses, and site visits from builders on AbadRaho."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Events" },
        ]}
        aside={
          <div>
            <p className="text-3xl font-bold tabular-nums text-zinc-900">{events.length}</p>
            <p className="text-sm text-zinc-500">
              {events.length === 1 ? "event listed" : "events listed"}
            </p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="/projects">Browse projects</Link>
            </Button>
          </div>
        }
      />

      <PublicPageBody>
        {events.length === 0 ? (
          <div className={cn(designTw.publicCard, "flex flex-col items-center px-6 py-14 text-center")}>
            <Illustration3D name="calendar" size={112} />
            <h2 className="mt-4 text-lg font-semibold text-zinc-900">No upcoming events right now</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
              Builders announce launches and open houses here. Meanwhile, browse live projects or
              ask our advisors about upcoming launches.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/projects">Browse projects</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">Ask an advisor</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
            {events.map((event) => (
              <article
                key={event.id}
                className="group relative flex flex-col overflow-hidden rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-clay-hover"
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
