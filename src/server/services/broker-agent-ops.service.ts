import { prisma } from "@/lib/prisma";
import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { isDatabaseEnabled } from "@/lib/db";
import { tableExists } from "@/lib/db-table-exists";
import { publicAssetUrl } from "@/lib/media-url";
import {
  calculateCommissionAmount,
  formatAgentCode,
  formatCommissionRate,
  type CommissionType,
} from "@/config/broker-agent";
import { createNotification } from "@/server/services/notification.service";
import { ADMIN_BROADCAST } from "@/lib/notifications/recipient";

export type AgentOpsTables = {
  assignments: boolean;
  commissions: boolean;
  leads: boolean;
  requests: boolean;
  referralClicks: boolean;
  brokerExtended: boolean;
};

export async function getAgentOpsTables(): Promise<AgentOpsTables> {
  const [assignments, commissions, leads, requests, referralClicks] =
    await Promise.all([
      tableExists("broker_project_assignments"),
      tableExists("broker_commissions"),
      tableExists("broker_leads"),
      tableExists("broker_assignment_requests"),
      tableExists("broker_referral_clicks"),
    ]);

  let brokerExtended = false;
  if (await tableExists("brokers")) {
    try {
      const cols = await queryRaw<{ Field: string }[]>(
        `SHOW COLUMNS FROM brokers LIKE 'agent_code'`
      );
      brokerExtended = cols.length > 0;
    } catch {
      brokerExtended = false;
    }
  }

  return { assignments, commissions, leads, requests, referralClicks, brokerExtended };
}

export async function ensureBrokerAgentCode(brokerId: number): Promise<string> {
  const code = formatAgentCode(brokerId);
  const ops = await getAgentOpsTables();
  if (!ops.brokerExtended) return code;

  try {
    const row = await prisma.broker.findUnique({
      where: { id: brokerId },
      select: { agentCode: true },
    });
    if (row?.agentCode) return row.agentCode;
    await prisma.broker.update({
      where: { id: brokerId },
      data: { agentCode: code },
    });
  } catch {
    /* column may not exist yet */
  }
  return code;
}

export type AssignmentRow = {
  id: number;
  projectId: number;
  projectName: string;
  projectSlug: string;
  areaName: string | null;
  builderName: string | null;
  commissionType: CommissionType;
  commissionValue: number;
  notes: string | null;
  isActive: boolean;
  assignedAt: string;
  imageUrl: string | null;
  minPrice: number | null;
  unitsCount: number;
};

async function loadBuilderNames(projectIds: number[]): Promise<Map<number, string>> {
  if (!projectIds.length) return new Map();
  const rows = await queryRaw<{ project_id: number; full_name: string }[]>(
    `SELECT po.project_id, b.full_name
     FROM project_owners po
     INNER JOIN builders b ON b.id = po.builder_id
     WHERE po.project_id IN (${projectIds.map(() => "?").join(",")})
     GROUP BY po.project_id, b.full_name`,
    ...projectIds
  );
  const map = new Map<number, string>();
  for (const r of rows) map.set(Number(r.project_id), r.full_name);
  return map;
}

function coverUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  const p = path.trim();
  if (p.startsWith("http") || p.startsWith("/")) return p;
  return publicAssetUrl(p) ?? `/${p.replace(/^\//, "")}`;
}

