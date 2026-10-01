"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/client/api-fetch";

/** Stores agent attribution when visitor lands with ?ref=AGT-xxxxx. */
export function AgentAttributionTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref")?.trim();
    if (!ref) return;

    void apiFetch("/api/v1/broker/attribution", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_code: ref }),
      keepalive: true,
    }).catch(() => undefined);
  }, [searchParams]);

  return null;
}
