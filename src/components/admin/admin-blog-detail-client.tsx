"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { legacyBlogImageUrl } from "@/lib/legacy-url";
import { AdminBackLink, AdminDbAlert, adminCard } from "@/components/admin/admin-ui";
import { AdminDetailTable } from "@/components/admin/admin-detail-table";
import { fmtDate } from "@/components/admin/admin-search-history-format";
import { SanitizedHtml } from "@/components/ui/sanitized-html";

type BlogDetail = {
  id: number;
  title: string | null;
  slug: string | null;
  description: string | null;
  coverImg: string | null;
  categoryTitle: string | null;
  isActive: number;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  createdAt: string | null;
};

export function AdminBlogDetailClient({ id }: { id: number }) {
  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/blogs/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.blog) setBlog(j.blog);
        else setError(j.message ?? "Not found");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingState size="sm" />;
  if (!blog) return <AdminDbAlert message={error ?? "Blog not found"} />;

  const cover = legacyBlogImageUrl(blog.coverImg);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminBackLink href="/admin/blogs">Blogs</AdminBackLink>
        <Button asChild>
          <Link href={`/admin/blogs/${id}/edit`}>Edit blog</Link>
        </Button>
      </div>

      <AdminDetailTable
        title="Blog details"
        rows={[
          { label: "Title", value: blog.title ?? "—" },
          { label: "Slug", value: blog.slug ?? "—" },
          { label: "Category", value: blog.categoryTitle ?? "—" },
          {
            label: "Status",
            value: blog.isActive === 1 ? "Active" : "Inactive",
          },
          { label: "Created", value: fmtDate(blog.createdAt) },
          { label: "Meta title", value: blog.metaTitle || "—" },
          { label: "Meta description", value: blog.metaDescription || "—" },
          { label: "Meta keywords", value: blog.metaKeywords || "—" },
        ]}
      />

      {cover && (
        <div className={adminCard + " p-4"}>
          <h3 className="mb-2 text-sm font-semibold text-zinc-800">Cover image</h3>
          <Image src={cover} alt="" width={320} height={200} className="rounded border object-cover" unoptimized />
        </div>
      )}

      <div className={adminCard + " p-4"}>
        <h3 className="mb-3 text-sm font-semibold text-zinc-800">Content preview</h3>
        <SanitizedHtml
          html={blog.description}
          className="prose prose-sm max-w-none text-zinc-800"
        />
      </div>
    </div>
  );
}
