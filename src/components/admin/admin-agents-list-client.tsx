"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminDbAlert, AdminPageToolbar, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";
import { cn } from "@/lib/utils";

type AgentRow = {
  rowNum: number;
  id: number;
  contactPersonName: string | null;
  contactEmail: string | null;
  contactNumber: string | null;
  companyName: string | null;
};

export function AdminAgentsListClient() {
  const [items, setItems] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<"brokers" | "users">("brokers");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [applied, setApplied] = useState({ userName: "", userEmail: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (applied.userName) params.set("userName", applied.userName);
    if (applied.userEmail) params.set("userEmail", applied.userEmail);
    const res = await fetch(`/api/admin/agents?${params}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? json.message ?? "Failed to load");
      setItems([]);
    } else {
      setError(null);
      setItems(json.items ?? []);
      if (json.storageMode === "users" || json.storageMode === "brokers") {
        setStorageMode(json.storageMode);
      }
    }
    setLoading(false);
  }, [applied]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number, name: string) {
    if (!confirm(`Permanently delete agent "${name}"? This can't be undone.`)) return;
    const res = await fetch(`/api/admin/agents/${id}`, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (!res.ok || !json.success) alert(json.message ?? "Delete failed");
    else load();
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={items.length}>
        <AdminCan module="agents" action="add">
          <Button asChild className="gap-1.5">
            <Link href="/admin/agents/create">
              <Plus className="h-4 w-4" />
              Add agent
            </Link>
          </Button>
        </AdminCan>
      </AdminPageToolbar>

      <div className={`${adminCard} relative z-20 overflow-visible`}>
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <Input layout="field"
            placeholder="Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <Input layout="field"
            placeholder="Email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                setApplied({ userName, userEmail });
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
                setApplied({ userName: "", userEmail: "" });
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {storageMode === "users" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Agents loaded from users table</p>
          <p className="mt-1">
            The <code className="rounded bg-amber-100 px-1">brokers</code> table is not in this
            database. Listing uses agent users (<code className="rounded bg-amber-100 px-1">user_type_id = -10027</code>
            ). Company, deals, and area expertise need the brokers table — run{" "}
            <code className="rounded bg-amber-100 px-1">scripts/create-brokers-table.sql</code> on MySQL
            for full broker company and deal fields.
          </p>
        </div>
      )}

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>#</th>
              <th className={adminTableHead}>Name</th>
              <th className={adminTableHead}>Email</th>
              <th className={adminTableHead}>Phone</th>
              <th className={adminTableHead}>Company</th>
              <th className={cn(adminTableHead, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  No agents
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{row.rowNum}</td>
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/admin/agents/${row.id}`} className="text-blue-600 hover:underline">
                      {row.contactPersonName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.contactEmail ?? "—"}</td>
                  <td className="px-3 py-2">{row.contactNumber ?? "—"}</td>
                  <td className="px-3 py-2">{row.companyName ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/agents/${row.id}`}
                        className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <AdminCan module="agents" action="edit">
                        <Link
                          href={`/admin/agents/${row.id}/edit`}
                          className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </AdminCan>
                      <AdminCan module="agents" action="delete">
                        <button
                          type="button"
                          onClick={() => onDelete(row.id, row.contactPersonName ?? "agent")}
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
      </div>
    </div>
  );
}
