"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { apiFetch } from "@/lib/client/api-fetch";
import { trackActivity } from "@/lib/client/activity-log";
import { trackUserActivity } from "@/lib/client/search-history-track";
import { saveViewedId } from "@/lib/client/viewed-projects";

export function ProjectViewTracker({
  projectId,
  projectName,
}: {
  projectId: number;
  projectName: string;
}) {
  const { user, loading } = useAuth();
  const isLoggedIn = Boolean(user);

  useEffect(() => {
    if (loading) return;

    // Save to localStorage for personalized homepage recommendations
    saveViewedId(projectId);

    void apiFetch("/api/v1/recent-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ projectId }),
      keepalive: true,
    }).catch(() => undefined);

    void trackUserActivity({ projectId }, isLoggedIn);

    trackActivity(
      {
        description: `Viewed project: ${projectName}`,
        objective: "project_view",
        subjectType: "App\\Models\\Project",
        subjectId: projectId,
        logTable: "projects",
      },
      isLoggedIn
    );
  }, [projectId, projectName, isLoggedIn, loading]);

  // Time-on-page: one event when the visitor actually leaves (tab hidden or navigating away),
  // not a repeating timer — no background process, just a single fire-and-forget write.
  useEffect(() => {
    if (loading) return;

    const startedAt = Date.now();
    const sentRef = { current: false };

    const sendDuration = () => {
      if (sentRef.current) return;
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      if (seconds < 3) return; // too short to be a meaningful signal
      sentRef.current = true;
      trackActivity(
        {
          description: `Spent ${seconds}s on project: ${projectName}`,
          objective: "project_time_on_page",
          subjectType: "App\\Models\\Project",
          subjectId: projectId,
          logTable: "projects",
          durationInSecond: seconds,
        },
        isLoggedIn
      );
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") sendDuration();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", sendDuration);

    return () => {
      sendDuration();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", sendDuration);
    };
  }, [projectId, projectName, isLoggedIn, loading]);

  return null;
}