export async function listBrokerAssignments(
  brokerId: number,
  options?: {
    activeOnly?: boolean;
    areaId?: number;
    builderId?: number;
    commissionType?: CommissionType;
    q?: string;
  }
): Promise<AssignmentRow[]> {
  if (!isDatabaseEnabled()) return [];
  const ops = await getAgentOpsTables();
  if (!ops.assignments) return [];

  const conditions = ["a.broker_id = ?"];
  const params: unknown[] = [brokerId];
  if (options?.activeOnly !== false) {
    conditions.push("a.is_active = 1");
  }
  if (options?.areaId) {
    conditions.push("p.area = ?");
    params.push(options.areaId);
  }
  if (options?.builderId) {
    conditions.push(
      `EXISTS (SELECT 1 FROM project_owners po WHERE po.project_id = p.id AND po.builder_id = ?)`
    );
    params.push(options.builderId);
  }
  if (options?.commissionType) {
    conditions.push("a.commission_type = ?");
    params.push(options.commissionType);
  }
  if (options?.q?.trim()) {
    conditions.push("p.name LIKE ?");
    params.push(`%${options.q.trim()}%`);
  }

  const rows = await queryRaw<
    {
      id: number;
      project_id: number;
      project_name: string;
      project_slug: string;
      area_name: string | null;
      commission_type: string;
      commission_value: unknown;
      notes: string | null;
      is_active: number;
      assigned_at: Date;
      cover_img: string | null;
      min_price: unknown;
    }[]
  >(
    `SELECT a.id, a.project_id, p.name AS project_name, p.slug AS project_slug,
            ar.name AS area_name, a.commission_type, a.commission_value, a.notes,
            a.is_active, a.assigned_at, p.project_cover_img AS cover_img, p.min_price
     FROM broker_project_assignments a
     INNER JOIN projects p ON p.id = a.project_id
     LEFT JOIN areas ar ON ar.id = p.area
     WHERE ${conditions.join(" AND ")}
     ORDER BY a.assigned_at DESC`,
    ...params
  );

  const projectIds = rows.map((r) => Number(r.project_id));
  const [builders, unitCounts] = await Promise.all([
    loadBuilderNames(projectIds),
    projectIds.length
      ? prisma.unit.groupBy({
          by: ["projectId"],
          where: { projectId: { in: projectIds }, isArchive: false },
          _count: { id: true },
        })
      : Promise.resolve([]),
  ]);
  const unitMap = new Map(unitCounts.map((u) => [u.projectId, u._count.id]));

  return rows.map((r) => ({
    id: Number(r.id),
    projectId: Number(r.project_id),
    projectName: r.project_name,
    projectSlug: r.project_slug,
    areaName: r.area_name,
    builderName: builders.get(Number(r.project_id)) ?? null,
    commissionType: r.commission_type as CommissionType,
    commissionValue: Number(r.commission_value),
    notes: r.notes,
    isActive: Boolean(r.is_active),
    assignedAt: new Date(r.assigned_at).toISOString(),
    imageUrl: coverUrl(r.cover_img),
    minPrice: r.min_price != null ? Number(r.min_price) : null,
    unitsCount: unitMap.get(Number(r.project_id)) ?? 0,
  }));
}

export async function assignProjectToBroker(input: {
  brokerId: number;
  projectId: number;
  commissionType: CommissionType;
  commissionValue: number;
  notes?: string | null;
}) {
  const ops = await getAgentOpsTables();
  if (!ops.assignments) throw new Error("Assignment table missing — run scripts/sql/create-broker-agent-ops-tables.sql");

  await executeRaw(
    `INSERT INTO broker_project_assignments
       (broker_id, project_id, commission_type, commission_value, notes, is_active, assigned_at, created_at)
     VALUES (?, ?, ?, ?, ?, 1, NOW(3), NOW(3))
     ON DUPLICATE KEY UPDATE
       commission_type = VALUES(commission_type),
       commission_value = VALUES(commission_value),
       notes = VALUES(notes),
       is_active = 1,
       updated_at = NOW(3)`,
    input.brokerId,
    input.projectId,
    input.commissionType,
    input.commissionValue,
    input.notes ?? null
  );
}

export async function assignProjectsBulk(input: {
  brokerId: number;
  projectIds: number[];
  commissionType: CommissionType;
  commissionValue: number;
  notes?: string | null;
}) {
  for (const projectId of input.projectIds) {
    await assignProjectToBroker({ ...input, projectId });
  }
  return input.projectIds.length;
}

export async function resolveActiveProjectIds(filter: {
  areaId?: number;
  builderId?: number;
}): Promise<number[]> {
  const conditions = ["status = 1", "is_archive = 0"];
  const params: unknown[] = [];
  if (filter.areaId) {
    conditions.push("area = ?");
    params.push(filter.areaId);
  }
  if (filter.builderId) {
    conditions.push(
      `id IN (SELECT project_id FROM project_owners WHERE builder_id = ?)`
    );
    params.push(filter.builderId);
  }
  const rows = await queryRaw<{ id: number }[]>(
    `SELECT id FROM projects WHERE ${conditions.join(" AND ")}`,
    ...params
  );
  return rows.map((r) => Number(r.id));
}

export async function updateAssignment(
  assignmentId: number,
  brokerId: number,
  data: {
    commissionType?: CommissionType;
    commissionValue?: number;
    notes?: string | null;
    isActive?: boolean;
  }
) {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (data.commissionType != null) {
    sets.push("commission_type = ?");
    params.push(data.commissionType);
  }
  if (data.commissionValue != null) {
    sets.push("commission_value = ?");
    params.push(data.commissionValue);
  }
  if (data.notes !== undefined) {
    sets.push("notes = ?");
    params.push(data.notes);
  }
  if (data.isActive !== undefined) {
    sets.push("is_active = ?");
    params.push(data.isActive ? 1 : 0);
  }
  if (!sets.length) return;
  sets.push("updated_at = NOW(3)");
  params.push(assignmentId, brokerId);
  await executeRaw(
    `UPDATE broker_project_assignments SET ${sets.join(", ")} WHERE id = ? AND broker_id = ?`,
    ...params
  );
}

