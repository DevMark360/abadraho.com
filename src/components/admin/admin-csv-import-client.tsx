"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useState } from "react";
import { AdminFormSection, FieldLabel, preventImplicitFormSubmit } from "@/components/admin/admin-form-section";
import { AdminBackLink } from "@/components/admin/admin-ui";

export function AdminCsvImportClient({
  title,
  description,
  hint,
  apiUrl,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  hint: string;
  apiUrl: string;
  backHref: string;
  backLabel: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      alert("Choose a .csv file");
      return;
    }
    setUploading(true);
    setMessage(null);
    const form = new FormData();
    form.append("projects", file);
    const res = await fetch(apiUrl, { method: "POST", body: form });
    const json = await res.json();
    setUploading(false);
    setOk(Boolean(json.success));
    setMessage(json.message ?? (json.success ? "Imported" : "Import failed"));
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <AdminBackLink href={backHref}>{backLabel}</AdminBackLink>
      <AdminFormSection title={title} description={description}>
        <p className="mb-3 text-xs text-zinc-500">{hint}</p>
        <form onSubmit={submit} onKeyDown={preventImplicitFormSubmit} className="space-y-4">
          <label className="block text-sm">
            <FieldLabel>CSV file</FieldLabel>
            <Input layout="field"
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className=" file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm"
            />
          </label>
          <Button type="submit" disabled={uploading}>
            {uploading ? "Uploading…" : "Upload CSV"}
          </Button>
        </form>
        {message && (
          <p
            className={`mt-3 rounded-lg border p-3 text-sm ${
              ok
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message}
          </p>
        )}
      </AdminFormSection>
    </div>
  );
}
