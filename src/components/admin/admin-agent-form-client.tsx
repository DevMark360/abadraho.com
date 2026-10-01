"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminMultiSelect } from "@/components/admin/admin-multi-select";
import { AdminSelect } from "@/components/admin/admin-select";
import { AdminFormSection, FieldLabel, preventImplicitFormSubmit } from "@/components/admin/admin-form-section";
import { AdminBackLink, AdminErrorAlert, adminPanel } from "@/components/admin/admin-ui";

export function AdminAgentFormClient({
  agentId,
  mode,
}: {
  agentId?: number;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [contactPersonName, setContactPersonName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [agentSinceYears, setAgentSinceYears] = useState("");
  const [dealsIn, setDealsIn] = useState("");
  const [password, setPassword] = useState("");
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [commissionType, setCommissionType] = useState<"percentage" | "fixed">("percentage");
  const [defaultCommission, setDefaultCommission] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountTitle, setAccountTitle] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [agentTier, setAgentTier] = useState("bronze");
  const [isActive, setIsActive] = useState(true);
  const [areas, setAreas] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<"brokers" | "users">("brokers");

  useEffect(() => {
    if (mode === "create") {
      fetch("/api/admin/agents")
        .then((r) => r.json())
        .then((j) => {
          setAreas(j.areas ?? []);
          if (j.storageMode === "users" || j.storageMode === "brokers") setStorageMode(j.storageMode);
        });
      return;
    }
    if (!agentId) return;
    fetch(`/api/admin/agents/${agentId}`)
      .then((r) => r.json())
      .then((data) => {
        const a = data.agent;
        if (!a) {
          setError(data.message ?? "Not found");
          setLoading(false);
          return;
        }
        setContactPersonName(a.contactPersonName ?? "");
        setContactNumber(a.contactNumber ?? "");
        setContactEmail(a.contactEmail ?? "");
        setCompanyName(a.companyName ?? "");
        setCompanyAddress(a.companyAddress ?? "");
        setAgentSinceYears(a.agentSinceYears != null ? String(a.agentSinceYears) : "");
        setDealsIn(Array.isArray(a.dealsIn) ? a.dealsIn.join(", ") : "");
        setAreaIds(a.areaIds ?? []);
        setCommissionType(a.commissionType === "fixed" ? "fixed" : "percentage");
        setDefaultCommission(a.defaultCommission != null ? String(a.defaultCommission) : "");
        setBankName(a.bankName ?? "");
        setAccountTitle(a.accountTitle ?? "");
        setAccountNumber(a.accountNumber ?? "");
        setIban(a.iban ?? "");
        setPaymentNotes(a.paymentNotes ?? "");
        setAgentTier(a.agentTier ?? "bronze");
        setIsActive(a.isActive !== false);
        setAreas(data.areas ?? []);
        if (data.storageMode === "users" || data.storageMode === "brokers") {
          setStorageMode(data.storageMode);
        }
        setLoading(false);
      });
  }, [mode, agentId]);

  const usersOnly = storageMode === "users";

  async function save() {
    setSaving(true);
    const deals = dealsIn
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const url = mode === "create" ? "/api/admin/agents" : `/api/admin/agents/${agentId}`;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactPersonName,
        contactNumber,
        contactEmail,
        companyName,
        companyAddress,
        agentSinceYears,
        dealsIn: deals,
        password,
        areaIds,
        commissionType,
        defaultCommission,
        bankName,
        accountTitle,
        accountNumber,
        iban,
        paymentNotes,
        agentTier,
        isActive,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) {
      alert(json.message ?? "Save failed");
      return;
    }
    router.push("/admin/agents");
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await save();
  }

  if (loading) return <LoadingState size="sm" />;
  if (error) {
    return <AdminErrorAlert message={error} backHref="/admin/agents" backLabel="Agents" />;
  }

  return (
    <form onSubmit={onSubmit} onKeyDown={preventImplicitFormSubmit} className="mx-auto max-w-3xl space-y-6 pb-24">
      <AdminBackLink href="/admin/agents">Agents</AdminBackLink>

      {usersOnly && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Broker profile fields (company, deals, areas) are unavailable until the{" "}
          <code className="rounded bg-amber-100 px-1">brokers</code> table exists. Only the linked
          user account will be saved.
        </div>
      )}

      <AdminFormSection title="Contact">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <FieldLabel required>Contact person name</FieldLabel>
            <Input layout="field"
              value={contactPersonName}
              onChange={(e) => setContactPersonName(e.target.value)}
            />
          </label>
          <label className="block">
            <FieldLabel required>Phone</FieldLabel>
            <Input layout="field"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
            />
          </label>
          <label className="block">
            <FieldLabel required>Email</FieldLabel>
            <Input layout="field"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </label>
          <label className="block md:col-span-2">
            <FieldLabel required={mode === "create"} hint={mode === "edit" ? "Leave blank to keep" : "Min 8 chars"}>
              Login password
            </FieldLabel>
            <Input layout="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>
      </AdminFormSection>

      {!usersOnly && (
        <AdminFormSection title="Company">
          <label className="block">
            <FieldLabel>Company name</FieldLabel>
            <Input layout="field" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </label>
          <label className="block">
            <FieldLabel>Company address</FieldLabel>
            <Textarea layout="field"
              rows={3}
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
            />
          </label>
          <label className="block">
            <FieldLabel>Agent since (year)</FieldLabel>
            <Input layout="field"
              type="number"
              min={1950}
              max={2030}
              value={agentSinceYears}
              onChange={(e) => setAgentSinceYears(e.target.value)}
            />
          </label>
          <label className="block">
            <FieldLabel hint="Comma-separated">Deals in</FieldLabel>
            <Input layout="field" value={dealsIn} onChange={(e) => setDealsIn(e.target.value)} />
          </label>
          <AdminMultiSelect
            label="Expertise areas"
            options={areas}
            value={areaIds}
            onChange={setAreaIds}
            placeholder="Select areas"
          />
        </AdminFormSection>
      )}

      {!usersOnly && mode === "edit" && agentId ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <Link href={`/admin/agents/${agentId}/assignments`} className="text-sm font-semibold text-brand-accent hover:underline">
            Manage project assignments →
          </Link>
        </div>
      ) : null}

      {!usersOnly && (
        <>
          <AdminFormSection title="Commission settings">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Commission type</FieldLabel>
                <AdminSelect
                  value={commissionType}
                  onChange={(v) => setCommissionType(v as "percentage" | "fixed")}
                  options={[
                    { value: "percentage", label: "Percentage" },
                    { value: "fixed", label: "Fixed amount" },
                  ]}
                />
              </label>
              <label className="block">
                <FieldLabel>Default commission</FieldLabel>
                <Input layout="field" type="number" step="0.01" value={defaultCommission} onChange={(e) => setDefaultCommission(e.target.value)} />
              </label>
            </div>
          </AdminFormSection>

          <AdminFormSection title="Payment details">
            <div className="grid gap-4 md:grid-cols-2">
              <Input layout="field" placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              <Input layout="field" placeholder="Account title" value={accountTitle} onChange={(e) => setAccountTitle(e.target.value)} />
              <Input layout="field" placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
              <Input layout="field" placeholder="IBAN (optional)" value={iban} onChange={(e) => setIban(e.target.value)} />
              <label className="block md:col-span-2">
                <FieldLabel>Payment notes</FieldLabel>
                <Textarea layout="field" rows={2} value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
              </label>
            </div>
          </AdminFormSection>

          <AdminFormSection title="Performance">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Agent tier</FieldLabel>
                <AdminSelect
                  value={agentTier}
                  onChange={setAgentTier}
                  options={[
                    { value: "bronze", label: "Bronze" },
                    { value: "silver", label: "Silver" },
                    { value: "gold", label: "Gold" },
                    { value: "platinum", label: "Platinum" },
                  ]}
                />
              </label>
              <label className="flex items-center gap-2 pt-8">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                <span className="text-sm font-medium text-zinc-700">Active agent</span>
              </label>
            </div>
          </AdminFormSection>
        </>
      )}

      <div className={`sticky bottom-0 flex gap-3 ${adminPanel} bg-white/95 p-4 backdrop-blur`}>
                  <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save agent"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/agents">Cancel</Link>
          </Button>
      </div>
    </form>
  );
}
