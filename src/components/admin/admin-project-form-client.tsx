"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { AdminSelect } from "@/components/admin/admin-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { userTypeIds } from "@/config/site";
import { PROJECT_STATUS_LABELS } from "@/config/project-status";
import {
  adminProjectImageUrl,
  listProjectDocUrls,
  listProjectImageUrls,
} from "@/lib/admin-project-media";
import {
  AdminFormSection,
  FieldLabel,
  inputClass,
  preventImplicitFormSubmit,
  selectClass,
} from "@/components/admin/admin-form-section";
import {
  ADMIN_MAX_PROJECT_PDF_FILES,
  ADMIN_PDF_MAX_BYTES,
  ADMIN_PDF_MAX_LABEL,
} from "@/lib/admin-upload-limits";
import { parseFetchJson } from "@/lib/client/api-fetch";
import {
  ADMIN_TIMEZONE_OPTIONS,
  DEFAULT_ADMIN_TIMEZONE,
  datetimeLocalNow,
  formatDatetimeLocalInTimeZone,
  parseDatetimeLocalInTimeZone,
} from "@/lib/admin-datetime-tz";
import { AdminMultiSelect } from "@/components/admin/admin-multi-select";
import { AdminBackLink, AdminErrorAlert, adminPanel } from "@/components/admin/admin-ui";
import { AdminProjectUnitsPanel } from "@/components/admin/admin-project-units-panel";
import { fmtDate } from "@/components/admin/admin-search-history-format";
import { slugify } from "@/lib/slugify";

type MetaOptions = {
  areas: { value: string; label: string }[];
  projectTypes: { value: string; label: string }[];
  progress: { value: string; label: string }[];
  builders: { value: string; label: string }[];
  tags: { value: string; label: string }[];
  amenities: { value: string; label: string }[];
  utilities: { value: string; label: string }[];
};

type FormState = {
  name: string;
  slug: string;
  address: string;
  discountPrice: string;
  areaIds: string[];
  latitude: string;
  longitude: string;
  projectTypeId: string;
  progressStatusId: string;
  projectVideo: string;
  details: string;
  status: string;
  tier: string;
  minPrice: string;
  installmentLength: string;
  metaTitle: string;
  metaDescription: string;
  metaTags: string;
  marketedBy: string;
  addedTime: string;
  ownerIds: string[];
  tagIds: string[];
  amenityIds: string[];
  utilityIds: string[];
  mainHeading: string;
  subHeading: string;
  bullet1: string;
  bullet2: string;
  bullet3: string;
  bullet4: string;
  bullet5: string;
  bullet6: string;
};

const defaultForm: FormState = {
  name: "",
  slug: "",
  address: "",
  discountPrice: "",
  areaIds: [],
  latitude: "",
  longitude: "",
  projectTypeId: "",
  progressStatusId: "",
  projectVideo: "",
  details: "",
  status: "2",
  tier: "",
  minPrice: "",
  installmentLength: "",
  metaTitle: "",
  metaDescription: "",
  metaTags: "",
  marketedBy: "",
  addedTime: "",
  ownerIds: [],
  tagIds: [],
  amenityIds: [],
  utilityIds: [],
  mainHeading: "",
  subHeading: "",
  bullet1: "",
  bullet2: "",
  bullet3: "",
  bullet4: "",
  bullet5: "",
  bullet6: "",
};

