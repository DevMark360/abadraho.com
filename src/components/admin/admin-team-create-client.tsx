"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminMultiSelect } from "@/components/admin/admin-multi-select";
import { AdminBackLink, AdminDbAlert, adminCard } from "@/components/admin/admin-ui";
import { preventImplicitFormSubmit } from "@/components/admin/admin-form-section";

export function AdminTeamCreateClient() {
  const router = useRouter();
  const [users, setUsers] = useState<{ value: string; label: string }[]>([]);
  const [builders, setBuilders] = useState<{ value: string; label: string }[]>([]);
  const [projects, setProjects] = useState<{ value: string; label: string }[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [builderIds, setBuilderIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    fetch("/api/admin/teams?meta=1")
      .then((r) => r.json())
      .then((j) => {
        if (j.users) setUsers(j.users);
        if (j.builders) setBuilders(j.builders);
        if (j.projects) setProjects(j.projects);
        if (j.isStaff != null) setIsStaff(Boolean(j.isStaff));
        if (!j.success) setError(j.message ?? "Failed to load form data");
        setLoading(false);
      });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        description: fd.get("description"),
        memberIds: memberIds.map(Number),
        builderIds: builderIds.map(Number),
        projectIds: projectIds.map(Number),
      }),
    });
    const j = await res.json();
    setSaving(false);
    if (!j.success) {
      setMsg(j.message ?? "Create failed");
      return;
    }
    router.push(j.slug ? `/admin/my-team/${j.slug}` : "/admin/my-teams");
  }

  if (loading) return <LoadingState size="sm" />;

  return (
    <div className="space-y-4">
      <AdminBackLink href="/admin/my-teams">My teams</AdminBackLink>
      {error && <AdminDbAlert message={error} />}

      <form onSubmit={onSubmit} onKeyDown={preventImplicitFormSubmit} className={`${adminCard} max-w-3xl space-y-4 p-6`}>
        <h2 className="text-lg font-semibold text-zinc-900">Create team</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Team name</span>
            <Input layout="field" name="name" required />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-zinc-700">Description</span>
            <Input layout="field" name="description" required />
          </label>
        </div>
        <AdminMultiSelect
          label="Invite members"
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
            placeholder="Select builders (optional)"
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
                    <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Create team"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/my-teams">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
