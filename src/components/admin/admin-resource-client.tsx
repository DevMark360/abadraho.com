"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { AdminResourceDef } from "@/config/admin-resources";
import {
  AdminDbAlert,
  AdminPagination,
  adminTableHead,
} from "@/components/admin/admin-ui";
import { AdminCanResource } from "@/components/admin/admin-permissions-provider";

type Row = Record<string, unknown>;

export function AdminResourceClient({
  resourceId,
  def,
}: {
  resourceId: string;
  def: AdminResourceDef;
}) {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/${resourceId}?page=${page}`);
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.message ?? "Failed to load");
      setItems([]);
      return;
    }
    setItems(json.items ?? []);
    setTotal(json.total ?? 0);
    if (json.error) setError(json.error);
  }, [resourceId, page]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm({});
    setEditId(null);
    setModal("create");
  }

  async function openEdit(id: number) {
    const res = await fetch(`/api/admin/${resourceId}/${id}`);
    const json = await res.json();
    if (json.item) {
      const f: Record<string, string> = {};
      for (const field of def.fields) {
        const v = json.item[field.name];
        f[field.name] = v != null ? String(v) : "";
      }
      setForm(f);
      setEditId(id);
      setModal("edit");
    }
  }

  async function save() {
    setSaving(true);
    const url =
      modal === "create"
        ? `/api/admin/${resourceId}`
        : `/api/admin/${resourceId}/${editId}`;
    const res = await fetch(url, {
      method: modal === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    if (json.success) {
      setModal(null);
      load();
    } else {
      alert(json.message ?? "Save failed");
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this record?")) return;
    const res = await fetch(`/api/admin/${resourceId}/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) load();
    else alert(json.message ?? "Delete failed");
  }

  function formatCell(key: string, value: unknown, format?: string) {
    if (value == null) return "—";
    if (format === "date") return new Date(String(value)).toLocaleDateString();
    if (format === "bool") return value ? "Yes" : "No";
    const s = String(value);
    return s.length > 48 ? `${s.slice(0, 48)}…` : s;
  }

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {total} records {error && <span className="text-amber-600">· {error}</span>}
        </p>
        <div className="flex gap-2">
          {def.canCreate && def.fields.length > 0 && (
            <AdminCanResource resource={resourceId} action="add">
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add new
              </Button>
            </AdminCanResource>
          )}
        </div>
      </div>

      {error && !items.length && <AdminDbAlert message={error} />}

      <div className="overflow-hidden rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                {def.columns.map((c) => (
                  <th key={c.key} className={adminTableHead}>
                    {c.label}
                  </th>
                ))}
                <th className={adminTableHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={def.columns.length + 1} className="px-4 py-8">
                    <LoadingState size="sm" inline className="w-full" />
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((row) => (
                  <tr key={String(row.id)} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                    {def.columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-zinc-700">
                        {formatCell(c.key, row[c.key], c.format)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {def.fields.length > 0 && (
                          <AdminCanResource resource={resourceId} action="edit">
                            <button
                              type="button"
                              onClick={() => openEdit(Number(row.id))}
                              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100"
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </AdminCanResource>
                        )}
                        {def.canDelete && (
                          <AdminCanResource resource={resourceId} action="delete">
                            <button
                              type="button"
                              onClick={() => remove(Number(row.id))}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AdminCanResource>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && !items.length && !error && (
                <tr>
                  <td colSpan={def.columns.length + 1} className="px-4 py-8 text-center text-zinc-400">
                    No records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              {modal === "create" ? "Add" : "Edit"} {def.title}
            </h2>
            <div className="mt-4 space-y-3">
              {def.fields.map((f) => (
                <label key={f.name} className="block text-sm">
                  <span className="font-medium text-zinc-700">{f.label}</span>
                  {f.type === "textarea" ? (
                    <Textarea
                      layout="field"
                      value={form[f.name] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
                      rows={4}
                    />
                  ) : (
                    <Input
                      layout="field"
                      type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                      value={form[f.name] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
                      required={f.required}
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
