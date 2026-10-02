"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Copy } from "lucide-react";
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
  transactionId: string | null;
  hasProof: boolean;
  status: string;
  createdAt: string;
};
type PaymentAccount = { label: string; fields: Array<{ name: string; value: string }> };

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

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

  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [jazzcashOnline, setJazzcashOnline] = useState(false);

  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
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
      setPaymentAccounts(j.paymentAccounts ?? []);
      setJazzcashOnline(Boolean(j.jazzcashOnline));
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
    const form = e.currentTarget as HTMLFormElement;
    setSubmitting(true);
    try {
      // Multipart (no Content-Type header — the browser sets the boundary).
      const res = await fetch("/api/v1/advertising/wallet/topups", {
        method: "POST",
        credentials: "same-origin",
        body: new FormData(form),
      });
      const j = await res.json().catch(() => ({}));
      if (!j.success) {
        setFormError(j.message ?? "Could not submit top-up");
        return;
      }
      setFormSuccess(
        "Payment submitted — an admin will check it and credit your wallet. You'll get a notification."
      );
      setAmount("");
      setTransactionId("");
      setReferenceNote("");
      form.reset();
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

      {jazzcashOnline ? (
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
      ) : null}

      <section className={cn(designTw.publicCard, "space-y-4 p-6")}>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">1. Send the payment</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Transfer the amount you want to add to one of these accounts (bank transfer / IBFT,
            JazzCash or Easypaisa). Keep the receipt — you&apos;ll need its transaction ID and a
            screenshot.
          </p>
        </div>
        {paymentAccounts.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Payment account details aren&apos;t available right now — please contact support
            before sending money.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {paymentAccounts.map((acc, i) => (
              <div key={`${acc.label}-${i}`} className="rounded-xl border border-zinc-200 p-4">
                <p className="text-sm font-semibold text-zinc-900">{acc.label}</p>
                <dl className="mt-2 space-y-2">
                  {acc.fields.map((f) => (
                    <div key={f.name}>
                      <dt className="text-[11px] uppercase tracking-wide text-zinc-400">{f.name}</dt>
                      <dd className="flex flex-wrap items-center justify-between gap-2">
                        <span className="break-all font-mono text-sm text-zinc-900">{f.value}</span>
                        <CopyValue value={f.value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={cn(designTw.publicCard, "space-y-4 p-6")}>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">2. Submit your payment details</h2>
          <p className="mt-1 text-xs text-zinc-500">
            An admin checks the payment arrived, then credits your wallet. You&apos;ll get a
            notification when it&apos;s confirmed or rejected.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
          {formSuccess ? <p className="text-sm text-emerald-700">{formSuccess}</p> : null}
          <div>
            <label className="block text-sm font-medium text-zinc-700">Amount sent (Rs.)</label>
            <Input
              layout="field"
              name="amount"
              type="number"
              min={1}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Transaction ID / reference number
            </label>
            <Input
              layout="field"
              name="transactionId"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="As shown on your receipt"
              minLength={4}
              maxLength={40}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Payment screenshot
            </label>
            <input
              name="proof"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required
              className="mt-1.5 block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-200"
            />
            <p className="mt-1 text-xs text-zinc-400">JPG, PNG, WebP or PDF — max 5MB.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Note <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <Input
              layout="field"
              name="referenceNote"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="e.g. paid from Meezan Bank, account title"
              maxLength={500}
            />
          </div>
          <Button type="submit" className={designTw.btnPrimary} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit payment"}
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
                  {t.transactionId ? (
                    <p className="mt-0.5 text-xs text-zinc-700">
                      TID: <span className="font-mono">{t.transactionId}</span>
                      {t.hasProof ? (
                        <>
                          {" · "}
                          <a
                            href={`/api/v1/advertising/wallet/topups/${t.id}/proof`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-accent hover:underline"
                          >
                            View screenshot
                          </a>
                        </>
                      ) : null}
                    </p>
                  ) : null}
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
