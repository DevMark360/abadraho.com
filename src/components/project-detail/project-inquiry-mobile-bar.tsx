"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProjectInquiryMobileBar({
  projectName,
  priceLabel,
}: {
  projectName: string;
  priceLabel: string;
}) {
  const [showBar, setShowBar] = useState(true);

  useEffect(() => {
    const target = document.getElementById("inquiry");
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowBar(!entry.isIntersecting);
      },
      {
        threshold: 0.12,
        rootMargin: "-72px 0px -64px 0px",
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  function scrollToInquiry() {
    const target = document.getElementById("inquiry");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      const firstField = target.querySelector<HTMLElement>(
        "input:not([type='hidden']):not([aria-hidden='true']), textarea, select"
      );
      firstField?.focus({ preventScroll: true });
    }, 400);
  }

  if (!showBar) return null;

  return (
    <div
      className={cn(
        "project-inquiry-mobile-bar fixed inset-x-0 bottom-0 z-[39] border-t border-zinc-200",
        "bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden"
      )}
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
      }}
      role="region"
      aria-label="Inquire about this project"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">{projectName}</p>
          <p className="text-xs text-zinc-500">
            From <span className="font-semibold text-zinc-800">{priceLabel}</span>
          </p>
        </div>
        <Button
          type="button"
          variant="accent"
          size="lg"
          className="shrink-0 gap-2 px-5"
          onClick={scrollToInquiry}
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
          Inquire now
        </Button>
      </div>
    </div>
  );
}
