"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { AdminSelect } from "@/components/admin/admin-select";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminBackLink, AdminDbAlert, adminCard } from "@/components/admin/admin-ui";
import { preventImplicitFormSubmit } from "@/components/admin/admin-form-section";

export function AdminProgressFormClient({
  mode,
  progressId,
}: {
  mode: "create" | "edit";
  progressId?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState("1");

  useEffect(() => {
    if (mode === "edit" && progressId) {
      fetch(`/api/admin/progress/${progressId}`)
        .then((r) => r.json())
        .then((j) => {
          if (!j.success || !j.progress) {
            setError(j.message ?? "Failed to load");
          } else {
            setName(j.progress.name);
            setIsActive(j.progress.isActive ? "1" : "0");
          }
          setLoading(false);
        });
    }
  }, [mode, progressId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = { name, isActive: isActive === "1" };
    const url =
      mode === "edit" && progressId ? `/api/admin/progress/${progressId}` : "/api/admin/progress";
    const method = mode === "edit" ? "PATCH" : "POST";
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
    router.push("/admin/progress");
  }

  if (loading) return <LoadingState size="sm" />;

  return (
    <div className="max-w-xl space-y-4">
      <AdminBackLink href="/admin/progress">Progress</AdminBackLink>
      {error && <AdminDbAlert message={error} />}

      <form onSubmit={onSubmit} onKeyDown={preventImplicitFormSubmit} className={`${adminCard} space-y-4 p-6`}>
        <h2 className="text-lg font-semibold">
          {mode === "create" ? "Add progress" : "Edit progress"}
        </h2>
        <p className="text-sm text-zinc-500">Enter progress status and submit.</p>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Name *</span>
          <Input layout="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Under construction"
          />
          <span className="mt-1 block text-xs text-zinc-500">Progress status name.</span>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Show on listing page *</span>
          <AdminSelect
            layout="field"
            value={isActive}
            onChange={setIsActive}
            required
            placeholder="Please select"
            options={[
              { value: "", label: "Please select" },
              { value: "1", label: "Yes" },
              { value: "0", label: "No" },
            ]}
          />
          <span className="mt-1 block text-xs text-zinc-500">
            Whether this status appears on public listing filters.
          </span>
        </label>

        <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/progress">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
