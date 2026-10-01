"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Pencil, Plus } from "lucide-react";
import { adminProjectImageUrl } from "@/lib/admin-project-media";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { AdminMultiSelect, type AdminSelectOption } from "@/components/admin/admin-multi-select";
import { AdminBackLink, AdminErrorAlert, AdminLinkAction, adminPanel, adminTableHead } from "@/components/admin/admin-ui";
import { SanitizedHtml } from "@/components/ui/sanitized-html";
import { fmtDate } from "@/components/admin/admin-search-history-format";

export function AdminProjectShowClient({ projectId }: { projectId: number }) {
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullStaff, setIsFullStaff] = useState(false);
  const [approving, setApproving] = useState(false);

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySending, setNotifySending] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [notifyOptions, setNotifyOptions] = useState<AdminSelectOption[]>([]);
  const [notifySelected, setNotifySelected] = useState<string[]>([]);

  function reload() {
    return fetch(`/api/admin/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.project) setProject(data.project);
        else setError(data.message ?? "Not found");
        if (typeof data.isFullStaff === "boolean") setIsFullStaff(data.isFullStaff);
        setLoading(false);
      });
  }

  useEffect(() => {
    reload().catch(() => {
      setError("Failed to load");
      setLoading(false);
    });
  }, [projectId]);

  async function setApproval(action: "approve" | "hold" | "reject") {
    setApproving(true);
    const res = await fetch(`/api/admin/projects/${projectId}/approval`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setApproving(false);
    if (json.success) await reload();
    else alert(json.message ?? "Update failed");
  }

  async function openNotifyModal() {
    setNotifyOpen(true);
    setNotifyError(null);
    setNotifyMsg(null);
    if (notifyOptions.length > 0) return;
    setNotifyLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/notify`);
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
    if (notifySelected.length === 0) return;
    setNotifySending(true);
    setNotifyError(null);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: notifySelected.map(Number) }),
      });
      const json = await res.json();
      if (!json.success) {
        setNotifyError(json.message ?? "Failed to send notifications");
        return;
      }
      setNotifyMsg(`Notified ${json.count} user${json.count === 1 ? "" : "s"}`);
      setNotifyOpen(false);
      setNotifySelected([]);
    } catch {
      setNotifyError("Failed to send notifications");
    } finally {
      setNotifySending(false);
    }
  }

  if (loading) {
    return <LoadingState size="sm" />;
  }

  if (error || !project) {
    return (
      <AdminErrorAlert message={error ?? "Not found"} backHref="/admin/projects" backLabel="Projects" />
    );
  }

  const units = (project.units as Record<string, unknown>[]) ?? [];
  const amenities = (project.projectAmenities as { amenity: { name: string } }[]) ?? [];
  const utilities = (project.projectUtilities as { utility: { name: string } }[]) ?? [];
  const cover = adminProjectImageUrl(project.projectCoverImg as string | null);
  const name = String(project.name);

  return (
    <div className="space-y-4">
      {isFullStaff && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
          <span className="text-sm text-zinc-600">Admin review:</span>
          <Button
            type="button"
            size="sm"
            disabled={approving}
            onClick={() => setApproval("approve")}
          >
            Approve (live)
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={approving}
            onClick={() => setApproval("hold")}
          >
            On hold
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={approving}
            onClick={() => setApproval("reject")}
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            Reject
          </Button>
          <span className="mx-1 h-4 w-px bg-zinc-200" aria-hidden />
          <Button type="button" size="sm" variant="outline" className="ml-auto gap-1.5" onClick={openNotifyModal}>
            <Bell className="h-3.5 w-3.5" /> Notify users
          </Button>
          {notifyMsg && <span className="text-xs text-emerald-700">{notifyMsg}</span>}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <AdminBackLink href="/admin/projects">Projects</AdminBackLink>
          <p className="text-sm text-zinc-500">
            {String(project.statusLabel)} · {String(project.areaNames || "—")}
          </p>
        </div>
        <Button asChild className="gap-1.5">
          <Link href={`/admin/projects/${projectId}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit project
          </Link>
        </Button>
      </div>

      {cover && (
        <div className={adminPanel}>
          <img src={cover} alt={name} className="max-h-56 w-full rounded-lg object-cover" />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="Created" value={fmtDate(project.createdAt as string | null)} />
        <InfoCard label="Modified" value={fmtDate(project.updatedAt as string | null)} />
        <InfoCard label="Address" value={String(project.address ?? "—")} />
        <InfoCard
          label="Progress"
          value={String((project.progress as { name?: string })?.name ?? "—")}
        />
        <InfoCard label="Slug" value={String(project.slug)} />
        <InfoCard
          label="Coordinates"
          value={`${project.latitude ?? "—"}, ${project.longitude ?? "—"}`}
        />
        <InfoCard label="Min price" value={String(project.minPrice ?? "—")} />
        <InfoCard label="Discount price" value={String(project.discountPrice ?? "—")} />
      </div>

      <AdminFormSection title={`Units (${units.length})`}>
        <div className="-mx-5 overflow-x-auto border-y border-zinc-100">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={adminTableHead}>ID</th>
                <th className={adminTableHead}>Title</th>
                <th className={adminTableHead}>Price</th>
                <th className={adminTableHead}>Rooms</th>
                <th className={adminTableHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={String(u.id)} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                  <td className="px-5 py-3">{String(u.id)}</td>
                  <td className="px-4 py-3">{String(u.title ?? "—")}</td>
                  <td className="px-4 py-3">{String(u.price ?? "—")}</td>
                  <td className="px-4 py-3">{String(u.rooms ?? "—")}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/units/${String(u.id)}/edit`}
                      className="text-sm font-medium text-zinc-700 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {!units.length && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-zinc-400">
                    No units yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-3 px-5 pb-4">
          <Button asChild className="gap-1.5">
            <Link href={`/admin/units/create?projectId=${projectId}`}>
              <Plus className="h-4 w-4" />
              Add unit
            </Link>
          </Button>
          <AdminLinkAction href={`/admin/units?projectId=${projectId}`}>
            Manage all units →
          </AdminLinkAction>
        </div>
      </AdminFormSection>

      <AdminFormSection title="Amenities">
        <p className="text-sm text-zinc-600">
          {amenities.length
            ? amenities.map((a) => a.amenity.name).join(", ")
            : "None assigned"}
        </p>
        <AdminLinkAction href="/admin/amenities">Amenities master list →</AdminLinkAction>
      </AdminFormSection>

      <AdminFormSection title="Utilities">
        <p className="text-sm text-zinc-600">
          {utilities.length
            ? utilities.map((u) => u.utility.name).join(", ")
            : "None assigned"}
        </p>
        <AdminLinkAction href="/admin/utilities">Utilities master list →</AdminLinkAction>
      </AdminFormSection>

      {typeof project.details === "string" && project.details.length > 0 && (
        <AdminFormSection title="Details">
          <SanitizedHtml
            html={project.details}
            className="prose prose-sm max-w-none text-zinc-700"
          />
        </AdminFormSection>
      )}

      {notifyOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Notify users</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Select the users who should get a notification about this project.
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${adminPanel} p-4`}>
      <p className="text-xs font-medium uppercase text-zinc-400">{label}</p>
      <p className="mt-1 text-sm text-zinc-800">{value}</p>
    </div>
  );
}
