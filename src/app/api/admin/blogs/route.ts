import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import {
  listAdminBlogs,
  listBlogCategories,
  saveAdminBlog,
} from "@/server/services/admin-blog.service";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  if (sp.get("meta") === "categories") {
    const cats = await listBlogCategories();
    return NextResponse.json({ success: !cats.error, categories: cats.items, error: cats.error });
  }

  const result = await listAdminBlogs({
    page: Number(sp.get("page") ?? 1),
    perPage: Number(sp.get("perPage") ?? 25),
    q: sp.get("q") ?? undefined,
  });

  return NextResponse.json({
    success: !result.error,
    items: result.items,
    total: result.total,
    error: result.error,
  });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const ct = request.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};
  let coverFile: File | null = null;

  if (ct.includes("multipart/form-data")) {
    const fd = await request.formData();
    body = Object.fromEntries(
      [...fd.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, v])
    );
    const f = fd.get("cover_img") ?? fd.get("coverImg");
    if (f instanceof File && f.size > 0) coverFile = f;
  } else {
    body = await request.json();
  }

  const result = await saveAdminBlog(
    null,
    {
      title: String(body.title ?? ""),
      categoryId: Number(body.categoryId ?? body.category_id) || null,
      description: String(body.description ?? ""),
      isActive: Number(body.isActive ?? body.is_active ?? 0),
      metaTitle: String(body.metaTitle ?? body.meta_title ?? ""),
      metaDescription: String(body.metaDescription ?? body.meta_description ?? ""),
      metaKeywords: String(body.metaKeywords ?? body.meta_keywords ?? ""),
      slug: body.slug != null ? String(body.slug) : undefined,
    },
    coverFile
  );

  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
