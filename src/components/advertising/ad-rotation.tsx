"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client/api-fetch";
import type { RotationSlot } from "@/server/services/ad-serving.service";
import {
  SponsoredFeaturedSection,
  SponsoredBannerSection,
  SponsoredContentSection,
} from "@/components/advertising/sponsored-ad-sections";

const VIEWABILITY_THRESHOLD = 0.4; // same threshold as TrackedSection

function fireImpression(ad: RotationSlot) {
  // apiFetch (not raw fetch) — attaches the CSRF header this mutating POST needs.
  void apiFetch(`/api/v1/ads/impression/${ad.campaignId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotKey: ad.slotKey }),
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * Cycles through every campaign sharing a slot's 60-second rotation, in place, for as long as
 * the component stays mounted — spending time proportional to each one's shareSeconds. Bills an
 * impression once per slice-showing, only the first time that slice is confirmed actually
 * visible (never on mount/swap alone) — see the impression route for why the cost itself is
 * always resolved server-side, never trusted from here.
 */
function useAdRotation(rotation: RotationSlot[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isIntersectingRef = useRef(false);
  const firedForRef = useRef<string | null>(null);

  const safeIndex = rotation.length === 0 ? -1 : currentIndex % rotation.length;
  const currentAd = safeIndex >= 0 ? rotation[safeIndex] : null;

  const currentAdRef = useRef(currentAd);
  currentAdRef.current = currentAd;

  const maybeFire = useCallback(() => {
    const ad = currentAdRef.current;
    if (!ad || !isIntersectingRef.current) return;
    const key = `${ad.campaignId}:${ad.slotKey}`;
    if (firedForRef.current === key) return; // already billed this exact showing
    firedForRef.current = key;
    fireImpression(ad);
  }, []);

  // Whenever the shown slice changes, check immediately — covers the case where the ad slot was
  // already on-screen (visitor hasn't scrolled) when the swap happened, so the observer callback
  // itself won't fire again on its own since the intersection ratio didn't change.
  useEffect(() => {
    maybeFire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAd?.campaignId, currentAd?.slotKey, maybeFire]);

  // Kept alive for the component's whole lifetime — must keep observing across every slice swap,
  // unlike a one-shot "seen once" tracker.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isIntersectingRef.current = Boolean(entry?.isIntersecting);
        if (isIntersectingRef.current) maybeFire();
      },
      { threshold: VIEWABILITY_THRESHOLD }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [maybeFire]);

  // Rotation timer — setTimeout per slice, since slices have different durations (not
  // setInterval). Pauses while the tab is backgrounded so a hidden tab doesn't burn through
  // rotation laps or bill for slices no one is looking at; resumes with a fresh full-length
  // slice rather than tracking exact remaining time, which is an acceptable simplification here.
  useEffect(() => {
    if (rotation.length <= 1) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const clear = () => {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const schedule = () => {
      clear();
      if (document.visibilityState === "hidden") return;
      const seconds = currentAdRef.current?.shareSeconds ?? 5;
      timeoutId = setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % rotation.length);
      }, seconds * 1000);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") schedule();
      else clear();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [rotation.length, currentIndex]);

  return { currentAd, containerRef };
}

export function RotatingFeaturedSection({ rotation }: { rotation: RotationSlot[] }) {
  const { currentAd, containerRef } = useAdRotation(rotation);
  if (rotation.length === 0) return null;
  return (
    <div ref={containerRef}>
      <SponsoredFeaturedSection ad={currentAd} />
    </div>
  );
}

export function RotatingBannerSection({ rotation }: { rotation: RotationSlot[] }) {
  const { currentAd, containerRef } = useAdRotation(rotation);
  if (rotation.length === 0) return null;
  return (
    <div ref={containerRef}>
      <SponsoredBannerSection ad={currentAd} />
    </div>
  );
}

export function RotatingContentSection({ rotation }: { rotation: RotationSlot[] }) {
  const { currentAd, containerRef } = useAdRotation(rotation);
  if (rotation.length === 0) return null;
  return (
    <div ref={containerRef}>
      <SponsoredContentSection ad={currentAd} />
    </div>
  );
}
