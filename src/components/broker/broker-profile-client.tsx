"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { BrokerGate } from "@/components/broker/broker-gate";
import { BrokerSubpageShell, brokerPageIcon } from "@/components/broker/broker-subpage-shell";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AGENT_TIER_LABELS } from "@/config/broker-agent";
import { formatPrice } from "@/lib/utils";

export function BrokerProfileClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    bankName: "",
    accountTitle: "",
    accountNumber: "",
    iban: "",
    agentTier: "bronze",
    agentCode: "",
    referralUrl: "",
    referralClicks: 0,
    dealsClosedAllTime: 0,
    totalEarned: 0,
    memberSince: null as number | null,
  });

  useEffect(() => {
    fetch("/api/v1/broker/ops?resource=profile", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => {
        if (j.profile) setProfile(j.profile);
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/v1/broker/ops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "profile",
        bankName: profile.bankName,
        accountTitle: profile.accountTitle,
        accountNumber: profile.accountNumber,
        iban: profile.iban,
      }),
    });
    setSaving(false);
  }

  if (loading) return <BrokerGate><LoadingState size="sm" /></BrokerGate>;

  const waShare = `https://wa.me/?text=${encodeURIComponent(`Explore off-plan properties: ${profile.referralUrl}`)}`;

  return (
    <BrokerGate>
      <BrokerSubpageShell
        title="My profile"
        description="Payment details, performance, and referral link"
        icon={brokerPageIcon(User)}
      >
        <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900">Payment details</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input placeholder="Bank name" value={profile.bankName} onChange={(e) => setProfile({ ...profile, bankName: e.target.value })} />
            <Input placeholder="Account title" value={profile.accountTitle} onChange={(e) => setProfile({ ...profile, accountTitle: e.target.value })} />
            <Input placeholder="Account number" value={profile.accountNumber} onChange={(e) => setProfile({ ...profile, accountNumber: e.target.value })} />
            <Input placeholder="IBAN (optional)" value={profile.iban} onChange={(e) => setProfile({ ...profile, iban: e.target.value })} />
          </div>
          <Button className="mt-4" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save payment details"}</Button>
        </section>

        <section className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <h2 className="font-semibold text-zinc-900">My performance</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            <div><dt className="text-zinc-500">Tier</dt><dd className="font-semibold">{AGENT_TIER_LABELS[profile.agentTier as keyof typeof AGENT_TIER_LABELS] ?? profile.agentTier}</dd></div>
            <div><dt className="text-zinc-500">Deals closed</dt><dd className="font-semibold">{profile.dealsClosedAllTime}</dd></div>
            <div><dt className="text-zinc-500">Total commission</dt><dd className="font-semibold">{formatPrice(profile.totalEarned, "PKR")}</dd></div>
            <div><dt className="text-zinc-500">Member since</dt><dd className="font-semibold">{profile.memberSince ?? "—"}</dd></div>
            <div><dt className="text-zinc-500">Agent code</dt><dd className="font-mono font-semibold">{profile.agentCode}</dd></div>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900">Referral link</h2>
          <p className="mt-2 break-all rounded-lg bg-zinc-50 px-3 py-2 font-mono text-sm">{profile.referralUrl}</p>
          <p className="mt-2 text-sm text-zinc-500">{profile.referralClicks} clicks via your link</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(profile.referralUrl)}>Copy link</Button>
            <Button asChild variant="outline"><a href={waShare} target="_blank" rel="noreferrer">Share on WhatsApp</a></Button>
          </div>
        </section>
      </BrokerSubpageShell>
    </BrokerGate>
  );
}
