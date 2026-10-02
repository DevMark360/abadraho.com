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

export function AdminInquiryDetailClient({ id }: { id: number }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [isFullStaff, setIsFullStaff] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/inquiries/${id}`)
      .then((r) => r.json())
      .then((j) => {
        setData(j.inquiry ?? null);
        if (typeof j.isFullStaff === "boolean") setIsFullStaff(j.isFullStaff);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingState size="sm" />;
  if (!data) return <p className="text-sm text-red-600">Not found</p>;

  return (
    <div className="space-y-4">
      <AdminBackLink href="/admin/inquiries">Property inquiries</AdminBackLink>
      <div className={adminCard}>
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold text-zinc-900">Customer interested in</h2>
          {!isFullStaff ? (
            <p className="mt-1 text-xs text-zinc-500">Contact details are managed by Abad Raho.</p>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <tbody>
              <Row label="Name" value={String(data.name ?? "—")} />
              {isFullStaff ? (
                <>
                  <Row label="Email" value={String(data.email ?? "—")} />
                  <Row label="Address" value={String(data.address ?? "—")} />
                  <Row label="Phone" value={String(data.phoneNumber ?? "—")} />
                </>
              ) : null}
              <Row label="Project" value={String(data.projectName ?? "—")} />
              <Row label="Unit" value={String(data.unitTitle ?? "—")} />
              <Row label="Inquiry date" value={fmtDate(data.createdAt as string)} />
              {isFullStaff ? (
                <>
                  {data.agentName || data.agentCode ? (
                    <Row
                      label="Referred by agent"
                      value={
                        [data.agentName, data.agentCode].filter(Boolean).join(" · ") || "—"
                      }
                    />
                  ) : null}
                  <Row
                    label="Message"
                    value={
                      <span className="whitespace-pre-wrap">{String(data.message ?? "—")}</span>
                    }
                  />
                </>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
