"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { AdminSelect } from "@/components/admin/admin-select";
import { AdminMultiSelect, type AdminSelectOption } from "@/components/admin/admin-multi-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AdminBackLink, AdminErrorAlert, adminCard } from "@/components/admin/admin-ui";
import { preventImplicitFormSubmit } from "@/components/admin/admin-form-section";
import {
  EVENT_STATUSES,
  EVENT_TYPES,
  eventStatusLabel,
  eventTypeLabel,
  type EventStatus,
} from "@/lib/event-status";
import { cn } from "@/lib/utils";

type ProjectOption = { value: string; label: string };
type BuilderOption = { id: number; fullName: string };

type EventDetail = {
  id: number;
  title: string;
  eventType: string;
  description: string | null;
  venue: string | null;
  startDate: string;
  endDate: string | null;
  coverImage: string | null;
  status: EventStatus;
  projectId: number | null;
  builder: BuilderOption | null;
};

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminEventFormClient({
  mode,
  eventId,
}: {
  mode: "create" | "edit";
  eventId?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [isFullStaff, setIsFullStaff] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [status, setStatus] = useState<EventStatus>("pending");

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("launch");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCoverImage, setRemoveCoverImage] = useState(false);

  const [builder, setBuilder] = useState<BuilderOption | null>(null);
  const [builderQuery, setBuilderQuery] = useState("");
  const [builderResults, setBuilderResults] = useState<BuilderOption[]>([]);

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySending, setNotifySending] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifyOptions, setNotifyOptions] = useState<AdminSelectOption[]>([]);
  const [notifySelected, setNotifySelected] = useState<string[]>([]);

  useEffect(() => {
    async function init() {
      if (mode === "edit" && eventId) {
        const res = await fetch(`/api/admin/events/${eventId}`);
        const json = await res.json();
        if (!json.success || !json.event) {
          setError(json.message ?? "Failed to load event");
          setLoading(false);
          return;
        }
        const e = json.event as EventDetail;
        setTitle(e.title);
        setEventType(e.eventType);
        setDescription(e.description ?? "");
        setVenue(e.venue ?? "");
        setStartDate(toDateTimeLocal(e.startDate));
        setEndDate(toDateTimeLocal(e.endDate));
        setProjectId(e.projectId ? String(e.projectId) : "");
        setCoverPreview(e.coverImage);
        setStatus(e.status);
        setBuilder(e.builder);
        setIsFullStaff(Boolean(json.isFullStaff));
      }
      const listRes = await fetch("/api/admin/events?perPage=1&page=1");
      const listJson = await listRes.json();
      if (listJson.projectOptions) setProjects(listJson.projectOptions);
      if (mode === "create") setIsFullStaff(Boolean(listJson.isFullStaff));
      setLoading(false);
    }
    init();
  }, [mode, eventId]);

  async function searchBuilders() {
    const res = await fetch(`/api/admin/builders?q=${encodeURIComponent(builderQuery)}`);
    const json = await res.json();
    setBuilderResults(json.items ?? []);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMsg(null);

    const fd = new FormData();
    fd.set("title", title);
    fd.set("eventType", eventType);
    fd.set("description", description);
    fd.set("venue", venue);
    fd.set("startDate", startDate);
    if (endDate) fd.set("endDate", endDate);
    if (projectId) fd.set("projectId", projectId);
    if (isFullStaff && builder) fd.set("builderId", String(builder.id));
    if (coverFile) fd.set("coverImage", coverFile);
    else if (removeCoverImage) fd.set("removeCoverImage", "true");

    const url = mode === "edit" && eventId ? `/api/admin/events/${eventId}` : "/api/admin/events";
    const method = mode === "edit" ? "PATCH" : "POST";
    const res = await fetch(url, { method, body: fd });
    const json = await res.json();
    setSaving(false);
    if (!json.success) {
      setError(json.message ?? "Save failed");
      return;
    }
    if (mode === "create") {
      router.push(`/admin/events/${json.id}`);
    } else {
      setMsg("Event updated");
    }
  }

  async function setEventStatus(next: EventStatus) {
    if (!eventId) return;
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) {
      setError(json.message ?? "Update failed");
      return;
    }
    setStatus(next);
    setMsg(`Event ${eventStatusLabel(next).toLowerCase()}`);
  }

  async function openNotifyModal() {
    setNotifyOpen(true);
    setNotifyError(null);
    if (notifyOptions.length > 0) return;
    setNotifyLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/notify`);
      const json = await res.json();
      if (!json.success) {
        setNotifyError(json.message ?? "Failed to load users");
        return;
      }
      setNotifyOptions(
        (json.items ?? []).map((u: { id: number; name: string; email: string | null }) => ({
          value: String(u.id),
          label: u.email ? `${u.name} (${u.email})` : u.name,
        }))
      );
    } catch {
      setNotifyError("Failed to load users");
    } finally {
      setNotifyLoading(false);
    }
  }

  async function sendNotifications() {
    if (!eventId || notifySelected.length === 0) return;
    setNotifySending(true);
    setNotifyError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: notifySelected.map(Number) }),
      });
      const json = await res.json();
      if (!json.success) {
        setNotifyError(json.message ?? "Failed to send notifications");
        return;
      }
      setMsg(`Notified ${json.count} user${json.count === 1 ? "" : "s"}`);
      setNotifyOpen(false);
      setNotifySelected([]);
    } catch {
      setNotifyError("Failed to send notifications");
    } finally {
      setNotifySending(false);
    }
  }

  async function remove() {
    if (!eventId) return;
    if (!confirm("Delete this event?")) return;
    const res = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      alert(json.message ?? "Delete failed");
      return;
    }
    router.push("/admin/events");
  }

  if (loading) return <LoadingState size="sm" />;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <AdminBackLink href="/admin/events">Events</AdminBackLink>
      {error && <AdminErrorAlert message={error} />}

      {mode === "edit" && isFullStaff && (
        <div className={adminCard}>
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-800">Moderation</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Only approved events appear publicly at abadraho.com/events.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 p-4">
            <span className="text-xs font-medium text-zinc-500">Current status</span>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                status === "approved" && "bg-emerald-50 text-emerald-700",
                status === "pending" && "bg-amber-50 text-amber-700",
                status === "rejected" && "bg-red-50 text-red-700"
              )}
            >
              {eventStatusLabel(status)}
            </span>
            <span className="mx-1 h-4 w-px bg-zinc-200" aria-hidden />
            {EVENT_STATUSES.filter((value) => value !== status).map((value) => (
              <Button
                key={value}
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setEventStatus(value)}
              >
                Mark {eventStatusLabel(value).toLowerCase()}
              </Button>
            ))}
            <Button type="button" variant="outline" className="ml-auto gap-1.5" onClick={openNotifyModal}>
              <Bell className="h-3.5 w-3.5" /> Notify users
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} onKeyDown={preventImplicitFormSubmit} className={`${adminCard} space-y-4 p-6`}>
        <h2 className="text-lg font-semibold text-zinc-900">
          {mode === "create" ? "Create event" : "Edit event"}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Event title *</span>
            <Input layout="field" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Event type *</span>
            <AdminSelect
              layout="field"
              required
              value={eventType}
              onChange={setEventType}
              options={EVENT_TYPES.map((t) => ({ value: t, label: eventTypeLabel(t) }))}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Project (optional)</span>
            <AdminSelect
              layout="field"
              value={projectId}
              onChange={setProjectId}
              placeholder="No linked project"
              options={[{ value: "", label: "No linked project" }, ...projects]}
            />
          </label>

          {isFullStaff && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Builder *</span>
            {builder && (
              <div className="mb-2 flex items-center gap-2 text-sm text-zinc-700">
                <span className="rounded bg-zinc-100 px-2 py-1">{builder.fullName}</span>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => setBuilder(null)}
                >
                  Change
                </button>
              </div>
            )}
            {!builder && (
              <div className="flex flex-wrap gap-2">
                <Input
                  layout="field"
                  placeholder="Search builder by name…"
                  value={builderQuery}
                  onChange={(e) => setBuilderQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchBuilders())}
                />
                <Button type="button" variant="outline" onClick={searchBuilders}>
                  Search
                </Button>
              </div>
            )}
            {!builder && builderResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-zinc-200">
                {builderResults.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                    onClick={() => {
                      setBuilder(b);
                      setBuilderResults([]);
                    }}
                  >
                    {b.fullName}
                  </button>
                ))}
              </div>
            )}
          </label>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Start date/time *</span>
            <Input
              layout="field"
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">End date/time</span>
            <Input
              layout="field"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Venue</span>
          <Input layout="field" value={venue} onChange={(e) => setVenue(e.target.value)} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Description</span>
          <Textarea layout="field" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Cover image</span>
          {coverPreview && !removeCoverImage && (
            <Image
              src={coverPreview}
              alt="Cover"
              width={200}
              height={120}
              className="mb-2 rounded border object-cover"
              unoptimized
            />
          )}
          <Input
            layout="field"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setCoverFile(f ?? null);
              if (f) {
                setCoverPreview(URL.createObjectURL(f));
                setRemoveCoverImage(false);
              }
            }}
          />
          {coverPreview && !removeCoverImage && !coverFile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 text-red-600 hover:bg-red-50"
              onClick={() => setRemoveCoverImage(true)}
            >
              Remove cover image
            </Button>
          )}
        </label>

        {msg && <p className="text-sm text-emerald-700">{msg}</p>}

        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create event" : "Save changes"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/events">Cancel</Link>
            </Button>
          </div>
          {mode === "edit" && (
            <Button type="button" variant="outline" className="text-red-600 hover:bg-red-50" onClick={remove}>
              Delete event
            </Button>
          )}
        </div>
      </form>

      {notifyOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Notify users</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Select the users who should get a notification about this event.
            </p>

            <div className="mt-4">
              {notifyLoading ? (
                <LoadingState size="sm" />
              ) : (
                <>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-700">Users</span>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        className="text-zinc-600 hover:underline disabled:text-zinc-300 disabled:no-underline"
                        disabled={notifyOptions.length === 0}
                        onClick={() => setNotifySelected(notifyOptions.map((o) => o.value))}
                      >
                        Select all
                      </button>
                      <span className="text-zinc-300">|</span>
                      <button
                        type="button"
                        className="text-zinc-600 hover:underline disabled:text-zinc-300 disabled:no-underline"
                        disabled={notifySelected.length === 0}
                        onClick={() => setNotifySelected([])}
                      >
                        Deselect all
                      </button>
                    </div>
                  </div>
                  <AdminMultiSelect
                    options={notifyOptions}
                    value={notifySelected}
                    onChange={setNotifySelected}
                    placeholder="Select users…"
                  />
                </>
              )}
            </div>

            {notifyError && <p className="mt-3 text-sm text-red-600">{notifyError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNotifyOpen(false);
                  setNotifyError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={notifySending || notifySelected.length === 0}
                onClick={sendNotifications}
              >
                {notifySending
                  ? "Sending…"
                  : `Send${notifySelected.length ? ` (${notifySelected.length})` : ""}`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
