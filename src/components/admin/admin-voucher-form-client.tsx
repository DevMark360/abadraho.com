"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { AdminSelect } from "@/components/admin/admin-select";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminBackLink, AdminDbAlert, adminCard } from "@/components/admin/admin-ui";
import { preventImplicitFormSubmit } from "@/components/admin/admin-form-section";

type ProjectOption = { id: number; name: string; disabled: boolean };

type UnitOption = { id: number; title: string; hasOtherVoucher: boolean };

type VoucherItem = {
  id: number;
  projectId: number | null;
  name: string;
  discountBy: string;
  discountApplied: string;
  discountValue: string;
  unitIds: number[];
  status: number;
  expiresAt: string;
  isCustomerDownload?: boolean;
};

export function AdminVoucherFormClient({
  mode,
  voucherId,
}: {
  mode: "create" | "edit";
  voucherId?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);

  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [discountApplied, setDiscountApplied] = useState<"project" | "unit">("unit");
  const [discountBy, setDiscountBy] = useState<"amount" | "percentage">("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [status, setStatus] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");

  const loadUnits = useCallback(
    async (pid: string) => {
      if (!pid) {
        setUnits([]);
        return;
      }
      const params = new URLSearchParams({ projectId: pid });
      if (voucherId) params.set("excludeVoucherId", String(voucherId));
      const res = await fetch(`/api/admin/vouchers/project-units?${params}`);
      const json = await res.json();
      setUnits(json.units ?? []);
    },
    [voucherId]
  );

  useEffect(() => {
    async function init() {
      if (mode === "edit" && voucherId) {
        const res = await fetch(`/api/admin/vouchers/${voucherId}`);
        const json = await res.json();
        if (!json.success || !json.item) {
          setError(json.message ?? "Failed to load voucher");
          setLoading(false);
          return;
        }
        const v = json.item as VoucherItem;
        if (v.isCustomerDownload) {
          setError("This voucher was created by a customer download and cannot be edited.");
          setLoading(false);
          return;
        }
        setName(v.name);
        setProjectId(v.projectId ? String(v.projectId) : "");
        setDiscountApplied(v.discountApplied === "unit" ? "unit" : "project");
        setDiscountBy(v.discountBy === "percentage" ? "percentage" : "amount");
        setDiscountValue(v.discountValue);
        setUnitIds(v.unitIds.map(String));
        setStatus(String(v.status));
        setExpiresAt(v.expiresAt ? v.expiresAt.slice(0, 10) : "");
        if (v.projectId) await loadUnits(String(v.projectId));

        const listRes = await fetch(
          `/api/admin/vouchers?perPage=1&page=1&excludeVoucherId=${voucherId}`
        );
        const listJson = await listRes.json();
        if (listJson.projects) setProjects(listJson.projects);
      } else {
        const listRes = await fetch("/api/admin/vouchers?perPage=1&page=1");
        const listJson = await listRes.json();
        if (listJson.projects) setProjects(listJson.projects);
      }
      setLoading(false);
    }
    init();
  }, [mode, voucherId, loadUnits]);

  useEffect(() => {
    if (projectId) loadUnits(projectId);
    else setUnits([]);
  }, [projectId, loadUnits]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const expires =
      expiresAt.includes(":") ? expiresAt : `${expiresAt} 23:59:59`;

    const body = {
      name,
      projectId: Number(projectId),
      discountApplied,
      discountBy,
      discountValue,
      status: Number(status),
      expiresAt: expires,
      unitIds: discountApplied === "unit" ? unitIds.map(Number) : [],
    };

    const url =
      mode === "create" ? "/api/admin/vouchers" : `/api/admin/vouchers/${voucherId}`;
    const method = mode === "create" ? "POST" : "PUT";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) {
      setError(json.message ?? "Save failed");
      return;
    }
    router.push("/admin/vouchers");
  }

  function toggleUnit(id: string) {
    setUnitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (loading) {
    return <LoadingState size="sm" />;
  }

  return (
    <div className="space-y-4">
      <AdminBackLink href="/admin/vouchers">Vouchers</AdminBackLink>
      {error && <AdminDbAlert message={error} />}

      <form onSubmit={onSubmit} onKeyDown={preventImplicitFormSubmit} className={`${adminCard} space-y-4 p-6`}>
        <h2 className="text-lg font-semibold text-zinc-900">
          {mode === "create" ? "Create Voucher" : "Edit Voucher"}
        </h2>

        <label className="block text-sm">
          <span className="font-medium text-zinc-700">Voucher Name *</span>
          <Input layout="field"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-zinc-700">Project *</span>
          <AdminSelect
            layout="field"
            required
            value={projectId}
            onChange={(val) => {
              setProjectId(val);
              setUnitIds([]);
            }}
            placeholder="Please select project"
            options={[
              { value: "", label: "Please select project" },
              ...projects.map((p) => ({
                value: String(p.id),
                label: p.disabled ? `${p.name} (has project voucher)` : p.name,
              })),
            ]}
          />
        </label>

        <fieldset className="text-sm">
          <span className="font-medium text-zinc-700">Discount apply *</span>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <Input layout="field"
                type="radio"
                name="discountApplied"
                checked={discountApplied === "project"}
                onChange={() => setDiscountApplied("project")}
              />
              Project
            </label>
            <label className="flex items-center gap-2">
              <Input layout="field"
                type="radio"
                name="discountApplied"
                checked={discountApplied === "unit"}
                onChange={() => setDiscountApplied("unit")}
              />
              Units
            </label>
          </div>
        </fieldset>

        {discountApplied === "unit" && (
          <div className="text-sm">
            <span className="font-medium text-zinc-700">Select units *</span>
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 p-2">
              {units.length === 0 ? (
                <p className="text-zinc-400">Select a project to load units</p>
              ) : (
                units.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 py-1">
                    <Input layout="field"
                      type="checkbox"
                      checked={unitIds.includes(String(u.id))}
                      disabled={u.hasOtherVoucher && !unitIds.includes(String(u.id))}
                      onChange={() => toggleUnit(String(u.id))}
                    />
                    <span className={u.hasOtherVoucher ? "text-zinc-400" : ""}>
                      {u.title}
                      {u.hasOtherVoucher ? " (other voucher)" : ""}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <fieldset className="text-sm">
          <span className="font-medium text-zinc-700">Discount *</span>
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2">
              <Input layout="field"
                type="radio"
                name="discountBy"
                checked={discountBy === "amount"}
                onChange={() => setDiscountBy("amount")}
              />
              By amount (PKR)
            </label>
            <label className="flex items-center gap-2">
              <Input layout="field"
                type="radio"
                name="discountBy"
                checked={discountBy === "percentage"}
                onChange={() => setDiscountBy("percentage")}
              />
              By percentage
            </label>
            <Input layout="field"
              type="number"
              min={0}
              required
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className=" max-w-[160px]"
            />
          </div>
        </fieldset>

        <label className="block text-sm">
          <span className="font-medium text-zinc-700">Expiry date *</span>
          <Input layout="field"
            type="date"
            required
            value={expiresAt.slice(0, 10)}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-zinc-700">Status *</span>
          <AdminSelect
            layout="field"
            required
            value={status}
            onChange={setStatus}
            options={[
              { value: "1", label: "Active" },
              { value: "2", label: "Disable" },
            ]}
          />
        </label>

        <div className="flex justify-between gap-2 pt-2">
                    <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save voucher"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/vouchers">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
