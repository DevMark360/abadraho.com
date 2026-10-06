import { NextRequest, NextResponse } from "next/server";
import { requireStaffAdminModule } from "@/lib/admin-api-guard";
import {
  archiveAdminBlog,
  getAdminBlog,
  listBlogCategories,
  saveAdminBlog,
} from "@/server/services/admin-blog.service";
import { notifyBlogChanged } from "@/server/services/indexnow.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("blogs", "view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const [result, cats] = await Promise.all([
    getAdminBlog(Number(id)),
    listBlogCategories(),
  ]);

  if (!result.blog) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    blog: result.blog,
    categories: cats.items,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("blogs", "edit");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
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
    Number(id),
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

  if (result.success) notifyBlogChanged(Number(id));
  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("blogs", "delete");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await archiveAdminBlog(Number(id));
  notifyBlogChanged(Number(id));
  return NextResponse.json({ success: true });
}
