"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { eventTypeLabel, isEventType } from "@/lib/event-status";
import type { PublicEventSummary } from "@/server/services/event.service";

function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
    date
  );
}

function EventPosterTile({ event }: { event: PublicEventSummary }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className={cn(
        "group relative h-[360px] w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl bg-zinc-800 shadow-md ring-1 ring-black/5 transition-transform duration-300",
        "sm:h-[400px] sm:w-[270px]"
      )}
    >
      {event.coverImage ? (
        <Image
          src={event.coverImage}
          alt={event.title}
          width={540}
          height={800}
          unoptimized
          sizes="(max-width: 640px) 240px, 270px"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900">
          <PartyPopper className="h-12 w-12 text-white/30" aria-hidden />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/5" />

      <div className="absolute left-3 top-3">
        <span className="rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-zinc-800 shadow-sm">
          {isEventType(event.eventType) ? eventTypeLabel(event.eventType) : event.eventType}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-accent">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {formatEventDate(event.startDate)}
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-base font-semibold leading-snug text-white">
          {event.title}
        </h3>
        {event.venue && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/70">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="line-clamp-1">{event.venue}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

export function HomeEventsScroller({ events }: { events: PublicEventSummary[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollBy(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.85, 270);
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {events.length > 3 && (
        <button
          type="button"
          onClick={() => scrollBy("left")}
          aria-label="Scroll events left"
          className="absolute -left-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-md backdrop-blur transition hover:bg-white sm:flex md:-left-4"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className={cn(
          "flex items-stretch gap-4 overflow-x-auto scroll-smooth px-1 pb-2 pt-1",
          "snap-x snap-mandatory",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {events.map((event) => (
          <EventPosterTile key={event.id} event={event} />
        ))}
      </div>

      {events.length > 3 && (
        <button
          type="button"
          onClick={() => scrollBy("right")}
          aria-label="Scroll events right"
          className="absolute -right-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-md backdrop-blur transition hover:bg-white sm:flex md:-right-4"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
