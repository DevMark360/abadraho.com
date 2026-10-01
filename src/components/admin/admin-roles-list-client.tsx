"use client";

import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  AdminPageToolbar,
  adminCard,
  adminTableHead,
} from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";

type RoleRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  isSuperAdmin: boolean;
  userCount: number;
  permissionCount: number;
};

export function AdminRolesListClient() {
  const [items, setItems] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/roles");
    const json = await res.json();
    if (!json.success) {
      if (res.status === 403) {
        setError(
          "You do not have permission to manage roles. Log in as Super Admin, or ask an admin to grant roles.view on your staff role."
        );
      } else {
        setError(json.error ?? json.message ?? "Failed to load roles");
      }
      setItems([]);
    } else {
      setItems(json.items ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number, name: string) {
    if (!confirm(`Delete role "${name}"?`)) return;
    const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else load();
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={items.length}>
        <AdminCan module="roles" action="add">
          <Button asChild className="gap-1.5">
            <Link href="/admin/roles/create">
              <Plus className="h-4 w-4" />
              Add role
            </Link>
          </Button>
        </AdminCan>
      </AdminPageToolbar>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">{error.includes("permission") ? "Access denied" : "Database required"}</p>
          <p className="mt-1">{error}</p>
          {error.includes("permission") ? null : (
            <p className="mt-2 text-xs">
              Set <code className="rounded bg-amber-100 px-1">USE_DATABASE=true</code> in{" "}
              <code className="rounded bg-amber-100 px-1">.env</code> and start MySQL.
            </p>
          )}
        </div>
      )}

      <div className={`${adminCard} overflow-x-auto`}>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>Role</th>
              <th className={adminTableHead}>Users</th>
              <th className={adminTableHead}>Permissions</th>
              <th className={adminTableHead}>Type</th>
              <th className={adminTableHead}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8">
                  <LoadingState size="sm" inline className="w-full" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                  No roles yet
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">
                    <p className="font-medium text-zinc-900">{row.name}</p>
                    {row.description ? (
                      <p className="mt-0.5 text-xs text-zinc-500">{row.description}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{row.userCount}</td>
                  <td className="px-3 py-2">{row.permissionCount}</td>
                  <td className="px-3 py-2">
                    {row.isSuperAdmin ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Super Admin
                      </span>
                    ) : row.isSystem ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        System
                      </span>
                    ) : (
                      <span className="text-zinc-500">Custom</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {row.isSuperAdmin ? (
                        <span className="text-xs text-zinc-400">Locked</span>
                      ) : (
                        <>
                          <AdminCan module="roles" action="edit">
                            <Button asChild type="button" size="sm" variant="outline">
                              <Link href={`/admin/roles/${row.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          </AdminCan>
                          {!row.isSystem && (
                            <AdminCan module="roles" action="delete">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => onDelete(row.id, row.name)}
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AdminCan>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
