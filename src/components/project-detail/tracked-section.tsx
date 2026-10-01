"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { trackActivity } from "@/lib/client/activity-log";

/**
 * Fires one "did they actually see this section" event the first time it's ≥40% within the
 * viewport — cheaper and more honest than assuming a section was seen just because it's in the
 * DOM. Wraps children in a plain div; no visual effect.
 */
export function TrackedSection({
  section,
  projectId,
  children,
}: {
  section: string;
  projectId: number;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (loading || firedRef.current) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (firedRef.current) return;
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        firedRef.current = true;
        observer.disconnect();
        trackActivity(
          {
            objective: "project_section_seen",
            description: `Viewed ${section} section`,
            subjectType: "App\\Models\\Project",
            subjectId: projectId,
            logTable: "projects",
            properties: { section },
          },
          Boolean(user)
        );
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, user, projectId, section]);

  return <div ref={ref}>{children}</div>;
}
