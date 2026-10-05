"use client";

import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, UserMinus } from "lucide-react";
import { AdminPermissionsMatrix } from "@/components/admin/admin-permissions-matrix";
import {
  AdminBackLink,
  AdminErrorAlert,
  adminCard,
  adminTableHead,
} from "@/components/admin/admin-ui";
import { AdminFormSection, FieldLabel, preventImplicitFormSubmit } from "@/components/admin/admin-form-section";

type AssignedUser = {
  id: number;
  source: "user" | "admin";
  name: string;
  email: string;
};

type AssignableUser = {
  source: "user" | "admin";
  id: number;
  name: string;
  email: string;
  staffRoleId: number | null;
};

export function AdminRoleFormClient({
  roleId,
  mode,
}: {
  roleId?: number;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<AssignableUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const loadRole = useCallback(async () => {
    if (!roleId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/roles/${roleId}`);
    const json = await res.json();
    if (!json.success || !json.role) {
      setError(json.message ?? "Role not found");
      setLoading(false);
      return;
    }
    const role = json.role;
    setName(role.name ?? "");
    setDescription(role.description ?? "");
    setPermissions(role.permissions ?? []);
    setAssignedUsers(role.assignedUsers ?? []);
    setIsSuperAdmin(Boolean(role.isSuperAdmin));
    setError(null);
    setLoading(false);
  }, [roleId]);

  useEffect(() => {
    if (mode === "edit") loadRole();
  }, [mode, loadRole]);

  useEffect(() => {
    if (mode !== "edit" || !roleId) return;
    const t = window.setTimeout(async () => {
      setSearchingUsers(true);
      const res = await fetch(
        `/api/admin/roles/assignable-users?q=${encodeURIComponent(userQuery)}`
      );
      const json = await res.json();
      setUserResults(json.items ?? []);
      setSearchingUsers(false);
    }, 300);
    return () => window.clearTimeout(t);
  }, [userQuery, mode, roleId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = mode === "create" ? "/api/admin/roles" : `/api/admin/roles/${roleId}`;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, permissions }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) {
      alert(json.message ?? "Save failed");
      return;
    }
    if (mode === "create" && json.id) {
      router.push(`/admin/roles/${json.id}/edit`);
      router.refresh();
    } else {
      loadRole();
    }
  }

  async function assignUser(user: AssignableUser) {
    if (!roleId) return;
    const res = await fetch(`/api/admin/roles/${roleId}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: user.source, id: user.id }),
    });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Assign failed");
    else {
      setUserQuery("");
      loadRole();
    }
  }

  async function removeUser(user: AssignedUser) {
    if (!roleId) return;
    if (!confirm(`Remove "${user.name}" from this role?`)) return;
    const res = await fetch(`/api/admin/roles/${roleId}/users`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: user.source, id: user.id }),
    });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Remove failed");
    else loadRole();
  }

  if (loading) return <LoadingState size="sm" />;
  if (error) {
    return <AdminErrorAlert message={error} backHref="/admin/roles" backLabel="Roles" />;
  }

  return (
    <form onSubmit={save} onKeyDown={preventImplicitFormSubmit} className="space-y-6">
      <AdminBackLink href="/admin/roles">Roles</AdminBackLink>

      <AdminFormSection title="Role details">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <FieldLabel required>Name</FieldLabel>
            <Input
              layout="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSuperAdmin}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <FieldLabel>Description</FieldLabel>
            <Input
              layout="field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSuperAdmin}
            />
          </label>
        </div>
      </AdminFormSection>

      <AdminFormSection title="Permissions">
        {isSuperAdmin ? (
          <p className="text-sm text-zinc-500">
            Super Admin has full access to all modules. This role cannot be edited.
          </p>
        ) : (
          <AdminPermissionsMatrix value={permissions} onChange={setPermissions} />
        )}
      </AdminFormSection>

      {mode === "edit" && !isSuperAdmin ? (
        <AdminFormSection title="Assigned users">
          <p className="mb-3 text-sm text-zinc-500">
            Staff and admin accounts are assigned to roles here, not from the user listing.
          </p>

          <div className={`${adminCard} mb-4 p-4`}>
            <FieldLabel>Search staff / admin</FieldLabel>
            <Input
              layout="field"
              placeholder="Name or email…"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              className="mt-1"
            />
            {searchingUsers ? (
              <p className="mt-2 text-xs text-zinc-400">Searching…</p>
            ) : userResults.length > 0 ? (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-zinc-100">
                {userResults.map((u) => {
                  const key = `${u.source}-${u.id}`;
                  const already = assignedUsers.some(
                    (a) => a.source === u.source && a.id === u.id
                  );
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-2 border-t border-zinc-50 px-3 py-2 first:border-t-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-zinc-500">{u.email}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={already}
                        onClick={() => assignUser(u)}
                        className="shrink-0 gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {already ? "Assigned" : "Add"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : userQuery.trim() ? (
              <p className="mt-2 text-xs text-zinc-400">No matches</p>
            ) : null}
          </div>

          <div className={`${adminCard} overflow-x-auto`}>
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className={adminTableHead}>Name</th>
                  <th className={adminTableHead}>Email</th>
                  <th className={adminTableHead}>Source</th>
                  <th className={adminTableHead}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                      No users assigned
                    </td>
                  </tr>
                ) : (
                  assignedUsers.map((u) => (
                    <tr key={`${u.source}-${u.id}`} className="border-t border-zinc-100">
                      <td className="px-3 py-2 font-medium">{u.name}</td>
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2 capitalize text-zinc-500">{u.source}</td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-600"
                          onClick={() => removeUser(u)}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminFormSection>
      ) : null}

      {!isSuperAdmin ? (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Create role" : "Save changes"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/roles">Cancel</Link>
          </Button>
        </div>
      ) : null}
    </form>
  );
}
