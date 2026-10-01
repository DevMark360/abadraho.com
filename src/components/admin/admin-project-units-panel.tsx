"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { AdminLinkAction, adminTableHead } from "@/components/admin/admin-ui";

type UnitRow = {
  id: number;
  title: string | null;
  price: number | null;
  rooms: string | null;
  unitTypeTitle: string | null;
};

export function AdminProjectUnitsPanel({ projectId }: { projectId: number }) {
  const [items, setItems] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/units?projectId=${projectId}&perPage=200`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? json.message ?? "Could not load units");
      setItems([]);
    } else {
      setItems(json.items ?? []);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminFormSection title="Project units">
      <p className="mb-3 text-sm text-zinc-500">
        Add and edit units for this project. The main project form does not list units — use this
        section or{" "}
        <Link href="/admin/units" className="font-medium text-zinc-800 underline">
          All units
        </Link>
        .
      </p>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="mb-3 flex flex-wrap gap-2">
        <Button asChild className="gap-1.5">
          <Link href={`/admin/units/create?projectId=${projectId}`}>
            <Plus className="h-4 w-4" />
            Add unit
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/admin/units?projectId=${projectId}`}>View all units</Link>
        </Button>
      </div>

      {loading ? (
        <LoadingState size="sm" label="Loading units…" />
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          No units for this project yet. Click <strong>Add unit</strong> above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={adminTableHead}>ID</th>
                <th className={adminTableHead}>Title</th>
                <th className={adminTableHead}>Type</th>
                <th className={adminTableHead}>Price</th>
                <th className={adminTableHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{u.id}</td>
                  <td className="px-3 py-2">{u.title ?? "—"}</td>
                  <td className="px-3 py-2">{u.unitTypeTitle ?? "—"}</td>
                  <td className="px-3 py-2">
                    {u.price != null ? u.price.toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/units/${u.id}/edit`}
                      className="inline-flex items-center gap-1 text-zinc-700 hover:underline"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminFormSection>
  );
}