export async function removeAssignment(assignmentId: number, brokerId: number) {
  await executeRaw(
    `DELETE FROM broker_project_assignments WHERE id = ? AND broker_id = ?`,
    assignmentId,
    brokerId
  );
}

export type CommissionRow = {
  id: number;
  projectId: number;
  projectName: string;
  leadId: number | null;
  leadName: string | null;
  dealValue: number;
  commissionAmount: number;
  status: string;
  paymentReference: string | null;
  paidAt: string | null;
  paymentNotes: string | null;
  createdAt: string;
  brokerId?: number;
  brokerName?: string | null;
};

export async function listCommissions(filters: {
  brokerId?: number;
  projectId?: number;
  status?: string;
  month?: string;
  limit?: number;
}): Promise<CommissionRow[]> {
  const ops = await getAgentOpsTables();
  if (!ops.commissions) return [];

  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];
  if (filters.brokerId) {
    conditions.push("c.broker_id = ?");
    params.push(filters.brokerId);
  }
  if (filters.projectId) {
    conditions.push("c.project_id = ?");
    params.push(filters.projectId);
  }
  if (filters.status) {
    conditions.push("c.status = ?");
    params.push(filters.status);
  }
  if (filters.month) {
    conditions.push("DATE_FORMAT(c.created_at, '%Y-%m') = ?");
    params.push(filters.month);
  }

  const limit = Math.min(filters.limit ?? 500, 500);
  const rows = await queryRaw<
    {
      id: number;
      broker_id: number;
      broker_name: string | null;
      project_id: number;
      project_name: string;
      lead_id: number | null;
      client_name: string | null;
      deal_value: unknown;
      commission_amount: unknown;
      status: string;
      payment_reference: string | null;
      paid_at: Date | null;
      payment_notes: string | null;
      created_at: Date;
    }[]
  >(
    `SELECT c.id, c.broker_id, br.contact_person_name AS broker_name, c.project_id,
            p.name AS project_name, c.lead_id, l.client_name,
            c.deal_value, c.commission_amount, c.status, c.payment_reference,
            c.paid_at, c.payment_notes, c.created_at
     FROM broker_commissions c
     INNER JOIN projects p ON p.id = c.project_id
     INNER JOIN brokers br ON br.id = c.broker_id
     LEFT JOIN broker_leads l ON l.id = c.lead_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY c.created_at DESC
     LIMIT ${limit}`,
    ...params
  );

  return rows.map((r) => ({
    id: Number(r.id),
    brokerId: Number(r.broker_id),
    brokerName: r.broker_name,
    projectId: Number(r.project_id),
    projectName: r.project_name,
    leadId: r.lead_id != null ? Number(r.lead_id) : null,
    leadName: r.client_name,
    dealValue: Number(r.deal_value),
    commissionAmount: Number(r.commission_amount),
    status: r.status,
    paymentReference: r.payment_reference,
    paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
    paymentNotes: r.payment_notes,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

export async function createCommission(input: {
  brokerId: number;
  projectId: number;
  leadId?: number | null;
  dealValue: number;
  commissionType: CommissionType;
  commissionValue: number;
}) {
  const amount = calculateCommissionAmount(
    input.dealValue,
    input.commissionType,
    input.commissionValue
  );
  await executeRaw(
    `INSERT INTO broker_commissions
       (broker_id, project_id, lead_id, deal_value, commission_amount, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', NOW(3))`,
    input.brokerId,
    input.projectId,
    input.leadId ?? null,
    input.dealValue,
    amount
  );
}

export async function updateCommissionStatus(
  id: number,
  status: "confirmed" | "paid",
  data?: { paymentReference?: string; paidAt?: Date; paymentNotes?: string }
) {
  if (status === "confirmed") {
    await executeRaw(
      `UPDATE broker_commissions SET status = 'confirmed', updated_at = NOW(3) WHERE id = ?`,
      id
    );
    return;
  }
  await executeRaw(
    `UPDATE broker_commissions SET status = 'paid', payment_reference = ?, paid_at = ?, payment_notes = ?, updated_at = NOW(3) WHERE id = ?`,
    data?.paymentReference ?? null,
    data?.paidAt ?? new Date(),
    data?.paymentNotes ?? null,
    id
  );
}

export type LeadRow = {
  id: number;
  clientName: string;
  phone: string;
  email: string | null;
  projectId: number | null;
  projectName: string | null;
  unitId: number | null;
  unitLabel: string | null;
  unitPrice: number | null;
  source: string | null;
  status: string;
  notes: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  daysSinceContact: number | null;
  commissionType: CommissionType | null;
  commissionValue: number | null;
  commissionRateLabel: string | null;
  estimatedCommission: number | null;
  recordedCommissionAmount: number | null;
  recordedCommissionStatus: string | null;
  recordedDealValue: number | null;
};

function formatLeadUnitLabel(
  unitId: number | null,
  unitTitle: string | null,
  unitRooms: string | null
): string | null {
  if (unitId == null) return null;
  if (unitTitle?.trim()) return unitTitle.trim();
  if (unitRooms?.trim()) return `${unitRooms.trim()} bed`;
  return `Unit #${unitId}`;
}

export async function listBrokerLeads(
  brokerId: number,
  filters?: { status?: string; q?: string }
): Promise<LeadRow[]> {
  const ops = await getAgentOpsTables();
  if (!ops.leads) return [];

  const conditions = ["l.broker_id = ?"];
  const params: unknown[] = [brokerId];
  if (filters?.status) {
    conditions.push("l.status = ?");
    params.push(filters.status);
  }
  if (filters?.q?.trim()) {
    conditions.push("(l.client_name LIKE ? OR l.phone LIKE ?)");
    params.push(`%${filters.q.trim()}%`, `%${filters.q.trim()}%`);
  }

  const rows = await queryRaw<
    {
      id: number;
      client_name: string;
      phone: string;
      email: string | null;
      project_id: number | null;
      project_name: string | null;
      unit_id: number | null;
      unit_title: string | null;
      unit_rooms: string | null;
      unit_price: unknown;
      source: string | null;
      status: string;
      notes: string | null;
      last_contacted_at: Date | null;
      created_at: Date;
      commission_type: string | null;
      commission_value: unknown;
      recorded_commission_amount: unknown;
      recorded_commission_status: string | null;
      recorded_deal_value: unknown;
    }[]
  >(
    `SELECT l.id, l.client_name, l.phone, l.email, l.project_id, p.name AS project_name,
            l.unit_id, u.title AS unit_title, u.rooms AS unit_rooms, u.price AS unit_price,
            l.source, l.status, l.notes, l.last_contacted_at, l.created_at,
            a.commission_type, a.commission_value,
            c.commission_amount AS recorded_commission_amount,
            c.status AS recorded_commission_status,
            c.deal_value AS recorded_deal_value
     FROM broker_leads l
     LEFT JOIN projects p ON p.id = l.project_id
     LEFT JOIN units u ON u.id = l.unit_id
     LEFT JOIN broker_project_assignments a
       ON a.broker_id = l.broker_id AND a.project_id = l.project_id AND a.is_active = 1
     LEFT JOIN broker_commissions c ON c.lead_id = l.id AND c.broker_id = l.broker_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY l.updated_at DESC, l.created_at DESC`,
    ...params
  );

  const now = Date.now();
  return rows.map((r) => {
    const last = r.last_contacted_at ? new Date(r.last_contacted_at).getTime() : null;
    const daysSinceContact =
      last != null ? Math.max(0, Math.floor((now - last) / (1000 * 60 * 60 * 24))) : null;
    const commissionType =
      r.commission_type === "fixed" || r.commission_type === "percentage"
        ? (r.commission_type as CommissionType)
        : null;
    const commissionValue =
      r.commission_value != null ? Number(r.commission_value) : null;
    const unitPrice = r.unit_price != null ? Number(r.unit_price) : null;
    const estimatedCommission =
      commissionType && commissionValue != null && unitPrice != null
        ? calculateCommissionAmount(unitPrice, commissionType, commissionValue)
        : null;

    return {
      id: Number(r.id),
      clientName: r.client_name,
      phone: r.phone,
      email: r.email,
      projectId: r.project_id != null ? Number(r.project_id) : null,
      projectName: r.project_name,
      unitId: r.unit_id != null ? Number(r.unit_id) : null,
      unitLabel: formatLeadUnitLabel(
        r.unit_id != null ? Number(r.unit_id) : null,
        r.unit_title,
        r.unit_rooms
      ),
      unitPrice,
      source: r.source,
      status: r.status,
      notes: r.notes,
      lastContactedAt: r.last_contacted_at
        ? new Date(r.last_contacted_at).toISOString()
        : null,
      createdAt: new Date(r.created_at).toISOString(),
      daysSinceContact,
      commissionType,
      commissionValue,
      commissionRateLabel:
        commissionType && commissionValue != null
          ? formatCommissionRate(commissionType, commissionValue)
          : null,
      estimatedCommission,
      recordedCommissionAmount:
        r.recorded_commission_amount != null
          ? Number(r.recorded_commission_amount)
          : null,
      recordedCommissionStatus: r.recorded_commission_status,
      recordedDealValue:
        r.recorded_deal_value != null ? Number(r.recorded_deal_value) : null,
    };
  });
}

export async function saveBrokerLead(
  brokerId: number,
  input: {
    id?: number;
    clientName: string;
    phone: string;
    email?: string | null;
    projectId?: number | null;
    unitId?: number | null;
    source?: string | null;
    status?: string;
    notes?: string | null;
    logContact?: boolean;
  }
) {
  const ops = await getAgentOpsTables();
  if (!ops.leads) throw new Error("Leads table missing");

  if (input.id) {
    if (input.logContact) {
      await executeRaw(
        `UPDATE broker_leads SET last_contacted_at = NOW(3), updated_at = NOW(3),
          status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END
         WHERE id = ? AND broker_id = ?`,
        input.id,
        brokerId
      );
      return input.id;
    }

    if (input.status && !input.clientName.trim() && !input.phone.trim()) {
      await executeRaw(
        `UPDATE broker_leads SET status = ?, updated_at = NOW(3) WHERE id = ? AND broker_id = ?`,
        input.status,
        input.id,
        brokerId
      );
      return input.id;
    }

    await executeRaw(
      `UPDATE broker_leads SET client_name = ?, phone = ?, email = ?, project_id = ?,
        unit_id = ?, source = ?, status = ?, notes = ?,
        updated_at = NOW(3)
       WHERE id = ? AND broker_id = ?`,
      input.clientName,
      input.phone,
      input.email ?? null,
      input.projectId ?? null,
      input.unitId ?? null,
      input.source ?? null,
      input.status ?? "new",
      input.notes ?? null,
      input.id,
      brokerId
    );
    return input.id;
  }

  await executeRaw(
    `INSERT INTO broker_leads
       (broker_id, client_name, phone, email, project_id, unit_id, source, status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`,
    brokerId,
    input.clientName,
    input.phone,
    input.email ?? null,
    input.projectId ?? null,
    input.unitId ?? null,
    input.source ?? null,
    input.status ?? "new",
    input.notes ?? null
  );
  const inserted = await queryRaw<{ id: number }[]>(`SELECT LAST_INSERT_ID() AS id`);
  return Number(inserted[0]?.id ?? 0);
}

export async function loadBrokerOpsStats(brokerId: number) {
  const ops = await getAgentOpsTables();
  const empty = {
    commissionThisMonth: 0,
    commissionLastMonth: 0,
    assignedProjects: 0,
    assignedAreas: 0,
    activeLeads: 0,
    followUpPending: 0,
    dealsClosedThisMonth: 0,
    dealsClosedAllTime: 0,
    pendingCommission: 0,
    pendingDeals: 0,
    totalEarned: 0,
    topAssignments: [] as AssignmentRow[],
    recentActivity: [] as Array<{
      type: string;
      text: string;
      at: string;
      color: string;
    }>,
  };
  if (!ops.assignments && !ops.commissions && !ops.leads) return empty;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [assignments, commissionAgg, leadAgg, topAssignments] = await Promise.all([
    ops.assignments ? listBrokerAssignments(brokerId, { activeOnly: true }) : Promise.resolve([]),
    ops.commissions
      ? queryRaw<
          {
            pending_sum: unknown;
            pending_count: number;
            total_paid: unknown;
            month_confirmed_paid: unknown;
            last_month: unknown;
            paid_this_month: number;
            paid_all_time: number;
          }[]
        >(
          `SELECT
             COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount END), 0) AS pending_sum,
             COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 END), 0) AS pending_count,
             COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount END), 0) AS total_paid,
             COALESCE(SUM(CASE WHEN status IN ('confirmed','paid') AND DATE_FORMAT(created_at, '%Y-%m') = ? THEN commission_amount END), 0) AS month_confirmed_paid,
             COALESCE(SUM(CASE WHEN status IN ('confirmed','paid') AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(DATE_SUB(?, INTERVAL 1 MONTH), '%Y-%m') THEN commission_amount END), 0) AS last_month,
             COALESCE(SUM(CASE WHEN status = 'paid' AND DATE_FORMAT(paid_at, '%Y-%m') = ? THEN 1 END), 0) AS paid_this_month,
             COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 END), 0) AS paid_all_time
           FROM broker_commissions WHERE broker_id = ?`,
          monthKey,
          monthStart,
          monthKey,
          brokerId
        )
      : Promise.resolve([]),
    ops.leads
      ? queryRaw<{ active_leads: number; follow_up: number }[]>(
          `SELECT
             COALESCE(SUM(CASE WHEN status NOT IN ('closed_won','closed_lost') THEN 1 END), 0) AS active_leads,
             COALESCE(SUM(CASE WHEN status NOT IN ('closed_won','closed_lost') AND (last_contacted_at IS NULL OR last_contacted_at < DATE_SUB(NOW(), INTERVAL 3 DAY)) THEN 1 END), 0) AS follow_up
           FROM broker_leads WHERE broker_id = ?`,
          brokerId
        )
      : Promise.resolve([]),
    ops.assignments
      ? listBrokerAssignments(brokerId, { activeOnly: true }).then((rows) =>
          [...rows]
            .sort((a, b) => b.commissionValue - a.commissionValue)
            .slice(0, 3)
        )
      : Promise.resolve([]),
  ]);

  const areaSet = new Set(assignments.map((a) => a.areaName).filter(Boolean));
  const c = commissionAgg[0];
  const l = leadAgg[0];
  const monthVal = Number(c?.month_confirmed_paid ?? 0);
  const lastVal = Number(c?.last_month ?? 0);
  const pctChange =
    lastVal > 0 ? Math.round(((monthVal - lastVal) / lastVal) * 100) : monthVal > 0 ? 100 : 0;

  const recentActivity = await loadRecentActivity(brokerId, 10).catch(() => [] as Awaited<
    ReturnType<typeof loadRecentActivity>
  >);

  return {
    commissionThisMonth: monthVal,
    commissionLastMonth: lastVal,
    commissionMonthChangePct: pctChange,
    assignedProjects: assignments.length,
    assignedAreas: areaSet.size,
    activeLeads: Number(l?.active_leads ?? 0),
    followUpPending: Number(l?.follow_up ?? 0),
    dealsClosedThisMonth: Number(c?.paid_this_month ?? 0),
    dealsClosedAllTime: Number(c?.paid_all_time ?? 0),
    pendingCommission: Number(c?.pending_sum ?? 0),
    pendingDeals: Number(c?.pending_count ?? 0),
    totalEarned: Number(c?.total_paid ?? 0),
    topAssignments,
    recentActivity,
  };
}

async function loadRecentActivity(brokerId: number, limit: number) {
  const ops = await getAgentOpsTables();
  if (!ops.commissions && !ops.leads && !ops.assignments) return [];

  const events: Array<{ type: string; text: string; at: string; color: string }> = [];

  if (ops.commissions) {
    const rows = await queryRaw<
      { kind: string; project_name: string; amount: unknown; created_at: Date }[]
    >(
      `SELECT c.status AS kind, p.name AS project_name, c.commission_amount AS amount, c.created_at
       FROM broker_commissions c
       INNER JOIN projects p ON p.id = c.project_id
       WHERE c.broker_id = ? AND c.status IN ('confirmed','paid')
       ORDER BY c.created_at DESC LIMIT ?`,
      brokerId,
      limit
    );
    for (const r of rows) {
      events.push({
        type: r.kind,
        text:
          r.kind === "paid"
            ? `Commission paid — ${r.project_name} (Rs ${Number(r.amount).toLocaleString("en-PK")})`
            : `Commission confirmed — ${r.project_name}`,
        at: new Date(r.created_at).toISOString(),
        color: "green",
      });
    }
  }

  if (ops.leads) {
    const rows = await queryRaw<{ client_name: string; created_at: Date }[]>(
      `SELECT client_name, created_at FROM broker_leads WHERE broker_id = ? ORDER BY created_at DESC LIMIT ?`,
      brokerId,
      limit
    );
    for (const r of rows) {
      events.push({
        type: "lead",
        text: `New lead — ${r.client_name}`,
        at: new Date(r.created_at).toISOString(),
        color: "blue",
      });
    }
  }

  if (ops.assignments) {
    const rows = await queryRaw<{ project_name: string; assigned_at: Date }[]>(
      `SELECT p.name AS project_name, a.assigned_at
       FROM broker_project_assignments a
       INNER JOIN projects p ON p.id = a.project_id
       WHERE a.broker_id = ?
       ORDER BY a.assigned_at DESC LIMIT ?`,
      brokerId,
      limit
    );
    for (const r of rows) {
      events.push({
        type: "assignment",
        text: `Project assigned — ${r.project_name}`,
        at: new Date(r.assigned_at).toISOString(),
        color: "blue",
      });
    }
  }

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

async function loadPendingRequestProjectIds(brokerId: number): Promise<Set<number>> {
  const ops = await getAgentOpsTables();
  if (!ops.requests) return new Set();
  const rows = await queryRaw<{ project_id: number }[]>(
    `SELECT project_id FROM broker_assignment_requests WHERE broker_id = ? AND status = 'pending'`,
    brokerId
  );
  return new Set(rows.map((r) => Number(r.project_id)));
}

export async function loadBrowseGroups(brokerId: number) {
  const assignedIds = new Set(
    (await listBrokerAssignments(brokerId, { activeOnly: true })).map((a) => a.projectId)
  );
  const pendingIds = await loadPendingRequestProjectIds(brokerId);

  const projects = await prisma.project.findMany({
    where: { status: 1, isArchive: false },
    select: {
      id: true,
      name: true,
      slug: true,
      minPrice: true,
      projectCoverImg: true,
      location: { select: { id: true, name: true } },
      owners: {
        take: 1,
        select: { builder: { select: { id: true, fullName: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const byArea = new Map<string, typeof projects>();
  const byBuilder = new Map<string, typeof projects>();

  for (const p of projects) {
    const areaKey = p.location?.name ?? "Other";
    const builderKey = p.owners[0]?.builder?.fullName ?? "Unknown builder";
    if (!byArea.has(areaKey)) byArea.set(areaKey, []);
    if (!byBuilder.has(builderKey)) byBuilder.set(builderKey, []);
    byArea.get(areaKey)!.push(p);
    byBuilder.get(builderKey)!.push(p);
  }

  const mapProject = (p: (typeof projects)[0]) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    minPrice: p.minPrice != null ? Number(p.minPrice) : null,
    imageUrl: coverUrl(p.projectCoverImg),
    areaName: p.location?.name ?? null,
    builderName: p.owners[0]?.builder?.fullName ?? null,
    isAssigned: assignedIds.has(p.id),
    isPendingRequest: pendingIds.has(p.id),
  });

  return {
    byArea: [...byArea.entries()].map(([name, items]) => ({
      name,
      count: items.length,
      projects: items.map(mapProject),
    })),
    byBuilder: [...byBuilder.entries()].map(([name, items]) => ({
      name,
      count: items.length,
      projects: items.map(mapProject),
    })),
  };
}

export async function createAssignmentRequest(
  brokerId: number,
  projectId: number,
  message?: string | null
) {
  const ops = await getAgentOpsTables();
  if (!ops.requests) throw new Error("Request table missing");
  await executeRaw(
    `INSERT INTO broker_assignment_requests (broker_id, project_id, message, status, created_at)
     VALUES (?, ?, ?, 'pending', NOW(3))`,
    brokerId,
    projectId,
    message ?? null
  );

  // Resolve project and broker names for the notification
  const rows = await queryRaw<{ project_name: string; broker_name: string }[]>(
    `SELECT p.name AS project_name, br.contact_person_name AS broker_name
     FROM projects p, brokers br
     WHERE p.id = ? AND br.id = ?`,
    projectId,
    brokerId
  );
  const info = rows[0];
  if (info) {
    createNotification({
      recipientType: ADMIN_BROADCAST.type,
      recipientId: ADMIN_BROADCAST.id,
      type: "assignment_request",
      title: "New assignment request",
      message: `${info.broker_name ?? "Agent"} requested assignment for ${info.project_name}`,
      link: "/admin/broker-assignment-requests",
    }).catch(() => {});
  }
}

export async function logReferralClick(brokerId: number, sessionKey?: string | null) {
  const ops = await getAgentOpsTables();
  if (!ops.referralClicks) return;
  await executeRaw(
    `INSERT INTO broker_referral_clicks (broker_id, session_key, created_at) VALUES (?, ?, NOW(3))`,
    brokerId,
    sessionKey ?? null
  );
}

export async function countReferralClicks(brokerId: number): Promise<number> {
  const ops = await getAgentOpsTables();
  if (!ops.referralClicks) return 0;
  const rows = await queryRaw<{ cnt: number }[]>(
    `SELECT COUNT(*) AS cnt FROM broker_referral_clicks WHERE broker_id = ?`,
    brokerId
  );
  return Number(rows[0]?.cnt ?? 0);
}

export async function loadMonthlyCommissionChart(brokerId: number, months = 6) {
  const ops = await getAgentOpsTables();
  if (!ops.commissions) return [];

  const rows = await queryRaw<
    { month_key: string; confirmed: unknown; paid: unknown }[]
  >(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key,
            COALESCE(SUM(CASE WHEN status = 'confirmed' THEN commission_amount END), 0) AS confirmed,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount END), 0) AS paid
     FROM broker_commissions
     WHERE broker_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY month_key
     ORDER BY month_key ASC`,
    brokerId,
    months
  );

  return rows.map((r) => ({
    month: r.month_key,
    confirmed: Number(r.confirmed),
    paid: Number(r.paid),
  }));
}

export type AssignmentRequestRow = {
  id: number;
  brokerId: number;
  brokerName: string | null;
  projectId: number;
  projectName: string | null;
  message: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export async function listAssignmentRequests(filters?: {
  status?: string;
}): Promise<AssignmentRequestRow[]> {
  const ops = await getAgentOpsTables();
  if (!ops.requests) return [];

  const conditions = ["1=1"];
  const params: unknown[] = [];
  if (filters?.status?.trim()) {
    conditions.push("r.status = ?");
    params.push(filters.status.trim());
  }

  const rows = await queryRaw<
    {
      id: number;
      broker_id: number;
      broker_name: string | null;
      project_id: number;
      project_name: string | null;
      message: string | null;
      status: string;
      admin_notes: string | null;
      created_at: Date;
      updated_at: Date | null;
    }[]
  >(
    `SELECT r.id, r.broker_id, br.contact_person_name AS broker_name,
            r.project_id, p.name AS project_name, r.message, r.status,
            r.admin_notes, r.created_at, r.updated_at
     FROM broker_assignment_requests r
     INNER JOIN brokers br ON br.id = r.broker_id
     INNER JOIN projects p ON p.id = r.project_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY r.created_at DESC`,
    ...params
  );

  return rows.map((r) => ({
    id: Number(r.id),
    brokerId: Number(r.broker_id),
    brokerName: r.broker_name,
    projectId: Number(r.project_id),
    projectName: r.project_name,
    message: r.message,
    status: r.status,
    adminNotes: r.admin_notes,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
  }));
}

export async function countPendingAssignmentRequests(): Promise<number> {
  const ops = await getAgentOpsTables();
  if (!ops.requests) return 0;
  const rows = await queryRaw<{ cnt: number }[]>(
    `SELECT COUNT(*) AS cnt FROM broker_assignment_requests WHERE status = 'pending'`
  );
  return Number(rows[0]?.cnt ?? 0);
}

export async function decideAssignmentRequest(
  id: number,
  decision: "approved" | "rejected",
  opts?: {
    adminNotes?: string | null;
    commissionType?: CommissionType;
    commissionValue?: number;
  }
): Promise<void> {
  const ops = await getAgentOpsTables();
  if (!ops.requests) throw new Error("Request table missing");

  if (decision === "approved") {
    const row = await queryRaw<{ broker_id: number; project_id: number }[]>(
      `SELECT broker_id, project_id FROM broker_assignment_requests WHERE id = ?`,
      id
    );
    const req = row[0];
    if (!req) throw new Error("Request not found");

    if (opts?.commissionType && opts?.commissionValue != null) {
      await assignProjectToBroker({
        brokerId: Number(req.broker_id),
        projectId: Number(req.project_id),
        commissionType: opts.commissionType,
        commissionValue: opts.commissionValue,
        notes: opts.adminNotes ?? null,
      });
    }
  }

  await executeRaw(
    `UPDATE broker_assignment_requests SET status = ?, admin_notes = ? WHERE id = ?`,
    decision,
    opts?.adminNotes ?? null,
    id
  );

  // Notify the broker
  const reqRow = await queryRaw<{ broker_id: number; project_id: number }[]>(
    `SELECT broker_id, project_id FROM broker_assignment_requests WHERE id = ?`,
    id
  );
  const r = reqRow[0];
  if (r) {
    const projRows = await queryRaw<{ name: string }[]>(
      `SELECT name FROM projects WHERE id = ?`,
      Number(r.project_id)
    );
    createNotification({
      recipientType: "broker",
      recipientId: Number(r.broker_id),
      type: "assignment_decided",
      title: `Assignment ${decision}`,
      message: `Your request for ${projRows[0]?.name ?? "the project"} was ${decision}.`,
      link: "/broker/projects",
    }).catch(() => {});
  }
}

export async function resolveBrokerByAgentCode(code: string): Promise<number | null> {
  const normalized = code.trim().toUpperCase();
  const row = await prisma.broker.findFirst({
    where: { agentCode: normalized, isArchive: false },
    select: { id: true },
  });
  return row?.id ?? null;
}
