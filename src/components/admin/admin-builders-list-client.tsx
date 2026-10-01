"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminDbAlert, AdminPageToolbar, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";
import { cn } from "@/lib/utils";
import { buildUniqueBuilderSlugs } from "@/lib/builder-slug";
import { builderPublicPath } from "@/config/builder-pages";

type BuilderRow = {
  rowNum: number;
  id: number;
  fullName: string;
  contactPersonName: string | null;
  contactPersonEmail: string | null;
  contactPersonPhone: string | null;
};

export function AdminBuildersListClient() {
  const [items, setItems] = useState<BuilderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/builders");
    const json = await res.json();
    if (!json.success) setError(json.error ?? json.message ?? "Failed to load");
    else setItems(json.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pageSlugById = useMemo(() => {
    return new Map(
      buildUniqueBuilderSlugs(items.map((row) => ({ id: row.id, fullName: row.fullName }))).map(
        (entry) => [entry.id, entry.slug]
      )
    );
  }, [items]);

  async function onDelete(id: number, name: string) {
    if (!confirm(`Archive builder "${name}"?`)) return;
    const res = await fetch(`/api/admin/builders/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else load();
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={items.length}>
        <AdminCan module="builders" action="add">
          <Button asChild className="gap-1.5">
            <Link href="/admin/builders/create">
              <Plus className="h-4 w-4" />
              Add builder
            </Link>
          </Button>
        </AdminCan>
      </AdminPageToolbar>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>#</th>
              <th className={adminTableHead}>Builder name</th>
              <th className={adminTableHead}>Contact person</th>
              <th className={adminTableHead}>Email</th>
              <th className={adminTableHead}>Phone</th>
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
                  No builders
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{row.rowNum}</td>
                  <td className="px-3 py-2 font-medium">
                    <div className="flex items-center gap-2">
                      <span>{row.fullName}</span>
                      <Link
                        href={builderPublicPath(pageSlugById.get(row.id) ?? `builder-${row.id}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline"
                      >
                        View page
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-2">{row.contactPersonName ?? "—"}</td>
                  <td className="px-3 py-2">{row.contactPersonEmail ?? "—"}</td>
                  <td className="px-3 py-2">{row.contactPersonPhone ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <AdminCan module="builders" action="edit">
                        <Link
                          href={`/admin/builders/${row.id}/edit`}
                          className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </AdminCan>
                      <AdminCan module="builders" action="delete">
                        <button
                          type="button"
                          onClick={() => onDelete(row.id, row.fullName)}
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
