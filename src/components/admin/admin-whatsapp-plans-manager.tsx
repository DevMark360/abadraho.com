"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import {
  AdminDbAlert,
  adminCard,
  adminTableHead,
} from "@/components/admin/admin-ui";
import { FieldLabel } from "@/components/admin/admin-form-section";
import { cn } from "@/lib/utils";

type Plan = {
  id: number | null;
  name: string | null;
  cards: number;
  price: number;
  isActive: boolean;
  sortOrder: number;
};

type Draft = {
  id: number | null;
  name: string;
  cards: string;
  price: string;
  isActive: boolean;
  sortOrder: string;
};

const emptyDraft: Draft = {
  id: null,
  name: "",
  cards: "",
  price: "",
  isActive: true,
  sortOrder: "0",
};
const fmtRs = (n: number) =>
  `Rs ${n.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;

/**
 * Admin CRUD for the WhatsApp ad card packages builders can buy. Past purchases are unaffected:
 * they store their own cards and price.
 */
export function AdminWhatsappPlansManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [managed, setManaged] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/ad-whatsapp-plans");
    const json = await res.json().catch(() => ({}));
    if (json.success) {
      setPlans(json.plans ?? []);
      setManaged(Boolean(json.managed));
      setError(null);
    } else setError(json.message ?? "Failed to load packages");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
    };
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setFormError(null);
    const payload = {
      name: draft.name,
      cards: Number(draft.cards),
      price: Number(draft.price),
      isActive: draft.isActive,
      sortOrder: Number(draft.sortOrder || 0),
    };
    const json = draft.id
      ? await send(`/api/admin/ad-whatsapp-plans/${draft.id}`, "PATCH", payload)
      : await send("/api/admin/ad-whatsapp-plans", "POST", payload);
    setSaving(false);
    if (!json.success) {
      setFormError(json.message ?? "Save failed");
      return;
    }
    setDraft(null);
    void load();
  }

  async function toggle(plan: Plan) {
    if (!plan.id) return;
    const json = await send(
      `/api/admin/ad-whatsapp-plans/${plan.id}`,
      "PATCH",
      { isActive: !plan.isActive },
    );
    if (!json.success) alert(json.message ?? "Update failed");
    void load();
  }

  async function remove(plan: Plan) {
    if (!plan.id) return;
    const label = plan.name || `${plan.cards} cards`;
    if (
      !confirm(
        `Delete the "${label}" package? Builders can no longer buy it. Past purchases are not affected.`,
      )
    )
      return;
    const json = await send(
      `/api/admin/ad-whatsapp-plans/${plan.id}`,
      "DELETE",
    );
    if (!json.success) alert(json.message ?? "Delete failed");
    void load();
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            Packages for sale
          </h2>
          <p className="text-sm text-zinc-500">
            What builders can buy. Changes apply to new purchases only.
          </p>
        </div>
        <Button
          type="button"
          className="gap-1.5"
          disabled={!managed}
          onClick={() => {
            setFormError(null);
            setDraft({ ...emptyDraft, sortOrder: String(plans.length + 1) });
          }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add package
        </Button>
      </div>

      {error ? <AdminDbAlert message={error} /> : null}
      {!managed && !loading ? (
        <AdminDbAlert message="Packages are built in until the ad_whatsapp_plans table exists. Run prisma/manual-migrations/2026-10-07-whatsapp-package-plans.sql in phpMyAdmin, then restart the app to edit them here." />
      ) : null}

      <div className={cn(adminCard, "overflow-x-auto p-4")}>
        {loading ? (
          <LoadingState size="sm" inline className="w-full py-6" />
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr>
                <th className={adminTableHead}>Package</th>
                <th className={adminTableHead}>Cards</th>
                <th className={adminTableHead}>Price</th>
                <th className={adminTableHead}>Per card</th>
                <th className={adminTableHead}>Active</th>
                <th className={adminTableHead}>Order</th>
                <th className={cn(adminTableHead, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    No packages yet. Builders can&apos;t buy WhatsApp cards
                    until you add one.
                  </td>
                </tr>
              ) : (
                plans.map((p, i) => (
                  <tr
                    key={p.id ?? `builtin-${i}`}
                    className="border-b border-clay-line last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {p.name || `${p.cards} cards`}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {p.cards.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{fmtRs(p.price)}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-500">
                      {fmtRs(Math.round((p.price / p.cards) * 100) / 100)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={p.isActive}
                        aria-label={`${p.isActive ? "Deactivate" : "Activate"} ${p.name || `${p.cards} cards`}`}
                        disabled={!managed}
                        onClick={() => void toggle(p)}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50",
                          p.isActive ? "bg-emerald-500" : "bg-zinc-300",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                            p.isActive ? "translate-x-5" : "translate-x-0.5",
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-500">
                      {p.sortOrder}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          disabled={!managed}
                          onClick={() => {
                            setFormError(null);
                            setDraft({
                              id: p.id,
                              name: p.name ?? "",
                              cards: String(p.cards),
                              price: String(p.price),
                              isActive: p.isActive,
                              sortOrder: String(p.sortOrder),
                            });
                          }}
                          className="rounded-lg p-1.5 text-zinc-600 hover:bg-clay-well disabled:opacity-40"
                          title="Edit"
                          aria-label="Edit package"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={!managed}
                          onClick={() => void remove(p)}
                          className="rounded-lg p-1.5 text-zinc-600 hover:bg-clay-well hover:text-red-600 disabled:opacity-40"
                          title="Delete"
                          aria-label="Delete package"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {draft ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDraft(null)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-form-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="w-full max-w-md rounded-clay-lg border border-white/80 bg-clay-surface p-6 shadow-clay"
          >
            <div className="flex items-start justify-between gap-3">
              <h3
                id="plan-form-title"
                className="text-lg font-semibold text-zinc-900"
              >
                {draft.id ? "Edit package" : "Add package"}
              </h3>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-clay-well"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <FieldLabel hint="Optional, e.g. Starter">Name</FieldLabel>
                <Input
                  layout="field"
                  maxLength={100}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <FieldLabel required>Cards</FieldLabel>
                  <Input
                    layout="field"
                    type="number"
                    min={1}
                    max={100000}
                    step={1}
                    required
                    value={draft.cards}
                    onChange={(e) =>
                      setDraft({ ...draft, cards: e.target.value })
                    }
                  />
                </label>
                <label className="block">
                  <FieldLabel required>Price (Rs)</FieldLabel>
                  <Input
                    layout="field"
                    type="number"
                    min={1}
                    step="0.01"
                    required
                    value={draft.price}
                    onChange={(e) =>
                      setDraft({ ...draft, price: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 items-end gap-3">
                <label className="block">
                  <FieldLabel hint="Lower shows first">Order</FieldLabel>
                  <Input
                    layout="field"
                    type="number"
                    step={1}
                    value={draft.sortOrder}
                    onChange={(e) =>
                      setDraft({ ...draft, sortOrder: e.target.value })
                    }
                  />
                </label>
                <label className="flex items-center gap-2 pb-2.5 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) =>
                      setDraft({ ...draft, isActive: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Available to builders
                </label>
              </div>
              {draft.cards && draft.price && Number(draft.cards) > 0 ? (
                <p className="text-xs text-zinc-500">
                  {fmtRs(
                    Math.round(
                      (Number(draft.price) / Number(draft.cards)) * 100,
                    ) / 100,
                  )}{" "}
                  per card
                </p>
              ) : null}
              {formError ? (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {formError}
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraft(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : draft.id ? "Save changes" : "Add package"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
