import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { isDatabaseEnabled } from "@/lib/db";
import { jsonNum } from "@/lib/prisma-json";

export type ProgressRow = {
  id: number;
  name: string;
  isActive: boolean;
  projectCount: number;
  createdAt: string | null;
};

export async function listAdminProgress() {
  if (!isDatabaseEnabled()) return { items: [], error: "Database disabled" };

  try {
    const rows = await queryRaw<
      {
        id: number;
        progress_status_name: string;
        isActive: number;
        project_count: bigint;
      }[]
    >(
      `SELECT ps.id, ps.progress_status_name, ps.isActive,
              (SELECT COUNT(*) FROM projects p WHERE p.progress_status_id = ps.id AND p.is_archive = 0) AS project_count
       FROM progress_status ps
       ORDER BY ps.id DESC`
    );

    const items = rows.map((r, i) => ({
      rowNum: i + 1,
      id: jsonNum(r.id),
      name: r.progress_status_name,
      isActive: Boolean(r.isActive),
      projectCount: Number(r.project_count ?? 0),
      createdAt: null,
    }));

    return { items };
  } catch (e) {
    return { items: [], error: String(e) };
  }
}

export async function getAdminProgress(id: number) {
  if (!isDatabaseEnabled()) return { progress: null, error: "Database disabled" };

  try {
    const rows = await queryRaw<
      { id: number; progress_status_name: string; isActive: number }[]
    >(
      `SELECT id, progress_status_name, isActive FROM progress_status WHERE id = ?`,
      id
    );
    const r = rows[0];
    if (!r) return { progress: null, error: "Not found" };

    return {
      progress: {
        id: jsonNum(r.id),
        name: r.progress_status_name,
        isActive: Boolean(r.isActive),
        createdAt: null,
      },
    };
  } catch (e) {
    return { progress: null, error: String(e) };
  }
}

export async function saveAdminProgress(
  id: number | null,
  data: { name: string; isActive: boolean }
) {
  if (!isDatabaseEnabled()) return { success: false, message: "Database disabled" };

  const name = data.name.trim();
  if (!name) return { success: false, message: "Progress name is required" };

  const isActive = data.isActive ? 1 : 0;

  try {
    if (id == null) {
      await executeRaw(
        `INSERT INTO progress_status (progress_status_name, isActive) VALUES (?, ?)`,
        name,
        isActive
      );
      const inserted = await queryRaw<{ id: number }[]>(
        `SELECT id FROM progress_status WHERE progress_status_name = ? ORDER BY id DESC LIMIT 1`,
        name
      );
      return { success: true, id: jsonNum(inserted[0]?.id) };
    }

    await executeRaw(
      `UPDATE progress_status SET progress_status_name = ?, isActive = ? WHERE id = ?`,
      name,
      isActive,
      id
    );
    return { success: true, id };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

export async function archiveAdminProgress(id: number) {
  await executeRaw(`UPDATE progress_status SET isActive = 0 WHERE id = ?`, id);
}
