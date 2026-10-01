"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { AdminBackLink, AdminDbAlert, AdminPageToolbar, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";
import { fmtDate } from "@/components/admin/admin-search-history-format";

type Row = { rowNum: number; id: number; title: string | null; createdAt: string | null };

export function AdminBlogCategoriesClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/blog-categories");
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? json.message ?? "Failed to load");
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

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/blog-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Failed");
    else {
      setNewTitle("");
      load();
    }
  }

  async function saveEdit() {
    if (!editId) return;
    const res = await fetch(`/api/admin/blog-categories/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle }),
    });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Failed");
    else {
      setEditId(null);
      load();
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Archive this category?")) return;
    const res = await fetch(`/api/admin/blog-categories/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Failed");
    else load();
  }

  return (
    <div className="space-y-4">
      <AdminBackLink href="/admin/blogs">Blogs</AdminBackLink>
      <AdminPageToolbar total={items.length} />

      <AdminCan module="blog_categories" action="add">
        <form onSubmit={addCategory} className={`${adminCard} flex flex-wrap gap-2 p-4`}>
          <Input layout="field"
            placeholder="New category title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            className=" min-w-[200px] flex-1"
          />
          <Button type="submit" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>
      </AdminCan>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>#</th>
              <th className={adminTableHead}>Title</th>
              <th className={adminTableHead}>Created</th>
              <th className={adminTableHead}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-zinc-500">
                  No categories
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{r.rowNum}</td>
                  <td className="px-3 py-2">
                    {editId === r.id ? (
                      <Input layout="field"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    ) : (
                      r.title ?? "—"
                    )}
                  </td>
                  <td className="px-3 py-2">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2">
                    {editId === r.id ? (
                      <div className="flex gap-1">
                        <Button type="button" size="sm" onClick={saveEdit}>
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setEditId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <AdminCan module="blog_categories" action="edit">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditId(r.id);
                              setEditTitle(r.title ?? "");
                            }}
                          >
                            Edit
                          </Button>
                        </AdminCan>
                        <AdminCan module="blog_categories" action="delete">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => onDelete(r.id)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AdminCan>
                      </div>
                    )}
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
