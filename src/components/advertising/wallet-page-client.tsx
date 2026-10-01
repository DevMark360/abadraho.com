"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

type WalletSummary = { id: number; builderId: number; balance: number; updatedAt: string };
type WalletTransaction = {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number | null;
  referenceNote: string | null;
  status: string;
  createdAt: string;
};

const TX_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  confirmed: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  rejected: "bg-red-50 text-red-800 ring-red-600/20",
};

const TX_TYPE_LABELS: Record<string, string> = {
  topup_bank_transfer: "Bank transfer top-up",
  topup_jazzcash: "JazzCash top-up",
  whatsapp_package_purchase: "WhatsApp card package",
  refund_undelivered: "Refund — undelivered impressions",
  spend: "Ad spend",
  adjustment: "Adjustment",
};

function WalletPageContent() {
  const searchParams = useSearchParams();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [referenceNote, setReferenceNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [jazzcashAmount, setJazzcashAmount] = useState("");
  const [jazzcashSubmitting, setJazzcashSubmitting] = useState(false);
  const [jazzcashError, setJazzcashError] = useState<string | null>(null);

  const jazzcashReturnStatus = searchParams.get("jazzcash");
  const jazzcashReturnMessage = searchParams.get("message");

  async function load() {
    const res = await fetch("/api/v1/advertising/wallet", { credentials: "same-origin" });
    const j = await res.json().catch(() => ({}));
    if (j.success) {
      setWallet(j.wallet);
      setTransactions(j.transactions.items);
    } else {
      setError(j.message ?? "Could not load wallet");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/advertising/wallet/topups", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), referenceNote }),
      });
      const j = await res.json().catch(() => ({}));
      if (!j.success) {
        setFormError(j.message ?? "Could not submit top-up");
        return;
      }
      setFormSuccess("Top-up submitted — an admin will confirm it once the transfer is verified.");
      setAmount("");
      setReferenceNote("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJazzcashSubmit(e: React.FormEvent) {
    e.preventDefault();
    setJazzcashError(null);
    setJazzcashSubmitting(true);
    try {
      const res = await fetch("/api/v1/advertising/wallet/topups/jazzcash", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(jazzcashAmount) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!j.success) {
        setJazzcashError(j.message ?? "Could not start JazzCash payment");
        return;
      }
      // Hosted checkout requires a real browser form POST (not fetch/AJAX) — JazzCash's page
      // needs to receive the fields as a top-level navigation, then redirect back to our
      // pp_ReturnURL once payment completes.
      const form = document.createElement("form");
      form.method = "POST";
      form.action = j.actionUrl;
      for (const [key, value] of Object.entries(j.fields as Record<string, string>)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } finally {
      setJazzcashSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error}
      </div>
    );
  }
  if (!wallet || !transactions) {
    return <LoadingState size="sm" label="Loading wallet…" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/advertising"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to advertising
      </Link>
      <h1 className="text-xl font-semibold text-zinc-900">Wallet</h1>

      <section className={cn(designTw.publicCard, "p-6")}>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Current balance
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
          Rs. {wallet.balance.toLocaleString()}
        </p>
      </section>

      {jazzcashReturnStatus === "confirmed" ? (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Payment confirmed — your wallet has been credited.
        </div>
      ) : jazzcashReturnStatus === "rejected" ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          Payment was not successful — no amount was deducted from your wallet.
        </div>
      ) : jazzcashReturnStatus === "error" ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          Payment could not be verified{jazzcashReturnMessage ? `: ${jazzcashReturnMessage}` : ""}.
        </div>
      ) : null}

      <section className={cn(designTw.publicCard, "space-y-4 p-6")}>
        <h2 className="text-sm font-semibold text-zinc-900">Pay online (JazzCash)</h2>
        <p className="text-xs text-zinc-500">
          Pay instantly via JazzCash mobile wallet — your balance is credited automatically as
          soon as the payment is confirmed, no admin action needed.
        </p>
        <form onSubmit={handleJazzcashSubmit} className="space-y-4">
          {jazzcashError ? <p className="text-sm text-red-700">{jazzcashError}</p> : null}
          <div>
            <label className="block text-sm font-medium text-zinc-700">Amount (Rs.)</label>
            <Input
              layout="field"
              type="number"
              min={1}
              value={jazzcashAmount}
              onChange={(e) => setJazzcashAmount(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className={designTw.btnPrimary} disabled={jazzcashSubmitting}>
            {jazzcashSubmitting ? "Redirecting…" : "Pay with JazzCash"}
          </Button>
        </form>
      </section>

      <section className={cn(designTw.publicCard, "space-y-4 p-6")}>
        <h2 className="text-sm font-semibold text-zinc-900">Submit a bank transfer top-up</h2>
        <p className="text-xs text-zinc-500">
          Transfer via IBFT to the company account, then submit the reference below. An admin
          will confirm it and credit your wallet.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
          {formSuccess ? <p className="text-sm text-emerald-700">{formSuccess}</p> : null}
          <div>
            <label className="block text-sm font-medium text-zinc-700">Amount (Rs.)</label>
            <Input
              layout="field"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Bank transfer reference
            </label>
            <Input
              layout="field"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="e.g. IBFT ref #, bank name, date"
              required
            />
          </div>
          <Button type="submit" className={designTw.btnPrimary} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit top-up"}
          </Button>
        </form>
      </section>

      <section className={cn(designTw.publicCard, "overflow-hidden")}>
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-semibold text-zinc-900">Transaction history</h2>
        </div>
        {transactions.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-500">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {transactions.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">
                    {TX_TYPE_LABELS[t.type] ?? t.type}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {t.referenceNote ?? "—"} ·{" "}
                    {new Date(t.createdAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900">
                    Rs. {t.amount.toLocaleString()}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                      TX_STATUS_BADGE[t.status] ?? TX_STATUS_BADGE.pending
                    )}
                  >
                    {t.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function WalletPageClient() {
  return (
    <Suspense fallback={<LoadingState size="sm" label="Loading wallet…" />}>
      <WalletPageContent />
    </Suspense>
  );
}
