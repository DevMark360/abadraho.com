import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { jsonNum } from "@/lib/prisma-json";
import { userTypeIds } from "@/config/site";

export type BuilderRow = {
  rowNum: number;
  id: number;
  fullName: string;
  contactPersonName: string | null;
  contactPersonEmail: string | null;
  contactPersonPhone: string | null;
  userId: number | null;
};

type BuilderDbRow = {
  id: number;
  full_name: string;
  user_id: number | null;
  email: string | null;
  phone_number: string | null;
  first_name: string | null;
  last_name: string | null;
};

function mapBuilderRow(r: BuilderDbRow, i: number): BuilderRow {
  const contactName =
    [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || null;
  return {
    rowNum: i + 1,
    id: jsonNum(r.id),
    fullName: r.full_name,
    userId: r.user_id != null ? jsonNum(r.user_id) : null,
    contactPersonName: contactName,
    contactPersonEmail: r.email,
    contactPersonPhone: r.phone_number,
  };
}

const BUILDER_SELECT = `
  SELECT b.id, b.full_name, b.user_id, b.email, b.phone_number,
         u.first_name, u.last_name
  FROM builders b
  LEFT JOIN users u ON u.id = b.user_id
`;

export async function listAdminBuilders() {
  if (!isDatabaseEnabled()) return { items: [], error: "Database disabled" };

  try {
    const rows = await queryRaw<BuilderDbRow[]>(
      `${BUILDER_SELECT} WHERE b.is_archive = 0 ORDER BY b.full_name ASC`
    );
    return { items: rows.map(mapBuilderRow) };
  } catch (e) {
    return { items: [], error: String(e) };
  }
}

export async function loadBuilderUserOptions() {
  try {
    const users = await prisma.user.findMany({
      where: { userTypeId: userTypeIds.builder, isArchive: false },
      orderBy: { email: "asc" },
      select: { id: true, email: true, firstName: true, lastName: true },
      take: 500,
    });
    return users.map((u) => ({
      value: String(u.id),
      label: u.email ?? `${u.firstName} ${u.lastName ?? ""}`.trim(),
    }));
  } catch {
    return [];
  }
}

export async function getAdminBuilder(id: number) {
  if (!isDatabaseEnabled()) return { builder: null, error: "Database disabled" };

  try {
    const rows = await queryRaw<BuilderDbRow[]>(
      `${BUILDER_SELECT} WHERE b.id = ? AND b.is_archive = 0 LIMIT 1`,
      id
    );
    const row = rows[0];
    if (!row) return { builder: null, error: "Not found" };

    const contactName =
      [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "";

    return {
      builder: {
        id: jsonNum(row.id),
        fullName: row.full_name,
        userId: row.user_id != null ? jsonNum(row.user_id) : null,
        contactPersonName: contactName,
        contactPersonEmail: row.email ?? "",
        contactPersonPhone: row.phone_number ?? "",
      },
    };
  } catch (e) {
    return { builder: null, error: String(e) };
  }
}

export async function saveAdminBuilder(
  id: number | null,
  body: Record<string, unknown>
): Promise<{ builder: { id: number } | null; error?: string }> {
  if (!isDatabaseEnabled()) return { builder: null, error: "Database disabled" };

  const fullName = String(body.fullName ?? "").trim();
  const userId = body.userId != null && body.userId !== "" ? Number(body.userId) : null;
  const contactPersonPhone = String(body.contactPersonPhone ?? "").trim();

  if (!fullName || !userId) {
    return { builder: null, error: "Builder name and linked user are required" };
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, userTypeId: userTypeIds.builder, isArchive: false },
  });
  if (!user) return { builder: null, error: "Invalid builder user account" };

  const email = user.email ?? "";
  const phone = contactPersonPhone || user.phoneNumber || "";

  try {
    if (id == null) {
      const dup = await queryRaw<{ cnt: bigint }[]>(
        `SELECT COUNT(*) AS cnt FROM builders WHERE user_id = ? AND is_archive = 0`,
        userId
      );
      if (Number(dup[0]?.cnt ?? 0) > 0) {
        return { builder: null, error: "This user is already linked to a builder" };
      }

      await executeRaw(
        `INSERT INTO builders (full_name, user_id, email, phone_number, is_archive)
         VALUES (?, ?, ?, ?, 0)`,
        fullName,
        userId,
        email,
        phone
      );
      const created = await queryRaw<{ id: number }[]>(
        `SELECT id FROM builders WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        userId
      );
      return { builder: { id: jsonNum(created[0]?.id) } };
    }

    await executeRaw(
      `UPDATE builders SET full_name = ?, user_id = ?, email = ?, phone_number = ?
       WHERE id = ? AND is_archive = 0`,
      fullName,
      userId,
      email,
      phone,
      id
    );
    return { builder: { id } };
  } catch (e) {
    return { builder: null, error: String(e) };
  }
}

export async function archiveAdminBuilder(id: number) {
  await executeRaw(`UPDATE builders SET is_archive = 1 WHERE id = ?`, id);
}
