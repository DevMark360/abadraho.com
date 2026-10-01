"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useState } from "react";
import { AdminFormSection, FieldLabel, preventImplicitFormSubmit } from "@/components/admin/admin-form-section";
import { AdminBackLink } from "@/components/admin/admin-ui";

export function AdminProjectImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    const res = await fetch("/api/admin/projects/import", { method: "POST", body: form });
    const json = await res.json();
    setUploading(false);
    if (json.success) setMessage(json.message ?? "Uploaded");
    else alert(json.message ?? "Upload failed");
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <AdminBackLink href="/admin/projects">Projects</AdminBackLink>

      <AdminFormSection
        title="Import projects (.csv)"
        description="File is saved to public/uploads/project_imports for processing."
      >
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
          <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {message}
          </p>
        )}
      </AdminFormSection>
    </div>
  );
}
