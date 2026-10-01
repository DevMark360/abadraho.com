"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Notification = {
  id: number;
  recipientType: string;
  recipientId: number;
  actorType: string | null;
  actorId: number | null;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "same-origin" });
      if (!res.ok) {
        setItems([]);
        setUnreadCount(0);
        return;
      }
      const j = await res.json();
      setItems(j.items ?? []);
      setUnreadCount(j.unreadCount ?? 0);
    } catch {
      // Ignore — will retry on next poll
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    load();
  }, [load]);

  // SSE connection
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;

    function connect() {
      try {
        es = new EventSource("/api/notifications/stream", { withCredentials: true });
        eventSourceRef.current = es;

        es.onopen = () => {
          retryCount = 0; // Reset on successful connection
        };

        es.onmessage = (event) => {
          try {
            const n = JSON.parse(event.data) as Notification;
            setItems((prev) => [n, ...prev].slice(0, 50));
            setUnreadCount((c) => c + 1);
          } catch {
            // Ignore malformed events
          }
        };

        es.onerror = () => {
          es?.close();
          eventSourceRef.current = null;
          // Exponential backoff: 2s, 4s, 8s, max 30s
          const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
          retryCount++;
          reconnectTimer = setTimeout(connect, delay);
        };
      } catch {
        // EventSource creation failed
        const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
        retryCount++;
        reconnectTimer = setTimeout(connect, delay);
      }
    }

    connect();

    return () => {
      es?.close();
      eventSourceRef.current = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const markRead = useCallback(
    async (id: number) => {
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ id }),
        });
        setItems((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Ignore
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ all: true }),
      });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  }, []);

  return { items, unreadCount, loading, markRead, markAllRead, refresh: load };
}

export type { Notification };
