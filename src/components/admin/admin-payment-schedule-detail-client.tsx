"use client";
import { LoadingState } from "@/components/ui/loading-state";

import { useEffect, useState } from "react";
import { AdminBackLink, adminCard } from "@/components/admin/admin-ui";
import { fmtDate, fmtNum } from "@/components/admin/admin-search-history-format";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="border-t border-zinc-100">
      <th className="w-1/3 bg-zinc-50 px-4 py-3 text-left text-sm font-medium text-zinc-700">{label}</th>
      <td className="px-4 py-3 text-sm">{value}</td>
    </tr>
  );
}

export function AdminPaymentScheduleDetailClient({ id }: { id: number }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/payment-schedules/${id}`)
      .then((r) => r.json())
      .then((j) => {
        setData(j.record ?? null);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingState size="sm" />;
  if (!data) return <p className="text-sm text-red-600">Not found</p>;

  return (
    <div className="space-y-4">
      <AdminBackLink href="/admin/payment-schedules">Payment schedules</AdminBackLink>
      <div className={adminCard}>
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold text-zinc-900">Payment schedule details</h2>
          <p className="text-sm text-zinc-500">{fmtDate(data.createdAt as string)}</p>
        </div>
        <table className="min-w-full">
          <tbody>
            <Row label="User" value={String(data.userName)} />
            <Row label="Phone" value={String(data.phone ?? "—")} />
            <Row label="Email" value={String(data.email ?? "—")} />
            <Row label="Project" value={String(data.projectName ?? "—")} />
            <Row label="Unit" value={String(data.unitTitle ?? "—")} />
            <Row label="Duration" value={String(data.duration)} />
            <Row label="Down payment" value={fmtNum(data.downPayment as number)} />
            <Row label="Monthly installment" value={fmtNum(data.monthlyInstallment as number)} />
            <Row label="Quarterly installment" value={fmtNum(data.quarterlyInstallment as number)} />
            <Row label="Half-yearly installment" value={fmtNum(data.halfYearlyInstallment as number)} />
            <Row label="Yearly installment" value={fmtNum(data.yearlyInstallment as number)} />
            <Row label="Possession" value={fmtNum(data.possession as number)} />
            <Row label="Loan amount" value={fmtNum(data.loanAmount as number)} />
            <Row label="Slab casting" value={fmtNum(data.slabCasting as number)} />
            <Row label="Plinth" value={fmtNum(data.plinth as number)} />
            <Row label="Colour" value={fmtNum(data.colour as number)} />
            <Row label="Start of work" value={fmtNum(data.startOfWork as number)} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
