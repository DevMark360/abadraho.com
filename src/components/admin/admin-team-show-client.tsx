"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminMultiSelect } from "@/components/admin/admin-multi-select";
import { AdminBackLink, AdminDbAlert, adminCard, adminTableHead } from "@/components/admin/admin-ui";

type TeamDetail = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  teamLeadName: string | null;
  members: { id: number; status: number; name: string }[];
  builders: { id: number; status: number; name: string }[];
  projects: {
    id: number;
    name: string;
    owners: string[];
    staffUsers: string[];
  }[];
};

export function AdminTeamShowClient({
  slug,
  backHref,
  backLabel,
}: {
  slug: string;
  backHref: string;
  backLabel: string;
}) {
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [users, setUsers] = useState<{ value: string; label: string }[]>([]);
  const [builders, setBuilders] = useState<{ value: string; label: string }[]>([]);
  const [projects, setProjects] = useState<{ value: string; label: string }[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [builderIds, setBuilderIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [isStaff, setIsStaff] = useState(false);

  const loadTeam = useCallback(() => {
    return fetch(`/api/admin/teams/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success || !j.team) {
          setError(j.message ?? "Not found");
          setTeam(null);
          setCanManage(false);
        } else {
          setTeam(j.team);
          setCanManage(Boolean(j.canManage));
          setName(j.team.name);
          setDescription(j.team.description ?? "");
          setMemberIds(
            j.team.members.filter((m: { status: number }) => m.status).map((m: { id: number }) => String(m.id))
          );
          setBuilderIds(
            j.team.builders.filter((b: { status: number }) => b.status).map((b: { id: number }) => String(b.id))
          );
          setProjectIds(j.team.projects.map((p: { id: number }) => String(p.id)));
        }
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    loadTeam();
    fetch("/api/admin/teams?meta=1")
      .then((r) => r.json())
      .then((j) => {
        if (j.users) setUsers(j.users);
        if (j.builders) setBuilders(j.builders);
        if (j.projects) setProjects(j.projects);
        if (j.isStaff != null) setIsStaff(Boolean(j.isStaff));
      });
  }, [loadTeam]);

  async function saveAssignments() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/teams/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        memberIds: memberIds.map(Number),
        builderIds: builderIds.map(Number),
        projectIds: projectIds.map(Number),
      }),
    });
    const j = await res.json();
    setSaving(false);
    if (!j.success) {
      setMsg(j.message ?? "Update failed");
      return;
    }
    setMsg(j.message ?? "Team updated");
    setEditing(false);
    await loadTeam();
  }

  if (loading) return <LoadingState size="sm" />;
  if (!team) return <AdminDbAlert message={error ?? "Team not found"} />;

  const activeMembers = team.members.filter((m) => m.status);
  const activeBuilders = team.builders.filter((b) => b.status);

  return (
    <div className="space-y-4">
      <AdminBackLink href={backHref}>{backLabel}</AdminBackLink>

      <div className={`${adminCard} p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">{team.name}</h2>
          {!editing && canManage && (
            <Button type="button" onClick={() => setEditing(true)}>
              Edit assignments
            </Button>
          )}
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Team ID</dt>
            <dd className="font-medium">{team.id}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Team lead</dt>
            <dd className="font-medium">{team.teamLeadName ?? "—"}</dd>
          </div>
        </dl>
      </div>

      {editing ? (
        <div className={`${adminCard} space-y-4 p-6`}>
          <h3 className="text-sm font-semibold text-zinc-800">Assign members, builders & projects</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Team name</span>
              <Input layout="field" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-zinc-700">Description</span>
              <Input layout="field"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>
          <AdminMultiSelect
            label="Team members (users)"
            options={users}
            value={memberIds}
            onChange={setMemberIds}
            placeholder="Select users"
          />
          {isStaff && (
            <AdminMultiSelect
              label="Team builders"
              options={builders}
              value={builderIds}
              onChange={setBuilderIds}
              placeholder="Select builders"
            />
          )}
          <AdminMultiSelect
            label="Team projects"
            options={projects}
            value={projectIds}
            onChange={setProjectIds}
            placeholder="Select projects"
          />
          {msg && <p className="text-sm text-red-600">{msg}</p>}
          <div className="flex gap-2">
            <Button type="button" onClick={saveAssignments} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setMsg(null);
                void loadTeam();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {(activeMembers.length > 0 || activeBuilders.length > 0) && (
            <div className={`${adminCard} p-6`}>
              <h3 className="text-sm font-semibold text-zinc-800">Team members</h3>
              {activeMembers.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase text-zinc-400">Users</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {activeMembers.map((m) => (
                      <li key={m.id}>{m.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {activeBuilders.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase text-zinc-400">Builders</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {activeBuilders.map((b) => (
                      <li key={b.id}>{b.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className={`${adminCard} overflow-x-auto p-4`}>
            <h3 className="mb-3 text-sm font-semibold text-zinc-800">Team projects</h3>
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className={adminTableHead}>#</th>
                  <th className={adminTableHead}>Project name</th>
                  <th className={adminTableHead}>Project ID</th>
                  <th className={adminTableHead}>Project builders</th>
                  <th className={adminTableHead}>Project users</th>
                </tr>
              </thead>
              <tbody>
                {team.projects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                      No projects linked
                    </td>
                  </tr>
                ) : (
                  team.projects.map((p, i) => (
                    <tr key={p.id} className="border-t border-zinc-100">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/projects/${p.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{p.id}</td>
                      <td className="px-3 py-2">{p.owners.join(" | ") || "—"}</td>
                      <td className="px-3 py-2">{p.staffUsers.join(" | ") || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
