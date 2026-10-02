"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ReceiptText,
  TriangleAlert,
  UsersRound,
  Wallet,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { LoadingState } from "@/components/ui/loading-state";
import type { FinanceSummary } from "@/server/services/admin-finance.service";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function DetailToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-2 flex w-full items-center justify-between border-t border-zinc-100 pt-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
    >
      <span>{open ? "Hide details" : "View details"}</span>
      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

function DetailRow({ title, subtitle, amount, date }: { title: string; subtitle: string; amount: number; date: string }) {
  return (
    <li className="border-b border-zinc-50 py-1.5 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium text-zinc-700">{title}</span>
        <span className="shrink-0 font-semibold tabular-nums text-zinc-800">{formatPrice(amount)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-zinc-400">
        <span className="min-w-0 truncate">{subtitle}</span>
        <span className="shrink-0 whitespace-nowrap">{fmtDate(date)}</span>
      </div>
    </li>
  );
}

function DetailList({ children, empty }: { children: ReactNode; empty: boolean }) {
  if (empty) {
    return <p className="mt-2 text-[11px] text-zinc-400">Nothing recorded yet</p>;
  }
  return <ul className="mt-2 max-h-44 space-y-0 overflow-y-auto pr-1 text-[11px]">{children}</ul>;
}

export function AdminFinanceClient() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openCollected, setOpenCollected] = useState(false);
  const [openRefunded, setOpenRefunded] = useState(false);
  const [openEarned, setOpenEarned] = useState(false);

  useEffect(() => {
    fetch("/api/admin/finance")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSummary(json.summary);
        else setError(json.message ?? "Failed to load");
      })
      .catch(() => setError("Failed to load"));
  }, []);

  if (error) {
    return <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  }

  if (!summary) {
    return (
      <div className={`${adminCard} p-8`}>
        <LoadingState size="sm" inline className="w-full" />
      </div>
    );
  }

  const balanced = Math.abs(summary.reconciliation.difference) < 1;

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        The admin side of ad-wallet money movement — what came in, what went back out, what was earned, and
        whether it all reconciles against the current wallet balances.
      </p>

      <div
        className={`flex items-center gap-3 rounded-lg border p-3.5 text-sm ${
          balanced ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        {balanced ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <TriangleAlert className="h-4 w-4 shrink-0" />}
        <span>
          {balanced ? (
            <>
              Books match — collected minus refunded minus earned equals the current builder wallet balances (
              {formatPrice(summary.reconciliation.actualLiability)}).
            </>
          ) : (
            <>
              Discrepancy of {formatPrice(Math.abs(summary.reconciliation.difference))}: expected wallet liability
              is {formatPrice(summary.reconciliation.expectedLiability)}, actual is{" "}
              {formatPrice(summary.reconciliation.actualLiability)}.
            </>
          )}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Wallet className="h-3.5 w-3.5" /> Net available (collected − refunded)
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-zinc-900">
            {formatPrice(summary.netAvailable.totalAllTime)}
          </p>
          <p className="text-[11px] text-zinc-400">{formatPrice(summary.netAvailable.totalThisMonth)} this month</p>
          <ul className="mt-2.5 space-y-1 border-t border-zinc-100 pt-2 text-[11px]">
            <li className="flex items-center justify-between text-zinc-600">
              <span>Collected</span>
              <span className="font-semibold tabular-nums text-emerald-600">
                +{formatPrice(summary.collections.totalAllTime)}
              </span>
            </li>
            <li className="flex items-center justify-between text-zinc-600">
              <span>Refunded</span>
              <span className="font-semibold tabular-nums text-red-600">
                −{formatPrice(summary.refunds.totalAllTime)}
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <ArrowDownToLine className="h-3.5 w-3.5" /> Collected (confirmed top-ups)
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-emerald-600">
            {formatPrice(summary.collections.totalAllTime)}
          </p>
          <p className="text-[11px] text-zinc-400">{formatPrice(summary.collections.totalThisMonth)} this month</p>
          <ul className="mt-2.5 space-y-1 border-t border-zinc-100 pt-2 text-[11px]">
            {summary.collections.bySource.map((s) => (
              <li key={s.label} className="flex items-center justify-between text-zinc-600">
                <span>
                  {s.label} <span className="text-zinc-400">({s.count})</span>
                </span>
                <span className="font-semibold tabular-nums text-zinc-800">{formatPrice(s.amount)}</span>
              </li>
            ))}
            {summary.collections.bySource.length === 0 && <li className="text-zinc-400">No confirmed top-ups yet</li>}
          </ul>

          <DetailToggle open={openCollected} onToggle={() => setOpenCollected((v) => !v)} />
          {openCollected && (
            <DetailList empty={summary.collections.recent.length === 0}>
              {summary.collections.recent.map((r) => (
                <DetailRow
                  key={r.id}
                  title={r.builderName}
                  subtitle={`${r.type} · #${r.id}`}
                  amount={r.amount}
                  date={r.date}
                />
              ))}
            </DetailList>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <ArrowUpFromLine className="h-3.5 w-3.5" /> Refunded to builders
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-red-600">
            {formatPrice(summary.refunds.totalAllTime)}
          </p>
          <p className="text-[11px] text-zinc-400">{formatPrice(summary.refunds.totalThisMonth)} this month</p>
          <ul className="mt-2.5 max-h-28 space-y-1 overflow-y-auto border-t border-zinc-100 pt-2 text-[11px]">
            {summary.refunds.byBuilder.map((b) => (
              <li key={b.builderId} className="flex items-center justify-between text-zinc-600">
                <span>
                  {b.builderName} <span className="text-zinc-400">({b.count})</span>
                </span>
                <span className="font-semibold tabular-nums text-zinc-800">{formatPrice(b.amount)}</span>
              </li>
            ))}
            {summary.refunds.byBuilder.length === 0 && <li className="text-zinc-400">No refunds issued yet</li>}
          </ul>

          <DetailToggle open={openRefunded} onToggle={() => setOpenRefunded((v) => !v)} />
          {openRefunded && (
            <DetailList empty={summary.refunds.recent.length === 0}>
              {summary.refunds.recent.map((r) => (
                <DetailRow
                  key={r.id}
                  title={r.builderName}
                  subtitle={r.campaignTitle ? `Campaign: ${r.campaignTitle}` : "—"}
                  amount={r.amount}
                  date={r.date}
                />
              ))}
            </DetailList>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <CircleDollarSign className="h-3.5 w-3.5" /> Earned (spend recognized)
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-indigo-700">
            {formatPrice(summary.earned.totalAllTime)}
          </p>
          <p className="text-[11px] text-zinc-400">{formatPrice(summary.earned.totalThisMonth)} this month</p>
          <ul className="mt-2.5 space-y-1 border-t border-zinc-100 pt-2 text-[11px]">
            <li className="flex items-center justify-between text-zinc-600">
              <span>Ad serving spend</span>
              <span className="font-semibold tabular-nums text-zinc-800">
                {formatPrice(summary.earned.adSpendAllTime)}
              </span>
            </li>
            <li className="flex items-center justify-between text-zinc-600">
              <span>WhatsApp card packages</span>
              <span className="font-semibold tabular-nums text-zinc-800">
                {formatPrice(summary.earned.whatsappPackagesAllTime)}
              </span>
            </li>
          </ul>

          <DetailToggle open={openEarned} onToggle={() => setOpenEarned((v) => !v)} />
          {openEarned && (
            <div className="mt-2 space-y-2.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Ad spend</p>
                <DetailList empty={summary.earned.recentAdSpend.length === 0}>
                  {summary.earned.recentAdSpend.map((r) => (
                    <DetailRow
                      key={r.id}
                      title={r.builderName}
                      subtitle={r.campaignTitle ? `Campaign: ${r.campaignTitle}` : "—"}
                      amount={r.amount}
                      date={r.date}
                    />
                  ))}
                </DetailList>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  WhatsApp packages
                </p>
                <DetailList empty={summary.earned.recentWhatsapp.length === 0}>
                  {summary.earned.recentWhatsapp.map((r) => (
                    <DetailRow key={r.id} title={r.builderName} subtitle="WhatsApp card package" amount={r.amount} date={r.date} />
                  ))}
                </DetailList>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
            <UsersRound className="h-3.5 w-3.5" /> Broker commissions
          </h3>
          <Link href="/admin/commissions" className="text-[11px] font-medium text-indigo-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
          <div className="rounded-md border border-zinc-100 bg-zinc-50 p-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">Pending</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">
              {formatPrice(summary.brokerCommissions.pendingAmount)}
            </p>
          </div>
          <div className="rounded-md border border-zinc-100 bg-zinc-50 p-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">Confirmed</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">
              {formatPrice(summary.brokerCommissions.confirmedAmount)}
            </p>
          </div>
          <div className="rounded-md border border-zinc-100 bg-zinc-50 p-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">Paid ({summary.brokerCommissions.paidCount})</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">
              {formatPrice(summary.brokerCommissions.paidAmount)}
            </p>
          </div>
        </div>

        <table className="mt-3 min-w-full text-left text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>Broker</th>
              <th className={adminTableHead}>Amount</th>
              <th className={adminTableHead}>Paid on</th>
              <th className={adminTableHead}>Reference</th>
            </tr>
          </thead>
          <tbody>
            {summary.brokerCommissions.recentPaid.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-zinc-400">
                  <ReceiptText className="mx-auto mb-1 h-4 w-4" />
                  No commissions paid out yet
                </td>
              </tr>
            ) : (
              summary.brokerCommissions.recentPaid.map((r, i) => (
                <tr key={i} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{r.brokerName}</td>
                  <td className="px-3 py-2 font-medium tabular-nums">{formatPrice(r.amount)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-500">{fmtDate(r.paidAt)}</td>
                  <td className="px-3 py-2 text-zinc-500">{r.paymentReference ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
