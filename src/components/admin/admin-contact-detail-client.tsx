"use client";
import { LoadingState } from "@/components/ui/loading-state";

import { useEffect, useState } from "react";
import { AdminBackLink, adminCard } from "@/components/admin/admin-ui";
import { fmtDate } from "@/components/admin/admin-search-history-format";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="border-t border-zinc-100">
      <th className="w-1/3 bg-zinc-50 px-3 py-3 text-left align-top text-sm font-medium text-zinc-700 sm:px-4">{label}</th>
      <td className="px-3 py-3 text-sm [overflow-wrap:anywhere] sm:px-4">{value}</td>
    </tr>
  );
}

export function AdminContactDetailClient({ id }: { id: number }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/contact/${id}`)
      .then((r) => r.json())
      .then((j) => {
        setData(j.contact ?? null);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingState size="sm" />;
  if (!data) return <p className="text-sm text-red-600">Not found</p>;

  return (
    <div className="space-y-4">
      <AdminBackLink href="/admin/contact">Contact inquiries</AdminBackLink>
      <div className={adminCard}>
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold text-zinc-900">Contact inquiry</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <tbody>
              <Row label="Date" value={fmtDate(data.createdAt as string)} />
              <Row label="Name" value={String(data.name ?? "—")} />
              <Row label="Email" value={String(data.email ?? "—")} />
              <Row label="Phone" value={String(data.phone ?? "—")} />
              <Row label="Subject" value={String(data.subject ?? "—")} />
              <Row label="Message" value={<span className="whitespace-pre-wrap">{String(data.message ?? "—")}</span>} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
