"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { legacyBlogImageUrl } from "@/lib/legacy-url";
import { AdminDbAlert, AdminPageToolbar, AdminPagination, adminCard, adminTableHead } from "@/components/admin/admin-ui";

const PER_PAGE = 25;

type Row = {
  rowNum: number;
  id: number;
  title: string | null;
  categoryTitle: string | null;
  descriptionPreview: string;
  coverImg: string | null;
  isActive: number;
};

export function AdminBlogsListClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) });
    if (appliedQ) params.set("q", appliedQ);
    const res = await fetch(`/api/admin/blogs?${params}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? json.message ?? "Failed to load");
      setItems([]);
      setTotal(0);
    } else {
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [page, appliedQ]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number) {
    if (!confirm("Archive this blog post?")) return;
    const res = await fetch(`/api/admin/blogs/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else load();
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total}>
        <Button asChild className="gap-1.5">
          <Link href="/admin/blogs/create">
            <Plus className="h-4 w-4" />
            Add blog
          </Link>
        </Button>
      </AdminPageToolbar>

      <div className={`${adminCard} p-4`}>
        <div className="flex flex-wrap gap-2">
          <Input layout="field"
            placeholder="Search blogs…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button
            type="button"
            onClick={() => {
              setAppliedQ(q);
              setPage(1);
            }}
          >
            Search
          </Button>
        </div>
      </div>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>#</th>
              <th className={adminTableHead}>Blog name</th>
              <th className={adminTableHead}>Category</th>
              <th className={adminTableHead}>Description</th>
              <th className={adminTableHead}>Status</th>
              <th className={adminTableHead}>Actions</th>
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
                  No blogs
                </td>
              </tr>
            ) : (
              items.map((r) => {
                const img = legacyBlogImageUrl(r.coverImg);
                return (
                  <tr key={r.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2">{r.rowNum}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {img && (
                          <Image
                            src={img}
                            alt=""
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded object-cover"
                            unoptimized
                          />
                        )}
                        <Link
                          href={`/admin/blogs/${r.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {r.title ?? "—"}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2">{r.categoryTitle ?? "—"}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-zinc-600">
                      {r.descriptionPreview || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.isActive === 1 ? (
                        <span className="text-emerald-700">Active</span>
                      ) : (
                        <span className="text-zinc-500">Inactive</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Link
                          href={`/admin/blogs/${r.id}`}
                          className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/blogs/${r.id}/edit`}
                          className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                        type="button"
                        onClick={() => onDelete(r.id)}
                        className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <AdminPagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PER_PAGE))}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>
    </div>
  );
}
