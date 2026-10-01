import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { jsonNum } from "@/lib/prisma-json";
import { tableExists } from "@/lib/db-table-exists";
import {
  VOUCHER_MODEL_TYPE,
  buildAdminVoucherData,
  formatVoucherDiscount,
  parseVoucherData,
  randomVoucherCode,
  voucherDisplayName,
  voucherStatusLabel,
} from "@/lib/voucher-data";
import { applyBuilderProjectSql, loadBuilderAccessibleProjectIds } from "@/lib/admin-builder-ownership";

export type VoucherListFilters = {
  page?: number;
  perPage?: number;
  q?: string;
  builderProjectIds?: number[];
};

export type VoucherPayload = {
  projectId: number;
  name: string;
  discountBy: "amount" | "percentage";
  discountApplied: "project" | "unit";
  discountValue: string;
  status: number;
  expiresAt: string;
  unitIds?: number[];
};

type VoucherRow = {
  id: number;
  code: string;
  model_id: number | null;
  data: string | null;
  status: number;
  expires_at: Date | null;
  created_at: Date | null;
  project_name: string | null;
};

function mapListRow(r: VoucherRow, rowNum: number, unitTitles: string[]) {
  const meta = parseVoucherData(r.data);
  return {
    rowNum,
    id: jsonNum(r.id),
    code: r.code,
    name: voucherDisplayName(meta, r.code),
    projectId: r.model_id != null ? jsonNum(r.model_id) : null,
    projectName: r.project_name ?? meta.project_name ?? null,
    discountLabel: formatVoucherDiscount(meta),
    discountApplied: meta.discount_applied ?? null,
    unitTitles,
    status: r.status,
    statusLabel: voucherStatusLabel(r.status),
    isCustomerDownload: Boolean(meta.user_full_name && !meta.name),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
  };
}

async function loadUnitTitlesByVoucherIds(
  ids: number[],
  rows: { id: number; data: string | null }[]
): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (!ids.length) return map;

  const allUnitIds = new Set<number>();
  const perVoucher = new Map<number, number[]>();
  for (const r of rows) {
    const meta = parseVoucherData(r.data);
    const uids = (meta.unit_ids ?? []).map((id) => Number(id)).filter((id) => id > 0);
    if (uids.length) {
      perVoucher.set(jsonNum(r.id), uids);
      uids.forEach((id) => allUnitIds.add(id));
    }
  }
  if (!allUnitIds.size) return map;

  const idList = [...allUnitIds];
  const unitRows = await queryRaw<{ id: number; title: string | null }[]>(
    `SELECT id, title FROM units WHERE id IN (${idList.map(() => "?").join(",")})`,
    ...idList
  );
  const titleById = new Map(unitRows.map((u) => [jsonNum(u.id), u.title ?? `Unit #${u.id}`]));

  for (const [vid, uids] of perVoucher) {
    map.set(vid, uids.map((id) => titleById.get(id) ?? `Unit #${id}`));
  }
  return map;
}

export async function listVouchers(filters: VoucherListFilters = {}) {
  if (!isDatabaseEnabled()) return { items: [], total: 0, error: "Database disabled" };

  const page = filters.page ?? 1;
  const perPage = Math.min(filters.perPage ?? 50, 100);
  const skip = (page - 1) * perPage;

  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];

  applyBuilderProjectSql(conditions, params, "v.model_id", filters.builderProjectIds);

  if (filters.q?.trim()) {
    conditions.push(
      `(v.code LIKE ? OR v.data LIKE ? OR p.name LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(v.data, '$.name')) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(v.data, '$.user_full_name')) LIKE ?)`
    );
    const like = `%${filters.q.trim()}%`;
    params.push(like, like, like, like, like);
  }

  const where = conditions.join(" AND ");

  try {
    const countRows = await queryRaw<{ cnt: bigint }[]>(
      `SELECT COUNT(*) AS cnt FROM vouchers v
       LEFT JOIN projects p ON p.id = v.model_id
       WHERE ${where}`,
      ...params
    );
    const total = Number(countRows[0]?.cnt ?? 0);

    const rows = await queryRaw<VoucherRow[]>(
      `SELECT v.id, v.code, v.model_id, v.data, v.status, v.expires_at, v.created_at,
              p.name AS project_name
       FROM vouchers v
       LEFT JOIN projects p ON p.id = v.model_id
       WHERE ${where}
       ORDER BY v.id DESC
       LIMIT ? OFFSET ?`,
      ...params,
      perPage,
      skip
    );

    const unitMap = await loadUnitTitlesByVoucherIds(
      rows.map((r) => jsonNum(r.id)),
      rows.map((r) => ({ id: jsonNum(r.id), data: r.data }))
    );

    const items = rows.map((r, i) =>
      mapListRow(r, skip + i + 1, unitMap.get(jsonNum(r.id)) ?? [])
    );

    return { items, total };
  } catch (e) {
    return { items: [], total: 0, error: String(e) };
  }
}

