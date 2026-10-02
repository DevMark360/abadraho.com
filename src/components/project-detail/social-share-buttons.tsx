"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Facebook, Link2, Linkedin, MessageCircle, Share2, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Network = "whatsapp" | "facebook" | "linkedin" | "twitter";

const NETWORKS: Array<{ id: Network; label: string; icon: typeof Twitter }> = [
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "twitter", label: "X (Twitter)", icon: Twitter },
];

/**
 * One "Share" button: the phone's native share sheet when available, otherwise a small
 * menu (WhatsApp first — the most used channel for property links in Pakistan).
 */
export function SocialShareButtons({
  projectName,
  slug,
}: {
  projectName: string;
  slug: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pageUrl = () =>
    typeof window !== "undefined"
      ? window.location.href
      : `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/project/${slug}`;

  const share = (network: Network) => {
    const url = encodeURIComponent(pageUrl());
    const text = encodeURIComponent(projectName);
    const links: Record<Network, string> = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
    };
    window.open(links[network], "_blank", "noopener,noreferrer,width=600,height=560");
    setOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked — leave the menu open so another option can be used
    }
  };

  const onShareClick = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: projectName, url: pageUrl() });
        return;
      } catch {
        // cancelled or unsupported — fall back to the menu
      }
    }
    setOpen((v) => !v);
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
        onClick={() => void onShareClick()}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Share2 className="h-4 w-4" aria-hidden />
        Share
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-52 rounded-clay border border-white/80 bg-clay-surface p-1.5 shadow-clay"
        >
          {NETWORKS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              onClick={() => share(id)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-clay-well"
            >
              <Icon className="h-4 w-4 text-zinc-500" aria-hidden />
              {label}
            </button>
          ))}
          <div className="my-1 h-px bg-clay-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => void copyLink()}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-clay-well",
              copied ? "text-emerald-700" : "text-zinc-700"
            )}
          >
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4 text-zinc-500" aria-hidden />}
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
