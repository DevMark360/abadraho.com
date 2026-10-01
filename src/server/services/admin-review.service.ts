import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { isDatabaseEnabled } from "@/lib/db";
import { intersectBuilderProjectIds } from "@/lib/admin-builder-ownership";
import { jsonNum } from "@/lib/prisma-json";
import { isReviewStatus, type ReviewStatus } from "@/lib/review-status";


export type AdminReviewFilters = {
  page?: number;
  perPage?: number;
  name?: string;
  email?: string;
  phoneNumber?: string;
  projectIds?: number[];
  from?: string;
  to?: string;
  status?: ReviewStatus;
  builderProjectIds?: number[];
};

export async function listAdminReviews(filters: AdminReviewFilters = {}) {
  if (!isDatabaseEnabled()) return { items: [], total: 0, error: "Database disabled" };

  const page = filters.page ?? 1;
  const perPage = Math.min(filters.perPage ?? 25, 100);
  const skip = (page - 1) * perPage;

  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];

  if (filters.builderProjectIds !== undefined) {
    const scoped = intersectBuilderProjectIds(
      filters.builderProjectIds,
      filters.projectIds
    );
    if (!scoped?.length) {
      conditions.push("1=0");
    } else {
      conditions.push(`r.project_id IN (${scoped.map(() => "?").join(",")})`);
      params.push(...scoped);
    }
  } else if (filters.projectIds?.length) {
    conditions.push(`r.project_id IN (${filters.projectIds.map(() => "?").join(",")})`);
    params.push(...filters.projectIds);
  }
  if (filters.name?.trim()) {
    conditions.push("(u.first_name LIKE ? OR u.last_name LIKE ?)");
    const q = `%${filters.name.trim()}%`;
    params.push(q, q);
  }
  if (filters.email?.trim()) {
    conditions.push("u.email LIKE ?");
    params.push(`%${filters.email.trim()}%`);
  }
  if (filters.phoneNumber?.trim()) {
    conditions.push("u.phone_number LIKE ?");
    params.push(`%${filters.phoneNumber.trim()}%`);
  }
  if (filters.from && filters.to) {
    conditions.push("r.created_at BETWEEN ? AND ?");
    params.push(`${filters.from} 00:00:00`, `${filters.to} 23:59:59`);
  }
  if (filters.status) {
    conditions.push("r.status = ?");
    params.push(filters.status);
  }

  const where = conditions.join(" AND ");

  try {
    const countRows = await queryRaw<{ cnt: bigint }[]>(
      `SELECT COUNT(*) AS cnt FROM reviews r
       INNER JOIN users u ON u.id = r.user_id
       INNER JOIN projects p ON p.id = r.project_id
       WHERE ${where}`,
      ...params
    );
    const total = Number(countRows[0]?.cnt ?? 0);

    const rows = await queryRaw<
      {
        id: number;
        rating: number;
        review: string;
        status: string;
        created_at: Date | null;
        project_id: number;
        project_name: string;
        project_slug: string | null;
        user_id: number;
        first_name: string | null;
        last_name: string | null;
        email: string;
        phone_number: string | null;
      }[]
    >(
      `SELECT r.id, r.rating, r.review, r.status, r.created_at, r.project_id,
              p.name AS project_name, p.slug AS project_slug,
              u.id AS user_id, u.first_name, u.last_name, u.email, u.phone_number
       FROM reviews r
       INNER JOIN users u ON u.id = r.user_id
       INNER JOIN projects p ON p.id = r.project_id
       WHERE ${where}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT ? OFFSET ?`,
      ...params,
      perPage,
      skip
    );

    const items = rows.map((row, i) => ({
      rowNum: skip + i + 1,
      id: jsonNum(row.id),
      rating: jsonNum(row.rating),
      comment: row.review,
      status: isReviewStatus(row.status) ? row.status : "pending",
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      projectId: jsonNum(row.project_id),
      projectName: row.project_name,
      projectSlug: row.project_slug,
      userId: jsonNum(row.user_id),
      userName: [row.first_name, row.last_name].filter(Boolean).join(" ") || null,
      email: row.email,
      phoneNumber: row.phone_number,
    }));

    return { items, total };
  } catch (e) {
    return { items: [], total: 0, error: String(e) };
  }
}

export async function getAdminReview(id: number) {
  if (!isDatabaseEnabled()) return { review: null, error: "Database disabled" };

  const rows = await queryRaw<
    {
      id: number;
      rating: number;
      review: string;
      status: string;
      created_at: Date | null;
      updated_at: Date | null;
      project_id: number;
      project_name: string;
      project_slug: string | null;
      user_id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      phone_number: string | null;
    }[]
  >(
    `SELECT r.id, r.rating, r.review, r.status, r.created_at, r.updated_at, r.project_id,
            p.name AS project_name, p.slug AS project_slug,
            u.id AS user_id, u.first_name, u.last_name, u.email, u.phone_number
     FROM reviews r
     INNER JOIN users u ON u.id = r.user_id
     INNER JOIN projects p ON p.id = r.project_id
     WHERE r.id = ?`,
    id
  );

  const row = rows[0];
  if (!row) return { review: null, error: "Not found" };

  return {
    review: {
      id: jsonNum(row.id),
      rating: jsonNum(row.rating),
      comment: row.review,
      status: isReviewStatus(row.status) ? row.status : "pending",
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      projectId: jsonNum(row.project_id),
      projectName: row.project_name,
      projectSlug: row.project_slug,
      userId: jsonNum(row.user_id),
      userName: [row.first_name, row.last_name].filter(Boolean).join(" ") || null,
      email: row.email,
      phoneNumber: row.phone_number,
    },
  };
}

export async function deleteAdminReview(id: number) {
  await executeRaw(`DELETE FROM reviews WHERE id = ?`, id);
}

export async function updateAdminReview(
  id: number,
  data: { rating?: number; comment?: string; status?: ReviewStatus }
) {
  const rating = data.rating;
  const comment = data.comment?.trim();
  const status = data.status;
  if (rating != null && (rating < 1 || rating > 5)) {
    return { success: false, message: "Rating must be 1–5" };
  }
  if (comment != null && !comment) {
    return { success: false, message: "Review text is required" };
  }
  if (status != null && !isReviewStatus(status)) {
    return { success: false, message: "Invalid review status" };
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  if (rating != null) {
    sets.push("rating = ?");
    params.push(rating);
  }
  if (comment != null) {
    sets.push("review = ?");
    params.push(comment.slice(0, 255));
  }
  if (status != null) {
    sets.push("status = ?");
    params.push(status);
  }
  if (!sets.length) {
    return { success: false, message: "Nothing to update" };
  }
  sets.push("updated_at = NOW()");
  params.push(id);

  await executeRaw(
    `UPDATE reviews SET ${sets.join(", ")} WHERE id = ?`,
    ...params
  );
  return { success: true };
}