export async function getVoucherById(id: number) {
  if (!isDatabaseEnabled()) return { item: null, error: "Database disabled" };

  const rows = await queryRaw<VoucherRow[]>(
    `SELECT v.id, v.code, v.model_id, v.data, v.status, v.expires_at, v.created_at,
            p.name AS project_name
     FROM vouchers v
     LEFT JOIN projects p ON p.id = v.model_id
     WHERE v.id = ? LIMIT 1`,
    id
  );
  const r = rows[0];
  if (!r) return { item: null, error: "Not found" };

  const meta = parseVoucherData(r.data);
  let unitIds = (meta.unit_ids ?? []).map((u) => jsonNum(u));
  if (!unitIds.length && (await tableExists("units_vouchers"))) {
    const uv = await queryRaw<{ unit_id: number }[]>(
      `SELECT unit_id FROM units_vouchers WHERE voucher_id = ?`,
      id
    );
    unitIds = uv.map((row) => jsonNum(row.unit_id));
  }
  const unitMap = await loadUnitTitlesByVoucherIds([id], [{ id, data: r.data }]);

  return {
    item: {
      id: jsonNum(r.id),
      code: r.code,
      projectId: r.model_id != null ? jsonNum(r.model_id) : null,
      projectName: r.project_name ?? meta.project_name ?? null,
      name: meta.name ?? "",
      discountBy: meta.discount_by ?? "amount",
      discountApplied: meta.discount_applied ?? "project",
      discountValue: meta.discount_value != null ? String(meta.discount_value) : "",
      unitIds,
      unitTitles: unitMap.get(id) ?? [],
      status: r.status === 1 ? 1 : 2,
      expiresAt: r.expires_at ? new Date(r.expires_at).toISOString().slice(0, 19) : "",
      displayName: voucherDisplayName(meta, r.code),
      isCustomerDownload: Boolean(meta.user_full_name && !meta.name),
    },
  };
}

export async function loadVoucherFormProjects(
  builderUserId?: number,
  excludeVoucherId?: number
) {
  let projectIds: number[] | undefined;
  if (builderUserId) {
    projectIds = await loadBuilderAccessibleProjectIds(builderUserId);
    if (!projectIds.length) return [];
  }

  const blocked = await queryRaw<{ model_id: number }[]>(
    `SELECT DISTINCT v.model_id FROM vouchers v
     WHERE v.model_type LIKE '%Project%'
       AND JSON_UNQUOTE(JSON_EXTRACT(v.data, '$.discount_applied')) = 'project'
       AND JSON_EXTRACT(v.data, '$.name') IS NOT NULL
       ${excludeVoucherId ? "AND v.id <> ?" : ""}`,
    ...(excludeVoucherId ? [excludeVoucherId] : [])
  );
  const blockedIds = new Set(blocked.map((b) => jsonNum(b.model_id)));

  const projects = await prisma.project.findMany({
    where: {
      isArchive: false,
      ...(projectIds ? { id: { in: projectIds } } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 500,
  });

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    disabled: blockedIds.has(p.id),
  }));
}

