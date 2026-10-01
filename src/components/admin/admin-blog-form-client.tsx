"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { AdminSelect } from "@/components/admin/admin-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { legacyBlogImageUrl } from "@/lib/legacy-url";
import { AdminBackLink, AdminDbAlert, adminCard } from "@/components/admin/admin-ui";
import { preventImplicitFormSubmit } from "@/components/admin/admin-form-section";

type Category = { id: number; title: string };

export function AdminBlogFormClient({
  mode,
  blogId,
}: {
  mode: "create" | "edit";
  blogId?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState("1");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");

  useEffect(() => {
    async function init() {
      if (mode === "edit" && blogId) {
        const res = await fetch(`/api/admin/blogs/${blogId}`);
        const json = await res.json();
        if (!json.success || !json.blog) {
          setError(json.message ?? "Failed to load");
          setLoading(false);
          return;
        }
        const b = json.blog;
        setTitle(b.title ?? "");
        setCategoryId(b.categoryId != null ? String(b.categoryId) : "");
        setDescription(b.description ?? "");
        setIsActive(String(b.isActive ?? 0));
        setMetaTitle(b.metaTitle ?? "");
        setMetaDescription(b.metaDescription ?? "");
        setMetaKeywords(b.metaKeywords ?? "");
        setCoverPreview(legacyBlogImageUrl(b.coverImg));
        if (json.categories) setCategories(json.categories);
        setLoading(false);
        return;
      }
      const meta = await fetch("/api/admin/blogs?meta=categories").then((r) => r.json());
      if (meta.categories) setCategories(meta.categories);
      setLoading(false);
    }
    init();
  }, [mode, blogId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("categoryId", categoryId);
    fd.set("description", description);
    fd.set("isActive", isActive);
    fd.set("metaTitle", metaTitle);
    fd.set("metaDescription", metaDescription);
    fd.set("metaKeywords", metaKeywords);
    if (coverFile) fd.set("cover_img", coverFile);

    const url = mode === "edit" && blogId ? `/api/admin/blogs/${blogId}` : "/api/admin/blogs";
    const method = mode === "edit" ? "PATCH" : "POST";
    const res = await fetch(url, { method, body: fd });
    const json = await res.json();
    setSaving(false);
    if (!json.success) {
      setError(json.message ?? "Save failed");
      return;
    }
    router.push(json.id ? `/admin/blogs/${json.id}` : "/admin/blogs");
  }

  if (loading) return <LoadingState size="sm" />;

  return (
    <div className="max-w-3xl space-y-4">
      <AdminBackLink href="/admin/blogs">Blogs</AdminBackLink>
      {error && <AdminDbAlert message={error} />}

      <form onSubmit={onSubmit} onKeyDown={preventImplicitFormSubmit} className={`${adminCard} space-y-4 p-6`}>
        <h2 className="text-lg font-semibold">{mode === "create" ? "Add blog" : "Edit blog"}</h2>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Blog name *</span>
          <Input layout="field" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Category *</span>
          <AdminSelect
            layout="field"
            value={categoryId}
            onChange={setCategoryId}
            required
            placeholder="Select category…"
            options={[
              { value: "", label: "Select category…" },
              ...categories.map((c) => ({ value: String(c.id), label: c.title })),
            ]}
          />
          <Link href="/admin/blog-categories" className="mt-1 inline-block text-xs text-blue-600 hover:underline">
            Manage categories
          </Link>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Content (HTML) *</span>
          <Textarea layout="field"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={12}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Cover image</span>
          <Input layout="field"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setCoverFile(f ?? null);
              if (f) setCoverPreview(URL.createObjectURL(f));
            }}
          />
          {(coverPreview || coverFile) && (
            <Image
              src={coverPreview!}
              alt="Cover"
              width={200}
              height={120}
              className="mt-2 rounded border object-cover"
              unoptimized
            />
          )}
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Status *</span>
          <AdminSelect
            layout="field"
            value={isActive}
            onChange={setIsActive}
            options={[
              { value: "0", label: "Inactive" },
              { value: "1", label: "Active" },
            ]}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Meta title</span>
          <Textarea layout="field" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} rows={2}  />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Meta description</span>
          <Textarea layout="field"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={3}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Meta keywords</span>
          <Textarea layout="field"
            value={metaKeywords}
            onChange={(e) => setMetaKeywords(e.target.value)}
            rows={3}
          />
        </label>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Create blog" : "Save changes"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/blogs">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
