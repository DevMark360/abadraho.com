"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminMultiSelect } from "@/components/admin/admin-multi-select";
import { AdminDbAlert, AdminPageToolbar, AdminPagination, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

type UserRow = {
  rowNum: number;
  id: number;
  firstName: string;
  lastName: string | null;
  phoneNumber: string | null;
  email: string | null;
  userTypeName: string;
  createdAt: string | Date | null;
};

const PER_PAGE = 50;

export function AdminUsersListClient() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [applied, setApplied] = useState({ userName: "", userEmail: "", types: [] as string[] });
  const [userTypes, setUserTypes] = useState<{ value: string; label: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) });
      if (applied.userName) params.set("userName", applied.userName);
      if (applied.userEmail) params.set("userEmail", applied.userEmail);
      if (applied.types.length) params.set("types", applied.types.join(","));

      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? json.message ?? "Failed to load");
        setItems([]);
        setTotal(0);
      } else {
        setItems(json.items ?? []);
        setTotal(json.total ?? 0);
        if (json.userTypes?.length) {
          setUserTypes(
            json.userTypes.map((t: { id: number; name: string }) => ({
              value: String(t.id),
              label: t.name,
            }))
          );
        }
      }
    } catch {
      setError("Failed to load users");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number, name: string) {
    if (!confirm(`Archive user "${name}"?`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else load();
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total}>
        <Button asChild className="gap-1.5">
          <Link href="/admin/users/create">
            <Plus className="h-4 w-4" />
            Add user
          </Link>
        </Button>
      </AdminPageToolbar>

      <div className={`${adminCard} relative z-20 overflow-visible`}>
        <div className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Name</span>
              <Input layout="field"
                placeholder="Search name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </label>
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Email</span>
              <Input layout="field"
                type="email"
                placeholder="Exact email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </label>
            <div className="min-w-0">
              <AdminMultiSelect
                label="User type"
                options={userTypes}
                value={types}
                onChange={setTypes}
                placeholder="All types"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                setApplied({ userName, userEmail, types });
                setPage(1);
              }}
            >
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUserName("");
                setUserEmail("");
                setTypes([]);
                setApplied({ userName: "", userEmail: "", types: [] });
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>#</th>
              <th className={adminTableHead}>Name</th>
              <th className={adminTableHead}>Phone</th>
              <th className={adminTableHead}>Email</th>
              <th className={adminTableHead}>User type</th>
              <th className={adminTableHead}>Created</th>
              <th className={cn(adminTableHead, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  No users found
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{row.rowNum}</td>
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/admin/users/${row.id}`} className="text-blue-600 hover:underline">
                      {row.firstName} {row.lastName ?? ""}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.phoneNumber ?? "—"}</td>
                  <td className="px-3 py-2">{row.email ?? "—"}</td>
                  <td className="px-3 py-2">{row.userTypeName}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/users/${row.id}`}
                        className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/admin/users/${row.id}/edit`}
                        className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          onDelete(row.id, `${row.firstName} ${row.lastName ?? ""}`.trim())
                        }
                        className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PER_PAGE))}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => p + 1)}
      />
    </div>
  );
}
