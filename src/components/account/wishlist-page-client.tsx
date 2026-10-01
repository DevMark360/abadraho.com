"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, HeartOff, Search, Sparkles } from "lucide-react";
import { AccountBackLink } from "@/components/account/account-back-link";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { HomeEmptyState } from "@/components/marketing/home-ui";
import { getWishlist } from "@/lib/client/wishlist-store";
import { loadServerWishlistIds, toggleWishlist } from "@/lib/client/wishlist-sync";
import type { ProjectListItem } from "@/types/project";

export function WishlistPageClient() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const meRes = await fetch("/api/v1/auth/me", { credentials: "same-origin" });
      const me = await meRes.json();
      const loggedIn = Boolean(me.user);
      setSignedIn(loggedIn);

      if (loggedIn) {
        const res = await fetch("/api/v1/wishlist", { credentials: "same-origin" });
        const json = await res.json();
        setProjects(res.ok ? (json.projects ?? []) : []);
        setLocalOnly(false);
        await loadServerWishlistIds();
      } else {
        const local = getWishlist();
        if (!local.length) {
          setProjects([]);
          setLocalOnly(false);
        } else {
          const res = await fetch("/api/v1/projects/by-ids", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: local.map((entry) => entry.id) }),
          });
          const json = await res.json();
          setProjects(json.data ?? []);
          setLocalOnly(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onWishlistChange() {
      void load();
    }
    window.addEventListener("abadraho-wishlist", onWishlistChange);
    return () => window.removeEventListener("abadraho-wishlist", onWishlistChange);
  }, [load]);

  async function remove(project: ProjectListItem) {
    await toggleWishlist(project.id, project.slug);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
  }

  async function clearAll() {
    for (const project of projects) {
      await toggleWishlist(project.id, project.slug);
    }
    setProjects([]);
  }

  const count = projects.length;

  return (
    <div className="mx-auto w-full max-w-7xl pb-8">
        <AccountBackLink />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">
              <Heart className="h-7 w-7 text-rose-500" aria-hidden />
              Wishlist
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              {signedIn
                ? "Projects you saved — synced to your account across devices."
                : localOnly
                  ? "Saved on this browser. Sign in to keep your list when you switch devices."
                  : "Save projects while browsing, then compare prices and payment plans later."}
            </p>
          </div>

          {count > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
                {count} saved
              </span>
              <button
                type="button"
                onClick={() => void clearAll()}
                className="text-sm font-medium text-zinc-600 underline hover:text-zinc-900"
              >
                Clear all
              </button>
            </div>
          ) : null}
        </div>

        {!signedIn && localOnly ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            <span className="font-semibold">Sign in to sync your wishlist</span>
            {" — "}
            <Link href="/login?ref=/account/wishlist" className="font-medium underline">
              Create an account or log in
            </Link>{" "}
            so saved projects follow you on every device.
          </div>
        ) : null}

        {!signedIn && !localOnly && !loading ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700">
            Browsing as a guest? Tap the{" "}
            <Heart className="mx-0.5 inline h-4 w-4 text-rose-500" aria-hidden />
            heart on any listing.{" "}
            <Link href="/login?ref=/account/wishlist" className="font-medium underline">
              Sign in
            </Link>{" "}
            to save permanently.
          </div>
        ) : null}

        {loading ? (
          <LoadingState size="lg" className="mt-10" label="Loading your wishlist…" />
        ) : null}

        {!loading && count === 0 ? (
          <div className="mt-8 space-y-6">
            <HomeEmptyState
              title="No saved projects yet"
              description="When you find a development you like, tap the heart on a listing card or project page. Your shortlist will appear here so you can compare options at your own pace."
              icon={Heart}
              action={
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <Button asChild variant="accent">
                    <Link href="/projects">
                      <Search className="h-4 w-4" aria-hidden />
                      Browse listings
                    </Link>
                  </Button>
                  {!signedIn ? (
                    <Button asChild variant="outline">
                      <Link href="/login?ref=/account/wishlist">Sign in to sync</Link>
                    </Button>
                  ) : null}
                </div>
              }
            />

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Save while browsing",
                  text: "Use the heart icon on listing cards — no need to open each project first.",
                },
                {
                  title: "Compare later",
                  text: "Add projects to Compare from the same card to check payment plans side by side.",
                },
                {
                  title: "Pick up where you left off",
                  text: signedIn
                    ? "Your wishlist stays linked to your account on any device."
                    : "Sign in once and we merge anything you saved on this browser.",
                },
              ].map((tip) => (
                <div
                  key={tip.title}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                    <Sparkles className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">{tip.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{tip.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!loading && count > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {projects.map((project) => (
              <div key={project.id} className="group/card relative">
                <ProjectCard project={project} />
                <button
                  type="button"
                  onClick={() => void remove(project)}
                  className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-rose-600 shadow-md ring-1 ring-rose-100 transition hover:bg-white hover:text-rose-700"
                  aria-label={`Remove ${project.name} from wishlist`}
                >
                  <HeartOff className="h-3.5 w-3.5" aria-hidden />
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
    </div>
  );
}
