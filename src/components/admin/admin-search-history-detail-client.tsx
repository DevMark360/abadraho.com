"use client";

import { LoadingState } from "@/components/ui/loading-state";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { AdminBackLink, adminCard } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtNum, joinNames } from "@/components/admin/admin-search-history-format";

type DetailRecord = {
  id: number;
  createdAt: string | null;
  searchType: string | null;
  userName: string;
  phone: string | null;
  email: string | null;
  areaNames: string[];
  progressNames: string[];
  typeNames: string[];
  builderList: string[];
  minDP: number | null;
  maxDP: number | null;
  minMI: number | null;
  maxMI: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  maxBudget: number | null;
  downPayment: number | null;
  projectType: string | null;
  duration: string[];
  slabCasting: number | null;
  plinth: number | null;
  colour: number | null;
  monthInstall: number | null;
  quarterlyInstall: number | null;
  halfYearlyInstall: number | null;
  yearlyInstall: number | null;
  possession: number | null;
  rawParams: Record<string, unknown>;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="border-t border-zinc-100">
      <th className="w-1/3 bg-zinc-50 px-4 py-3 text-left text-sm font-medium text-zinc-700">
        {label}
      </th>
      <td className="px-4 py-3 text-sm text-zinc-900">{value}</td>
    </tr>
  );
}

export function AdminSearchHistoryDetailClient({ id }: { id: number }) {
  const router = useRouter();
  const [record, setRecord] = useState<DetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search-history/${id}`);
        const json = await res.json();
        if (!json.success) {
          setError(json.message ?? "Not found");
          setRecord(null);
        } else {
          setRecord(json.record);
        }
      } catch {
        setError("Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <LoadingState size="sm" />;
  }

  if (error || !record) {
    return (
      <div className="space-y-3">
        <AdminBackLink href="/admin/search-history">Search history</AdminBackLink>
        <p className="text-sm text-red-600">{error ?? "Not found"}</p>
      </div>
    );
  }

  const isCalculator = record.searchType === "calculator";

  async function onDelete() {
    if (!confirm("Delete this search history record?")) return;
    const res = await fetch(`/api/admin/search-history/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      alert(json.message ?? "Delete failed");
      return;
    }
    router.push("/admin/search-history");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminBackLink href="/admin/search-history">Search history</AdminBackLink>
        <Button type="button" variant="outline" className="gap-1.5 text-red-600" onClick={() => void onDelete()}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className={adminCard}>
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold text-zinc-900">User search details</h2>
          <p className="text-sm text-zinc-500">
            #{record.id} · {fmtDate(record.createdAt)}
            {record.searchType ? ` · ${record.searchType}` : ""}
          </p>
        </div>
        <table className="min-w-full">
          <tbody>
            <DetailRow label="User name" value={record.userName} />
            <DetailRow label="Phone" value={record.phone ?? "—"} />
            <DetailRow label="Email" value={record.email ?? "—"} />
            <DetailRow label="Area" value={joinNames(record.areaNames)} />
            <DetailRow label="Progress" value={joinNames(record.progressNames)} />
            <DetailRow label="Type" value={joinNames(record.typeNames)} />
            <DetailRow label="Builder" value={joinNames(record.builderList)} />
            {!isCalculator ? (
              <>
                <DetailRow
                  label="Down payment"
                  value={`${fmtNum(record.minDP)} – ${fmtNum(record.maxDP)}`}
                />
                <DetailRow
                  label="Monthly installment"
                  value={`${fmtNum(record.minMI)} – ${fmtNum(record.maxMI)}`}
                />
                <DetailRow
                  label="Price"
                  value={`${fmtNum(record.minPrice)} – ${fmtNum(record.maxPrice)}`}
                />
              </>
            ) : (
              <>
                <DetailRow label="Max budget" value={fmtNum(record.maxBudget)} />
                <DetailRow label="Project type" value={record.projectType ?? "—"} />
                <DetailRow
                  label="Duration"
                  value={record.duration.length ? `${record.duration.join(", ")} months` : "—"}
                />
                <DetailRow label="Down payment" value={fmtNum(record.downPayment)} />
                <DetailRow label="Monthly installment" value={fmtNum(record.monthInstall)} />
                <DetailRow label="Quarterly installment" value={fmtNum(record.quarterlyInstall)} />
                <DetailRow
                  label="Half-yearly installment"
                  value={fmtNum(record.halfYearlyInstall)}
                />
                <DetailRow label="Yearly installment" value={fmtNum(record.yearlyInstall)} />
                <DetailRow label="Possession" value={fmtNum(record.possession)} />
                <DetailRow label="Slab casting" value={fmtNum(record.slabCasting)} />
                <DetailRow label="Plinth" value={fmtNum(record.plinth)} />
                <DetailRow label="Colour" value={fmtNum(record.colour)} />
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className={adminCard}>
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-800">Raw JSON parameters</h3>
        </div>
        <pre className="max-h-96 overflow-auto p-4 text-xs text-zinc-700">
          {JSON.stringify(record.rawParams, null, 2)}
        </pre>
      </div>
    </div>
  );
}