export async function loadProjectUnits(projectId: number, excludeVoucherId?: number) {
  const units = await prisma.unit.findMany({
    where: { projectId, isArchive: false },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  if (!(await tableExists("units_vouchers"))) {
    return units.map((u) => ({
      id: u.id,
      title: u.title ?? `Unit #${u.id}`,
      hasOtherVoucher: false,
    }));
  }

  const taken = await queryRaw<{ unit_id: number }[]>(
    `SELECT uv.unit_id FROM units_vouchers uv
     INNER JOIN vouchers v ON v.id = uv.voucher_id
     WHERE v.model_id = ?
       ${excludeVoucherId ? "AND v.id <> ?" : ""}`,
    projectId,
    ...(excludeVoucherId ? [excludeVoucherId] : [])
  );
  const takenIds = new Set(taken.map((t) => jsonNum(t.unit_id)));

  return units.map((u) => ({
    id: u.id,
    title: u.title ?? `Unit #${u.id}`,
    hasOtherVoucher: takenIds.has(u.id),
  }));
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = randomVoucherCode();
    const rows = await queryRaw<{ id: number }[]>(
      `SELECT id FROM vouchers WHERE code = ? LIMIT 1`,
      code
    );
    if (!rows.length) return code;
  }
  throw new Error("Could not generate unique voucher code");
}

export async function createVoucher(payload: VoucherPayload) {
  const project = await prisma.project.findUnique({
    where: { id: payload.projectId },
    select: { name: true },
  });
  if (!project) return { ok: false, error: "Project not found" };

  const code = await uniqueCode();
  const status = payload.status === 2 ? 0 : 1;
  const data = buildAdminVoucherData({
    name: payload.name,
    discountBy: payload.discountBy,
    discountApplied: payload.discountApplied,
    discountValue: payload.discountValue,
    unitIds: payload.unitIds,
    projectName: project.name,
  });

  const result = await executeRaw(
    `INSERT INTO vouchers (code, model_type, model_id, data, status, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    code,
    VOUCHER_MODEL_TYPE,
    payload.projectId,
    data,
    status,
    payload.expiresAt
  );

  const idRows = await queryRaw<{ id: number }[]>(
    `SELECT id FROM vouchers WHERE code = ? LIMIT 1`,
    code
  );
  const id = idRows[0] ? jsonNum(idRows[0].id) : null;

  if (id && payload.discountApplied === "unit" && payload.unitIds?.length) {
    await syncUnitsVouchers(id, payload.unitIds);
  }

  return { ok: true, id, code, affected: result };
}

export async function updateVoucher(id: number, payload: VoucherPayload) {
  const existing = await getVoucherById(id);
  if (!existing.item) return { ok: false, error: "Not found" };
  if (existing.item.isCustomerDownload) {
    return { ok: false, error: "Customer-downloaded vouchers cannot be edited here" };
  }

  const project = await prisma.project.findUnique({
    where: { id: payload.projectId },
    select: { name: true },
  });
  if (!project) return { ok: false, error: "Project not found" };

  const status = payload.status === 2 ? 0 : 1;
  const data = buildAdminVoucherData({
    name: payload.name,
    discountBy: payload.discountBy,
    discountApplied: payload.discountApplied,
    discountValue: payload.discountValue,
    unitIds: payload.unitIds,
    projectName: project.name,
  });

  await executeRaw(
    `UPDATE vouchers SET model_id = ?, data = ?, status = ?, expires_at = ?, updated_at = NOW()
     WHERE id = ?`,
    payload.projectId,
    data,
    status,
    payload.expiresAt,
    id
  );

  if (await tableExists("units_vouchers")) {
    await executeRaw(`DELETE FROM units_vouchers WHERE voucher_id = ?`, id);
  }
  if (payload.discountApplied === "unit" && payload.unitIds?.length) {
    await syncUnitsVouchers(id, payload.unitIds);
  }

  return { ok: true };
}

async function syncUnitsVouchers(voucherId: number, unitIds: number[]) {
  if (!(await tableExists("units_vouchers"))) return;
  for (const unitId of unitIds) {
    await executeRaw(
      `INSERT INTO units_vouchers (voucher_id, unit_id) VALUES (?, ?)`,
      voucherId,
      unitId
    );
  }
}

export async function deleteVoucher(id: number) {
  if (await tableExists("units_vouchers")) {
    await executeRaw(`DELETE FROM units_vouchers WHERE voucher_id = ?`, id);
  }
  await executeRaw(`DELETE FROM user_voucher WHERE voucher_id = ?`, id);
  await executeRaw(`DELETE FROM vouchers WHERE id = ?`, id);
}

export type DownloadedVoucherFilters = {
  page?: number;
  perPage?: number;
  q?: string;
  builderProjectIds?: number[];
};

export async function listDownloadedVouchers(filters: DownloadedVoucherFilters = {}) {
  if (!isDatabaseEnabled()) return { items: [], total: 0, error: "Database disabled" };

  const page = filters.page ?? 1;
  const perPage = Math.min(filters.perPage ?? 100, 100);
  const skip = (page - 1) * perPage;

  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];

  applyBuilderProjectSql(conditions, params, "v.model_id", filters.builderProjectIds);

  if (filters.q?.trim()) {
    conditions.push(
      `(v.code LIKE ? OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(v.data, '$.name')) LIKE ?)`
    );
    const like = `%${filters.q.trim()}%`;
    params.push(like, like, like, like, like);
  }

  const where = conditions.join(" AND ");

  try {
    const countRows = await queryRaw<{ cnt: bigint }[]>(
      `SELECT COUNT(*) AS cnt FROM user_voucher uv
       INNER JOIN vouchers v ON v.id = uv.voucher_id
       INNER JOIN users u ON u.id = uv.user_id
       WHERE ${where}`,
      ...params
    );
    const total = Number(countRows[0]?.cnt ?? 0);

    const rows = await queryRaw<
      {
        id: number;
        voucher_id: number;
        code: string;
        redeemed_at: Date | null;
        user_first_name: string | null;
        user_last_name: string | null;
        user_email: string | null;
        voucher_data: string | null;
        project_name: string | null;
        model_id: number | null;
      }[]
    >(
      `SELECT uv.id, uv.voucher_id, v.code, uv.redeemed_at,
              u.first_name AS user_first_name, u.last_name AS user_last_name, u.email AS user_email,
              v.data AS voucher_data, p.name AS project_name, v.model_id
       FROM user_voucher uv
       INNER JOIN vouchers v ON v.id = uv.voucher_id
       INNER JOIN users u ON u.id = uv.user_id
       LEFT JOIN projects p ON p.id = v.model_id
       WHERE ${where}
       ORDER BY uv.redeemed_at DESC, uv.id DESC
       LIMIT ? OFFSET ?`,
      ...params,
      perPage,
      skip
    );

    const unitMap = await loadUnitTitlesByVoucherIds(
      rows.map((r) => jsonNum(r.voucher_id)),
      rows.map((r) => ({ id: jsonNum(r.voucher_id), data: r.voucher_data }))
    );

    const items = rows.map((r, i) => {
      const meta = parseVoucherData(r.voucher_data);
      const voucherId = jsonNum(r.voucher_id);
      return {
        rowNum: skip + i + 1,
        id: jsonNum(r.id),
        code: r.code,
        userName: [r.user_first_name, r.user_last_name].filter(Boolean).join(" ").trim() || "—",
        userEmail: r.user_email,
        voucherName: voucherDisplayName(meta, r.code),
        projectName: r.project_name ?? meta.project_name ?? null,
        discountApplied: meta.discount_applied ?? null,
        unitTitles: unitMap.get(voucherId) ?? [],
        redeemedAt: r.redeemed_at ? new Date(r.redeemed_at).toISOString() : null,
      };
    });

    return { items, total };
  } catch (e) {
    return { items: [], total: 0, error: String(e) };
  }
}
