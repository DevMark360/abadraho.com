"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminSelect } from "@/components/admin/admin-select";
import {
  AdminErrorAlert,
  AdminPageToolbar,
  AdminPagination,
  adminCard,
  adminTableHead,
} from "@/components/admin/admin-ui";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";

type Winner = "a" | "b" | "tie";

type Verdict = {
  id: number;
  kind: "location" | "developer";
  purpose: "living" | "investment" | null;
  nameA: string;
  nameB: string;
  winner: Winner;
  reason: string;
  model: string | null;
  manual: boolean;
  updatedAt: string;
};

type ListResponse = {
  success?: boolean;
  message?: string;
  items?: Verdict[];
  total?: number;
  perPage?: number;
};

const PURPOSE_OPTIONS = [
  { value: "", label: "Any purpose" },
  { value: "living", label: "End-user living" },
  { value: "investment", label: "Investment" },
];

function purposeLabel(purpose: Verdict["purpose"]) {
  return purpose === "living" ? "Living" : purpose === "investment" ? "Investment" : "General (older)";
}

const KIND_OPTIONS = [
  { value: "", label: "Location and developer" },
  { value: "location", label: "Location only" },
  { value: "developer", label: "Developer only" },
];

function winnerLabel(v: Pick<Verdict, "winner" | "nameA" | "nameB">) {
  return v.winner === "a" ? v.nameA : v.winner === "b" ? v.nameB : "Even";
}

function EditRow({
  verdict,
  onCancel,
  onSaved,
}: {
  verdict: Verdict;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [winner, setWinner] = useState<Winner>(verdict.winner);
  const [reason, setReason] = useState(verdict.reason);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/compare-verdicts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: verdict.id, winner, reason }),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
      if (!json.success) throw new Error(json.message ?? "Could not save");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      setSaving(false);
    }
  }

  return (
    <tr className="border-t border-zinc-100 bg-amber-50/40 align-top">
      <td className="px-3 py-3 text-sm text-zinc-600">
        <span className="capitalize">{verdict.kind}</span>
        <p className="text-xs text-zinc-400">{purposeLabel(verdict.purpose)}</p>
      </td>
      <td className="px-3 py-3 text-sm text-zinc-900">
        {verdict.nameA} <span className="text-zinc-400">vs</span> {verdict.nameB}
      </td>
      <td className="min-w-[200px] px-3 py-3">
        <AdminSelect
          layout="inline"
          value={winner}
          onChange={(value) => setWinner(value as Winner)}
          options={[
            { value: "a", label: verdict.nameA },
            { value: "b", label: verdict.nameB },
            { value: "tie", label: "Even" },
          ]}
          aria-label="Winner"
        />
      </td>
      <td className="min-w-[260px] px-3 py-3" colSpan={2}>
        <Input
          layout="inline"
          value={reason}
          maxLength={200}
          onChange={(e) => setReason(e.target.value)}
          aria-label="Reason"
        />
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" onClick={() => void save()} disabled={saving || !reason.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}

/** Cached AI verdicts from the Compare page: correct one, or delete it so the AI is asked again. */
export function AdminCompareVerdictsClient() {
  const [kind, setKind] = useState("");
  const [purpose, setPurpose] = useState("");
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query, 300);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Verdict[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page) });
    if (kind) params.set("kind", kind);
    if (purpose) params.set("purpose", purpose);
    if (q.trim()) params.set("q", q.trim());
    try {
      const res = await fetch(`/api/admin/compare-verdicts?${params.toString()}`);
      const json = (await res.json().catch(() => ({}))) as ListResponse;
      if (!json.success) throw new Error(json.message ?? "Could not load verdicts");
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
      setPerPage(json.perPage ?? 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load verdicts");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [kind, purpose, q, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(verdict: Verdict) {
    if (
      !confirm(
        `Delete the verdict for ${verdict.nameA} vs ${verdict.nameB}? The next comparison of this pair asks the AI again.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/compare-verdicts?id=${verdict.id}`, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (!json.success) {
      setError(json.message ?? "Could not delete");
      return;
    }
    void load();
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        The Compare page asks the AI once per pair of areas or developers and buying purpose
        (living or investment), and saves the answer here. Edit a verdict to correct it (edited verdicts are never replaced by the AI), or
        delete it to have the AI asked again. Changes show on the Compare page within 2 minutes.
      </p>

      <AdminPageToolbar total={loading ? undefined : total}>
        <AdminSelect
          layout="inline"
          value={kind}
          onChange={(value) => {
            setKind(value);
            setPage(1);
          }}
          options={KIND_OPTIONS}
          aria-label="Verdict type"
          className="w-56"
        />
        <AdminSelect
          layout="inline"
          value={purpose}
          onChange={(value) => {
            setPurpose(value);
            setPage(1);
          }}
          options={PURPOSE_OPTIONS}
          aria-label="Buying purpose"
          className="w-48"
        />
        <Input
          layout="inline"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search names or reasons…"
          className="w-64"
          aria-label="Search verdicts"
        />
      </AdminPageToolbar>

      {error ? <AdminErrorAlert message={error} /> : null}

      <div className={adminCard}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={adminTableHead}>Type / for</th>
                <th className={adminTableHead}>Compared</th>
                <th className={adminTableHead}>Winner</th>
                <th className={adminTableHead}>Reason</th>
                <th className={adminTableHead}>Source</th>
                <th className={cn(adminTableHead, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                    {error ? "—" : "No verdicts yet. They appear after someone compares two projects."}
                  </td>
                </tr>
              ) : (
                items.map((v) =>
                  editingId === v.id ? (
                    <EditRow
                      key={v.id}
                      verdict={v}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => {
                        setEditingId(null);
                        void load();
                      }}
                    />
                  ) : (
                    <tr key={v.id} className="border-t border-zinc-100 align-top">
                      <td className="px-3 py-3 text-zinc-600">
                        <span className="capitalize">{v.kind}</span>
                        <p className="text-xs text-zinc-400">{purposeLabel(v.purpose)}</p>
                      </td>
                      <td className="px-3 py-3 text-zinc-900">
                        {v.nameA} <span className="text-zinc-400">vs</span> {v.nameB}
                      </td>
                      <td className="px-3 py-3 font-semibold text-zinc-900">{winnerLabel(v)}</td>
                      <td className="max-w-md px-3 py-3 text-zinc-700">{v.reason}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            v.manual ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                          )}
                          title={v.manual ? undefined : v.model ?? undefined}
                        >
                          {v.manual ? "Edited" : "AI"}
                        </span>
                        <p className="mt-1 text-xs text-zinc-400">
                          {new Date(v.updatedAt).toLocaleDateString("en-PK")}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(v.id)}>
                            Edit
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => void remove(v)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />
    </div>
  );
}
