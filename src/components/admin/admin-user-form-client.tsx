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

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userTypeId: string;
  password: string;
};

const defaultForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  userTypeId: "",
  password: "",
};

export function AdminUserFormClient({
  userId,
  mode,
}: {
  userId?: number;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [userTypes, setUserTypes] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !userId) return;
    fetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        const u = data.user;
        if (!u) {
          setError(data.message ?? "Not found");
          setLoading(false);
          return;
        }
        setForm({
          firstName: u.firstName ?? "",
          lastName: u.lastName ?? "",
          email: u.email ?? "",
          phoneNumber: u.phoneNumber ?? "",
          userTypeId: u.userTypeId != null ? String(u.userTypeId) : "",
          password: "",
        });
        if (data.userTypes?.length) {
          setUserTypes(
            data.userTypes.map((t: { id: number; name: string }) => ({
              value: String(t.id),
              label: t.name,
            }))
          );
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load");
        setLoading(false);
      });
  }, [mode, userId]);

  useEffect(() => {
    if (mode !== "create") return;
    fetch("/api/admin/users?page=1&perPage=1")
      .then((r) => r.json())
      .then((j) => {
        if (j.userTypes?.length) {
          setUserTypes(
            j.userTypes.map((t: { id: number; name: string }) => ({
              value: String(t.id),
              label: t.name,
            }))
          );
        }
      });
  }, [mode]);

  async function save() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      alert("First name, last name, and email are required");
      return;
    }
    if (!form.userTypeId) {
      alert("User type is required");
      return;
    }
    setSaving(true);
    const url = mode === "create" ? "/api/admin/users" : `/api/admin/users/${userId}`;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) {
      alert(json.message ?? "Save failed");
      return;
    }
    router.push("/admin/users");
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await save();
  }

  if (loading) return <LoadingState size="sm" />;
  if (error) {
    return <AdminErrorAlert message={error} backHref="/admin/users" backLabel="Users" />;
  }

  return (
    <form onSubmit={onSubmit} onKeyDown={preventImplicitFormSubmit} className="mx-auto max-w-2xl space-y-6 pb-24">
      <AdminBackLink href="/admin/users">Users</AdminBackLink>

      <AdminFormSection title="User details">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <FieldLabel required>First name</FieldLabel>
            <Input layout="field"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </label>
          <label className="block">
            <FieldLabel required>Last name</FieldLabel>
            <Input layout="field"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </label>
          <label className="block md:col-span-2">
            <FieldLabel required>Email</FieldLabel>
            <Input layout="field"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block">
            <FieldLabel>Phone</FieldLabel>
            <Input layout="field"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            />
          </label>
          <label className="block">
            <FieldLabel required>User type</FieldLabel>
            <AdminSelect
              layout="field"
              value={form.userTypeId}
              onChange={(val) => setForm({ ...form, userTypeId: val })}
              placeholder="Select…"
              options={[
                { value: "", label: "Select…" },
                ...userTypes,
              ]}
            />
          </label>
          <label className="block md:col-span-2">
            <FieldLabel required={mode === "create"} hint={mode === "edit" ? "Leave blank to keep current" : "Min 8 characters"}>
              Password
            </FieldLabel>
            <Input layout="field"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
        </div>
      </AdminFormSection>

      <div className={`sticky bottom-0 flex gap-3 ${adminPanel} bg-white/95 p-4 backdrop-blur`}>
                  <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save user"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/users">Cancel</Link>
          </Button>
      </div>
    </form>
  );
}
