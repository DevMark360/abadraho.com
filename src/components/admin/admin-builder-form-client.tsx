"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { AdminSelect } from "@/components/admin/admin-select";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminFormSection, FieldLabel, inputClass, preventImplicitFormSubmit, selectClass } from "@/components/admin/admin-form-section";
import { AdminBackLink, AdminErrorAlert, adminPanel } from "@/components/admin/admin-ui";

export function AdminBuilderFormClient({
  builderId,
  mode,
}: {
  builderId?: number;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [userId, setUserId] = useState("");
  const [contactPersonPhone, setContactPersonPhone] = useState("");
  const [builderUsers, setBuilderUsers] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMeta = fetch("/api/admin/builders").then((r) => r.json());
    if (mode === "create") {
      loadMeta.then((j) => setBuilderUsers(j.builderUsers ?? []));
      return;
    }
    if (!builderId) return;
    Promise.all([loadMeta, fetch(`/api/admin/builders/${builderId}`).then((r) => r.json())]).then(
      ([meta, data]) => {
        setBuilderUsers(meta.builderUsers ?? data.builderUsers ?? []);
        const b = data.builder;
        if (!b) {
          setError(data.message ?? "Not found");
          setLoading(false);
          return;
        }
        setFullName(b.fullName ?? "");
        setContactPersonName(b.contactPersonName ?? "");
        setUserId(b.userId != null ? String(b.userId) : "");
        setContactPersonPhone(b.contactPersonPhone ?? "");
        setLoading(false);
      }
    );
  }, [mode, builderId]);

  async function save() {
    setSaving(true);
    const url = mode === "create" ? "/api/admin/builders" : `/api/admin/builders/${builderId}`;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, contactPersonName, userId, contactPersonPhone }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) {
      alert(json.message ?? "Save failed");
      return;
    }
    router.push("/admin/builders");
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await save();
  }

  if (loading) return <LoadingState size="sm" />;
  if (error) {
    return <AdminErrorAlert message={error} backHref="/admin/builders" backLabel="Builders" />;
  }

  return (
    <form onSubmit={onSubmit} onKeyDown={preventImplicitFormSubmit} className="mx-auto max-w-2xl space-y-6 pb-24">
      <AdminBackLink href="/admin/builders">Builders</AdminBackLink>

      <AdminFormSection title="Builder information">
        <label className="block">
          <FieldLabel required>Builder name</FieldLabel>
          <Input layout="field" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className="block">
          <FieldLabel required>Contact person name</FieldLabel>
          <Input layout="field"
            value={contactPersonName}
            onChange={(e) => setContactPersonName(e.target.value)}
          />
        </label>
        <label className="block">
          <FieldLabel required hint="Builder login user (user type Builder)">
            Linked user account
          </FieldLabel>
          <AdminSelect
            layout="field"
            value={userId}
            onChange={setUserId}
            placeholder="Select user…"
            options={[
              { value: "", label: "Select user…" },
              ...builderUsers,
            ]}
          />
        </label>
        <label className="block">
          <FieldLabel>Contact phone</FieldLabel>
          <Input layout="field"
            value={contactPersonPhone}
            onChange={(e) => setContactPersonPhone(e.target.value)}
          />
        </label>
      </AdminFormSection>

      <div className={`sticky bottom-0 flex gap-3 ${adminPanel} bg-white/95 p-4 backdrop-blur`}>
                  <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save builder"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/builders">Cancel</Link>
          </Button>
      </div>
    </form>
  );
}