export function AdminProjectFormClient({
  projectId,
  mode,
}: {
  projectId?: number;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const { user } = useAuth();
  const isBuilder = user?.userTypeId === userTypeIds.builder;
  const [form, setForm] = useState<FormState>(defaultForm);
  const [addedTimeZone, setAddedTimeZone] = useState(DEFAULT_ADMIN_TIMEZONE);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<MetaOptions>({
    areas: [],
    projectTypes: [],
    progress: [],
    builders: [],
    tags: [],
    amenities: [],
    utilities: [],
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingDocs, setExistingDocs] = useState<{ entry: string; label: string; url: string }[]>([]);
  /** Saved documents marked for removal; detached from the project on Save. */
  const [removedDocs, setRemovedDocs] = useState<string[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [recordDates, setRecordDates] = useState<{
    createdAt: string | null;
    updatedAt: string | null;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/meta/options")
      .then((r) => r.json())
      .then((j) =>
        setMeta({
          areas: j.areas ?? [],
          projectTypes: j.projectTypes ?? [],
          progress: j.progress ?? [],
          builders: j.builders ?? [],
          tags: j.tags ?? [],
          amenities: j.amenities ?? [],
          utilities: j.utilities ?? [],
        })
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mode !== "create") return;
    setForm((prev) => ({
      ...prev,
      addedTime: prev.addedTime || datetimeLocalNow(addedTimeZone),
    }));
  }, [mode, addedTimeZone]);

  useEffect(() => {
    if (mode !== "edit" || !projectId) return;
    fetch(`/api/admin/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        const p = data.project;
        if (!p) {
          setError(data.message ?? "Not found");
          setLoading(false);
          return;
        }
        const info = p.projectInfo as Record<string, string | null> | null;
        setForm({
          name: p.name ?? "",
          slug: p.slug ?? "",
          address: p.address ?? "",
          discountPrice: p.discountPrice != null ? String(p.discountPrice) : "",
          areaIds: p.areaIds ?? [],
          latitude: p.latitude != null ? String(p.latitude) : "",
          longitude: p.longitude != null ? String(p.longitude) : "",
          projectTypeId: p.projectTypeId != null ? String(p.projectTypeId) : "",
          progressStatusId: p.progressStatusId != null ? String(p.progressStatusId) : "",
          projectVideo: p.projectVideo ?? "",
          details: p.details ?? "",
          status: String(p.status ?? 2),
          tier: p.tier ?? "",
          minPrice: p.minPrice != null ? String(p.minPrice) : "",
          installmentLength:
            p.installmentLength != null ? String(p.installmentLength) : "",
          metaTitle: p.metaTitle ?? "",
          metaDescription: p.metaDescription ?? "",
          metaTags: p.metaTags ?? "",
          marketedBy: p.marketedBy ?? "",
          addedTime: p.addedTime
            ? formatDatetimeLocalInTimeZone(new Date(p.addedTime), addedTimeZone)
            : "",
          ownerIds: (p.ownerIds as number[])?.map(String) ?? [],
          tagIds: (p.tagIds as number[])?.map(String) ?? [],
          amenityIds: (p.amenityIds as number[])?.map(String) ?? [],
          utilityIds: (p.utilityIds as number[])?.map(String) ?? [],
          mainHeading: info?.mainHeading ?? "",
          subHeading: info?.subHeading ?? "",
          bullet1: info?.bullet1 ?? "",
          bullet2: info?.bullet2 ?? "",
          bullet3: info?.bullet3 ?? "",
          bullet4: info?.bullet4 ?? "",
          bullet5: info?.bullet5 ?? "",
          bullet6: info?.bullet6 ?? "",
        });
        setExistingImages(listProjectImageUrls(p.projectCoverImg, p.projectImgs));
        setCoverPreview(adminProjectImageUrl(p.projectCoverImg));
        setExistingDocs(listProjectDocUrls(projectId, p.projectDoc));
        setRecordDates({
          createdAt: p.createdAt ? String(p.createdAt) : null,
          updatedAt: p.updatedAt ? String(p.updatedAt) : null,
        });
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load");
        setLoading(false);
      });
  }, [mode, projectId]);

  const newGalleryPreviews = useMemo(() => {
    return galleryFiles.map((f) => URL.createObjectURL(f));
  }, [galleryFiles]);

  useEffect(() => {
    return () => {
      newGalleryPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [newGalleryPreviews]);

  function addDocFiles(incoming: File[]) {
    const next: File[] = [];
    for (const file of incoming) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        alert(`${file.name} must be a PDF`);
        continue;
      }
      if (file.size > ADMIN_PDF_MAX_BYTES) {
        alert(`${file.name} must be ${ADMIN_PDF_MAX_LABEL} or smaller`);
        continue;
      }
      next.push(file);
    }
    if (!next.length) return;
    setDocFiles((prev) => [...prev, ...next].slice(0, ADMIN_MAX_PROJECT_PDF_FILES));
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && mode === "create") {
        const previousAutoSlug = slugify(prev.name);
        if (!prev.slug || prev.slug === previousAutoSlug) {
          next.slug = slugify(String(value));
        }
      }
      return next;
    });
  }

  function onAddedTimeZoneChange(timeZone: string) {
    setAddedTimeZone(timeZone);
    setForm((prev) => {
      if (!prev.addedTime) {
        return mode === "create"
          ? { ...prev, addedTime: datetimeLocalNow(timeZone) }
          : prev;
      }
      const instant = parseDatetimeLocalInTimeZone(prev.addedTime, addedTimeZone);
      return {
        ...prev,
        addedTime: formatDatetimeLocalInTimeZone(instant, timeZone),
      };
    });
  }

  async function save() {
    if (!form.name.trim()) {
      alert("Project name is required");
      return;
    }
    setSaving(true);
    const url =
      mode === "create" ? "/api/admin/projects" : `/api/admin/projects/${projectId}`;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, addedTimeZone }),
    });
    const saved = await parseFetchJson<{ success?: boolean; id?: number; message?: string }>(res);
    if (!saved.ok) {
      setSaving(false);
      alert(saved.message || saved.data?.message || "Save failed");
      return;
    }

    const id = saved.data?.id ?? projectId;
    // Remove first so freed slots count toward the 10-document limit for new uploads.
    if (id && removedDocs.length) {
      const del = await fetch(`/api/admin/projects/${id}/media`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docs: removedDocs }),
      });
      const removed = await parseFetchJson<{ success?: boolean; message?: string }>(del);
      if (!removed.ok) {
        setSaving(false);
        alert(removed.message || removed.data?.message || "Project saved but documents could not be removed");
        return;
      }
    }
    if (id && (coverFile || galleryFiles.length || docFiles.length)) {
      const fd = new FormData();
      if (coverFile) fd.append("cover", coverFile);
      galleryFiles.forEach((f) => fd.append("images", f));
      docFiles.forEach((f) => fd.append("docs", f));
      const up = await fetch(`/api/admin/projects/${id}/media`, { method: "POST", body: fd });
      const uploaded = await parseFetchJson<{ success?: boolean; message?: string }>(up);
      if (!uploaded.ok) {
        setSaving(false);
        alert(uploaded.message || uploaded.data?.message || "Project saved but file upload failed");
        router.push(`/admin/projects/${id}/edit`);
        return;
      }
    }

    setSaving(false);
    router.push(`/admin/projects/${id}`);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await save();
  }

  if (loading) {
    return <LoadingState size="sm" label="Loading project…" />;
  }

  if (error) {
    return (
      <AdminErrorAlert message={error} backHref="/admin/projects" backLabel="Projects" />
    );
  }

  return (
    <form onSubmit={onSubmit} onKeyDown={preventImplicitFormSubmit} className="mx-auto max-w-4xl space-y-6 pb-24">
      <AdminBackLink href="/admin/projects">Projects</AdminBackLink>

      <AdminFormSection title="Basic information" description="Name, pricing, and status">
        {mode === "edit" && recordDates && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
              <p className="text-xs font-medium uppercase text-zinc-400">Created</p>
              <p className="mt-1 text-zinc-800">{fmtDate(recordDates.createdAt)}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
              <p className="text-xs font-medium uppercase text-zinc-400">Modified</p>
              <p className="mt-1 text-zinc-800">{fmtDate(recordDates.updatedAt)}</p>
            </div>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <FieldLabel required>Project Name</FieldLabel>
            <Input layout="field"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </label>
          <label className="block">
            <FieldLabel required>Project Discount Price</FieldLabel>
            <Input layout="field"
              type="number"
              min={0}
              value={form.discountPrice}
              onChange={(e) => update("discountPrice", e.target.value)}
            />
          </label>
          <label className="block">
            <FieldLabel required hint="Auto from name, e.g. Roomi Builder → roomi-builder">
              Slug
            </FieldLabel>
            <Input layout="field"
              value={form.slug}
              onChange={(e) => update("slug", e.target.value)}
              required
            />
          </label>
          <label className="block">
            <FieldLabel>Project type</FieldLabel>
            <AdminSelect
              layout="field"
              value={form.projectTypeId}
              onChange={(val) => update("projectTypeId", val)}
              placeholder="Select type…"
              options={[
                { value: "", label: "Select type…" },
                ...meta.projectTypes,
              ]}
            />
          </label>
          <label className="block">
            <FieldLabel required>Status</FieldLabel>
            {isBuilder ? (
              <div className="mt-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                {mode === "create"
                  ? "On hold. Admin will review before the project goes live."
                  : PROJECT_STATUS_LABELS[Number(form.status)] ?? "On hold"}
              </div>
            ) : (
              <AdminSelect
                layout="field"
                value={form.status}
                onChange={(val) => update("status", val)}
                options={Object.entries(PROJECT_STATUS_LABELS).map(([v, l]) => ({
                  value: v,
                  label: l,
                }))}
              />
            )}
          </label>
          <label className="block">
            <FieldLabel>Tier</FieldLabel>
            <AdminSelect
              layout="field"
              value={form.tier}
              onChange={(val) => update("tier", val)}
              placeholder="No tier"
              options={[
                { value: "", label: "No tier" },
                { value: "luxury", label: "Luxury" },
                { value: "premium", label: "Premium" },
                { value: "mid_range", label: "Mid-range" },
                { value: "affordable", label: "Affordable" },
              ]}
            />
          </label>
        </div>
      </AdminFormSection>

      <AdminFormSection title="Location" description="Address, areas, and map coordinates">
        <label className="block">
          <FieldLabel required>Location Address</FieldLabel>
          <Input layout="field"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </label>
        <div>
          <FieldLabel required>Areas</FieldLabel>
          <div className="mt-1">
            <AdminMultiSelect
              options={meta.areas}
              value={form.areaIds}
              onChange={(areaIds) => update("areaIds", areaIds)}
              placeholder="Select areas"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <FieldLabel required>Latitude</FieldLabel>
            <Input layout="field"
              type="number"
              step="any"
              placeholder="24.8815298"
              value={form.latitude}
              onChange={(e) => update("latitude", e.target.value)}
            />
          </label>
          <label className="block">
            <FieldLabel required>Longitude</FieldLabel>
            <Input layout="field"
              type="number"
              step="any"
              placeholder="67.08182"
              value={form.longitude}
              onChange={(e) => update("longitude", e.target.value)}
            />
          </label>
        </div>
        <label className="block">
          <FieldLabel>Progress</FieldLabel>
          <AdminSelect
            layout="field"
            value={form.progressStatusId}
            onChange={(val) => update("progressStatusId", val)}
            placeholder="Select progress…"
            options={[
              { value: "", label: "Select progress…" },
              ...meta.progress,
            ]}
          />
        </label>
      </AdminFormSection>

      <AdminFormSection
        title="Media"
        description="Cover image, gallery, PDF documents, and video URL (YouTube)"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <FieldLabel hint="JPG, PNG, WebP">Project Cover Image</FieldLabel>
            <Input layout="field"
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-sm"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
            {(coverPreview || coverFile) && (
              <img
                src={coverFile ? URL.createObjectURL(coverFile) : coverPreview!}
                alt="Cover"
                className="mt-3 max-h-36 rounded-lg border object-cover"
              />
            )}
          </div>
          <div>
            <FieldLabel hint="Select multiple images">Project Images</FieldLabel>
            <Input layout="field"
              type="file"
              accept="image/*"
              multiple
              className="mt-2 block w-full text-sm"
              onChange={(e) => setGalleryFiles(Array.from(e.target.files ?? []))}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {existingImages.map((src) => (
                <img key={src} src={src} alt="" className="h-20 w-20 rounded border object-cover" />
              ))}
              {newGalleryPreviews.map((src) => (
                <img key={src} src={src} alt="" className="h-20 w-20 rounded border object-cover ring-2 ring-zinc-900" />
              ))}
            </div>
          </div>
          <div>
            <FieldLabel hint={`PDF only, max ${ADMIN_PDF_MAX_LABEL} each, up to 10 files`}>Project Document(s)</FieldLabel>
            <Input layout="field"
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="mt-2 block w-full text-sm"
              onChange={(e) => {
                addDocFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            {(docFiles.length > 0 || existingDocs.length > 0) && (
              <ul className="mt-3 space-y-1.5 text-xs">
                {existingDocs.map((d) => {
                  const removed = removedDocs.includes(d.entry);
                  return (
                    <li
                      key={d.entry}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
                        removed ? "border-red-200 bg-red-50/60" : "border-zinc-200 bg-white"
                      )}
                    >
                      <FileText className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "min-w-0 flex-1 truncate font-medium hover:underline",
                          removed ? "text-zinc-400 line-through" : "text-zinc-700"
                        )}
                        title={d.label}
                      >
                        {d.label}
                      </a>
                      {removed ? (
                        <>
                          <span className="shrink-0 text-red-600">Removed on save</span>
                          <button
                            type="button"
                            onClick={() => setRemovedDocs((prev) => prev.filter((e) => e !== d.entry))}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                          >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                            Undo
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRemovedDocs((prev) => [...prev, d.entry])}
                          className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Remove ${d.label}`}
                          title="Remove document"
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </button>
                      )}
                    </li>
                  );
                })}
                {docFiles.map((f) => (
                  <li
                    key={`${f.name}-${f.lastModified}`}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-2.5 py-1.5"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-zinc-700" title={f.name}>
                      {f.name}
                    </span>
                    <span className="shrink-0 text-zinc-500">New</span>
                    <button
                      type="button"
                      onClick={() => setDocFiles((prev) => prev.filter((x) => x !== f))}
                      className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ${f.name}`}
                      title="Remove file"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <FieldLabel hint="YouTube or embed URL">Project Video</FieldLabel>
            <Input layout="field"
              value={form.projectVideo}
              onChange={(e) => update("projectVideo", e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
            />
          </div>
        </div>
      </AdminFormSection>

      <AdminFormSection title={isBuilder ? "Tags & features" : "Builders, tags & features"}>
        {!isBuilder && (
          <AdminMultiSelect
            label="Builders"
            options={meta.builders}
            value={form.ownerIds}
            onChange={(ownerIds) => update("ownerIds", ownerIds)}
            placeholder="Select builders"
          />
        )}
        <AdminMultiSelect
          label="Tags"
          options={meta.tags}
          value={form.tagIds}
          onChange={(tagIds) => update("tagIds", tagIds)}
          placeholder="Select tags"
        />
        <AdminMultiSelect
          label="Amenities"
          options={meta.amenities}
          value={form.amenityIds}
          onChange={(amenityIds) => update("amenityIds", amenityIds)}
          placeholder="Select amenities"
        />
        <AdminMultiSelect
          label="Utilities"
          options={meta.utilities}
          value={form.utilityIds}
          onChange={(utilityIds) => update("utilityIds", utilityIds)}
          placeholder="Select utilities"
        />
      </AdminFormSection>

      <AdminFormSection title="Project details & highlights">
        <label className="block">
          <FieldLabel>Project Details (HTML)</FieldLabel>
          <Textarea layout="field"
            value={form.details}
            onChange={(e) => update("details", e.target.value)}
            rows={8}
            className={`${inputClass} font-mono text-xs`}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <FieldLabel>Main Heading</FieldLabel>
            <Input layout="field"
              value={form.mainHeading}
              onChange={(e) => update("mainHeading", e.target.value)}
            />
          </label>
          <label className="block">
            <FieldLabel>Sub Heading</FieldLabel>
            <Input layout="field"
              value={form.subHeading}
              onChange={(e) => update("subHeading", e.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(["bullet1", "bullet2", "bullet3", "bullet4", "bullet5", "bullet6"] as const).map(
            (key, i) => (
              <label key={key} className="block">
                <FieldLabel>Bullet {i + 1}</FieldLabel>
                <Input layout="field"
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              </label>
            )
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <FieldLabel>Min price</FieldLabel>
            <Input layout="field"
              type="number"
              value={form.minPrice}
              onChange={(e) => update("minPrice", e.target.value)}
            />
          </label>
          <label className="block">
            <FieldLabel>Installment months</FieldLabel>
            <Input layout="field"
              type="number"
              value={form.installmentLength}
              onChange={(e) => update("installmentLength", e.target.value)}
            />
          </label>
        </div>
      </AdminFormSection>

      <AdminFormSection title="SEO & publishing">
        <label className="block">
          <FieldLabel required>Meta Title</FieldLabel>
          <Textarea layout="field"
            value={form.metaTitle}
            onChange={(e) => update("metaTitle", e.target.value)}
            rows={2}
          />
        </label>
        <label className="block">
          <FieldLabel required>Meta Description</FieldLabel>
          <Textarea layout="field"
            value={form.metaDescription}
            onChange={(e) => update("metaDescription", e.target.value)}
            rows={3}
          />
        </label>
        <label className="block">
          <FieldLabel required>Meta Keywords</FieldLabel>
          <Textarea layout="field"
            value={form.metaTags}
            onChange={(e) => update("metaTags", e.target.value)}
            rows={3}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <FieldLabel hint="Optional. Leave empty to hide on project page">Marketed By</FieldLabel>
            <Input layout="field"
              value={form.marketedBy}
              onChange={(e) => update("marketedBy", e.target.value)}
            />
          </label>
          <label className="block">
            <FieldLabel>Timezone</FieldLabel>
            <AdminSelect
              layout="field"
              value={addedTimeZone}
              onChange={onAddedTimeZoneChange}
              options={ADMIN_TIMEZONE_OPTIONS}
            />
          </label>
          <label className="block md:col-span-2">
            <FieldLabel hint="Listing date shown on the project page">
              Added date & time
            </FieldLabel>
            <Input layout="field"
              type="datetime-local"
              value={form.addedTime}
              onChange={(e) => update("addedTime", e.target.value)}
            />
          </label>
        </div>
      </AdminFormSection>

      {mode === "edit" && projectId != null && projectId > 0 && (
        <AdminProjectUnitsPanel projectId={projectId} />
      )}

      <div
        className={`sticky bottom-0 z-10 flex flex-wrap gap-3 ${adminPanel} bg-white/95 p-4 backdrop-blur`}
      >
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save project"}
        </Button>
        <Button asChild variant="outline">
          <Link href={mode === "create" ? "/admin/projects" : `/admin/projects/${projectId}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
