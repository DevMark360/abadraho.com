"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminSelect } from "@/components/admin/admin-select";
import {
  AdminDbAlert,
  AdminPageToolbar,
  AdminPagination,
  adminCard,
  adminTableHead,
} from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";
import { fmtDate } from "@/components/admin/admin-search-history-format";
import {
  EVENT_STATUSES,
  eventStatusLabel,
  eventTypeLabel,
  isEventType,
  type EventStatus,
} from "@/lib/event-status";
import { cn } from "@/lib/utils";

const PER_PAGE = 25;

type Row = {
  id: number;
  title: string;
  eventType: string;
  status: EventStatus;
  startDate: string;
  venue: string | null;
  createdAt: string | null;
  builder: { id: number; fullName: string } | null;
  project: { id: number; name: string } | null;
};

function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        status === "approved" && "bg-emerald-50 text-emerald-700",
        status === "pending" && "bg-amber-50 text-amber-700",
        status === "rejected" && "bg-red-50 text-red-700"
      )}
    >
      {eventStatusLabel(status)}
    </span>
  );
}

export function AdminEventsClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [isFullStaff, setIsFullStaff] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("perPage", String(PER_PAGE));
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/events?${params}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? json.message ?? "Failed to load");
      setItems([]);
      setTotal(0);
    } else {
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
      setIsFullStaff(Boolean(json.isFullStaff));
    }
    setLoading(false);
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number) {
    if (!confirm("Delete this event?")) return;
    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total}>
        <AdminCan module="events" action="add">
          <Button asChild className="gap-1.5">
            <Link href="/admin/events/create">
              <Plus className="h-4 w-4" />
              Add event
            </Link>
          </Button>
        </AdminCan>
      </AdminPageToolbar>

      <div className={`${adminCard} p-4`}>
        <label className="block max-w-xs text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Status</span>
          <AdminSelect
            layout="field"
            value={status}
            onChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
            placeholder="All statuses"
            options={[
              { value: "", label: "All statuses" },
              ...EVENT_STATUSES.map((value) => ({ value, label: eventStatusLabel(value) })),
            ]}
          />
        </label>
      </div>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>Title</th>
              <th className={adminTableHead}>Type</th>
              <th className={adminTableHead}>Project</th>
              {isFullStaff && <th className={adminTableHead}>Builder</th>}
              <th className={adminTableHead}>Venue</th>
              <th className={adminTableHead}>Start date</th>
              <th className={adminTableHead}>Status</th>
              <th className={adminTableHead}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isFullStaff ? 8 : 7} className="px-4 py-8">
                  <LoadingState size="sm" inline className="w-full" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={isFullStaff ? 8 : 7} className="px-3 py-8 text-center text-zinc-500">
                  No events yet
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2 font-medium text-zinc-900">{row.title}</td>
                  <td className="px-3 py-2">
                    {isEventType(row.eventType) ? eventTypeLabel(row.eventType) : row.eventType}
                  </td>
                  <td className="px-3 py-2">{row.project?.name ?? "—"}</td>
                  {isFullStaff && <td className="px-3 py-2">{row.builder?.fullName ?? "—"}</td>}
                  <td className="px-3 py-2">{row.venue ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.startDate)}</td>
                  <td className="px-3 py-2">
                    <EventStatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Link
                        href={`/admin/events/${row.id}`}
                        className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"
                        title="View / edit"
                      >
                        {isFullStaff ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Link>
                      <AdminCan module="events" action="delete">
                        <button
                          type="button"
                          onClick={() => onDelete(row.id)}
                          className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AdminCan>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <AdminPagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>
    </div>
  );
}
