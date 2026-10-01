"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotifications, type Notification } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const TYPE_LABELS: Record<string, string> = {
  assignment_request: "Assignment",
  assignment_decided: "Assignment",
  project_submitted: "Project",
  project_reviewed: "Project",
  inquiry: "Inquiry",
  contact: "Contact",
  review: "Review",
};

export function NotificationBell({ className }: { className?: string }) {
  const { items, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on route change
  useEffect(() => {
    if (!open) return;
    function handleRouteChange() {
      setOpen(false);
    }
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, [open]);

  const handleNotificationClick = useCallback(
    async (n: Notification) => {
      if (!n.isRead) {
        await markRead(n.id);
      }
      setOpen(false);
      if (n.link) {
        router.push(n.link);
      }
    },
    [markRead, router]
  );

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-brand-accent hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-72 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">
                No notifications yet.
              </div>
            ) : (
              items.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "cursor-pointer border-b border-zinc-50 px-4 py-3 transition hover:bg-zinc-50",
                    !n.isRead && "bg-blue-50/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {!n.isRead ? (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    ) : (
                      <span className="mt-1.5 h-2 w-2 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900">{n.title}</p>
                        {TYPE_LABELS[n.type] ? (
                          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                            {TYPE_LABELS[n.type]}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{n.message}</p>
                      <p className="mt-1 text-[11px] text-zinc-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 ? (
            <div className="border-t border-zinc-100 px-4 py-2 text-center">
              <span className="text-xs text-zinc-400">Showing latest {Math.min(items.length, 20)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
