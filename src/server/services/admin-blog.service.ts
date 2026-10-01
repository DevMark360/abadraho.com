import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { jsonNum } from "@/lib/prisma-json";
import { saveBlogCoverImage } from "@/server/services/admin-blog-upload.service";

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);
}

async function uniqueBlogSlug(base: string, excludeId?: number): Promise<string> {
  let slug = slugify(base) || "blog";
  let n = 0;
  while (true) {
    const candidate = n ? `${slug}-${n}` : slug;
    const rows = await queryRaw<{ id: number }[]>(
      excludeId
        ? `SELECT id FROM blog WHERE slug = ? AND id != ? LIMIT 1`
        : `SELECT id FROM blog WHERE slug = ? LIMIT 1`,
      ...(excludeId ? [candidate, excludeId] : [candidate])
    );
    if (!rows.length) return candidate;
    n++;
  }
}

function stripHtml(html: string | null | undefined, max = 90): string {
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export async function listAdminBlogs(filters: { page?: number; perPage?: number; q?: string } = {}) {
  if (!isDatabaseEnabled()) return { items: [], total: 0, error: "Database disabled" };

  const page = filters.page ?? 1;
  const perPage = Math.min(filters.perPage ?? 25, 100);
  const skip = (page - 1) * perPage;
  const conditions = ["b.is_archive = 0"];
  const params: unknown[] = [];

  if (filters.q?.trim()) {
    conditions.push("(b.title LIKE ? OR b.slug LIKE ?)");
    const q = `%${filters.q.trim()}%`;
    params.push(q, q);
  }

  const where = conditions.join(" AND ");

  try {
    const countRows = await queryRaw<{ cnt: bigint }[]>(
      `SELECT COUNT(*) AS cnt FROM blog b WHERE ${where}`,
      ...params
    );
    const total = Number(countRows[0]?.cnt ?? 0);

    const rows = await queryRaw<
      {
        id: number;
        title: string | null;
        slug: string | null;
        description: string | null;
        cover_img: string | null;
        category_id: number | null;
        is_active: number | null;
        created_at: Date | null;
        category_title: string | null;
      }[]
    >(
      `SELECT b.id, b.title, b.slug, b.description, b.cover_img, b.category_id, b.is_active, b.created_at,
              c.title AS category_title
       FROM blog b
       LEFT JOIN blog_category c ON c.id = b.category_id
       WHERE ${where}
       ORDER BY b.id DESC
       LIMIT ? OFFSET ?`,
      ...params,
      perPage,
      skip
    );

    const items = rows.map((r, i) => ({
      rowNum: skip + i + 1,
      id: jsonNum(r.id),
      title: r.title,
      slug: r.slug,
      descriptionPreview: stripHtml(r.description),
      coverImg: r.cover_img,
      categoryId: r.category_id != null ? jsonNum(r.category_id) : null,
      categoryTitle: r.category_title,
      isActive: r.is_active ?? 0,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    }));

    return { items, total };
  } catch (e) {
    return { items: [], total: 0, error: String(e) };
  }
}

export async function getAdminBlog(id: number) {
  if (!isDatabaseEnabled()) return { blog: null, error: "Database disabled" };

  const rows = await queryRaw<
    {
      id: number;
      title: string | null;
      slug: string | null;
      description: string | null;
      cover_img: string | null;
      category_id: number | null;
      is_active: number | null;
      meta_title: string;
      meta_description: string;
      meta_keywords: string;
      created_at: Date | null;
      category_title: string | null;
    }[]
  >(
    `SELECT b.*, c.title AS category_title
     FROM blog b
     LEFT JOIN blog_category c ON c.id = b.category_id
     WHERE b.id = ? AND b.is_archive = 0`,
    id
  );

  const r = rows[0];
  if (!r) return { blog: null, error: "Not found" };

  return {
    blog: {
      id: jsonNum(r.id),
      title: r.title,
      slug: r.slug,
      description: r.description,
      coverImg: r.cover_img,
      categoryId: r.category_id != null ? jsonNum(r.category_id) : null,
      categoryTitle: r.category_title,
      isActive: r.is_active ?? 0,
      metaTitle: r.meta_title,
      metaDescription: r.meta_description,
      metaKeywords: r.meta_keywords,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    },
  };
}

export async function listBlogCategories() {
  if (!isDatabaseEnabled()) return { items: [], error: "Database disabled" };
  try {
    const rows = await queryRaw<{ id: number; title: string | null }[]>(
      `SELECT id, title FROM blog_category WHERE is_archive = 0 ORDER BY title`
    );
    return {
      items: rows.map((r) => ({ id: jsonNum(r.id), title: r.title ?? "" })),
    };
  } catch (e) {
    return { items: [], error: String(e) };
  }
}

export async function saveAdminBlog(
  id: number | null,
  data: {
    title: string;
    categoryId: number | null;
    description: string;
    isActive: number;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    slug?: string;
  },
  coverFile?: File | null
) {
  if (!isDatabaseEnabled()) return { success: false, message: "Database disabled" };

  const title = data.title.trim();
  if (!title) return { success: false, message: "Title is required" };
  if (!data.categoryId) return { success: false, message: "Category is required" };

  const slug = data.slug?.trim()
    ? await uniqueBlogSlug(data.slug.trim(), id ?? undefined)
    : await uniqueBlogSlug(title, id ?? undefined);

  try {
    if (id == null) {
      await executeRaw(
        `INSERT INTO blog (title, category_id, description, meta_title, meta_description, meta_keywords,
          is_active, slug, is_archive, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
        title,
        data.categoryId,
        data.description,
        data.metaTitle,
        data.metaDescription,
        data.metaKeywords,
        data.isActive,
        slug
      );
      const inserted = await queryRaw<{ id: number }[]>(
        `SELECT id FROM blog WHERE slug = ? ORDER BY id DESC LIMIT 1`,
        slug
      );
      const blogId = jsonNum(inserted[0]?.id);
      if (coverFile && blogId) {
        const cover = await saveBlogCoverImage(coverFile);
        if (cover.filename) {
          await executeRaw(`UPDATE blog SET cover_img = ? WHERE id = ?`, cover.filename, blogId);
        }
        if (cover.error) return { success: false, message: cover.error };
      }
      return { success: true, id: blogId, slug };
    }

    await executeRaw(
      `UPDATE blog SET title = ?, category_id = ?, description = ?, meta_title = ?, meta_description = ?,
        meta_keywords = ?, is_active = ?, slug = ?, updated_at = NOW()
       WHERE id = ? AND is_archive = 0`,
      title,
      data.categoryId,
      data.description,
      data.metaTitle,
      data.metaDescription,
      data.metaKeywords,
      data.isActive,
      slug,
      id
    );

    if (coverFile) {
      const cover = await saveBlogCoverImage(coverFile);
      if (cover.error) return { success: false, message: cover.error };
      if (cover.filename) {
        await executeRaw(`UPDATE blog SET cover_img = ? WHERE id = ?`, cover.filename, id);
      }
    }

    return { success: true, id, slug };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

export async function archiveAdminBlog(id: number) {
  await executeRaw(
    `UPDATE blog SET is_archive = 1, updated_at = NOW() WHERE id = ?`,
    id
  );
}

export async function listAdminBlogCategoriesTable() {
  if (!isDatabaseEnabled()) return { items: [], error: "Database disabled" };
  try {
    const rows = await queryRaw<
      { id: number; title: string | null; created_at: Date | null }[]
    >(`SELECT id, title, created_at FROM blog_category WHERE is_archive = 0 ORDER BY id DESC`);

    return {
      items: rows.map((r, i) => ({
        rowNum: i + 1,
        id: jsonNum(r.id),
        title: r.title,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      })),
    };
  } catch (e) {
    return { items: [], error: String(e) };
  }
}

export async function saveBlogCategory(id: number | null, title: string) {
  if (!isDatabaseEnabled()) return { success: false, message: "Database disabled" };
  const t = title.trim();
  if (!t) return { success: false, message: "Title is required" };

  try {
    if (id == null) {
      await executeRaw(
        `INSERT INTO blog_category (title, is_archive, created_at, updated_at) VALUES (?, 0, NOW(), NOW())`,
        t
      );
      return { success: true };
    }
    await executeRaw(
      `UPDATE blog_category SET title = ?, updated_at = NOW() WHERE id = ? AND is_archive = 0`,
      t,
      id
    );
    return { success: true };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

export async function archiveBlogCategory(id: number) {
  await executeRaw(
    `UPDATE blog_category SET is_archive = 1, updated_at = NOW() WHERE id = ?`,
    id
  );
}
