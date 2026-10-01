import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { intersectBuilderProjectIds } from "@/lib/admin-builder-ownership";
import { jsonNum } from "@/lib/prisma-json";

export type PropertyInquiryFilters = {
  page?: number;
  perPage?: number;
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  projectIds?: number[];
  unitIds?: number[];
  from?: string;
  to?: string;
  builderProjectIds?: number[];
};

export type PropertyInquiryListItem = {
  rowNum: number;
  id: number;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  address: string | null;
  projectId: number | null;
  unitId: number | null;
  projectName: string | null;
  unitTitle: string | null;
  brokerId: number | null;
  agentName: string | null;
  agentCode: string | null;
  createdAt: string | null;
};

export type PropertyInquiryDetail = PropertyInquiryListItem & {
  message: string | null;
};

/** Builder portal: only client name, project, and unit. */
export function redactInquiryForBuilder<T extends PropertyInquiryListItem>(
  inquiry: T
): Pick<T, "rowNum" | "id" | "name" | "projectId" | "unitId" | "projectName" | "unitTitle" | "createdAt"> {
  return {
    rowNum: inquiry.rowNum,
    id: inquiry.id,
    name: inquiry.name,
    projectId: inquiry.projectId,
    unitId: inquiry.unitId,
    projectName: inquiry.projectName,
    unitTitle: inquiry.unitTitle,
    createdAt: inquiry.createdAt,
  };
}

export async function listPropertyInquiries(filters: PropertyInquiryFilters = {}) {
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
      conditions.push(`i.project_id IN (${scoped.map(() => "?").join(",")})`);
      params.push(...scoped);
    }
  } else if (filters.projectIds?.length) {
    conditions.push(
      `i.project_id IN (${filters.projectIds.map(() => "?").join(",")})`
    );
    params.push(...filters.projectIds);
  }

  if (filters.name?.trim()) {
    conditions.push("i.name LIKE ?");
    params.push(`%${filters.name.trim()}%`);
  }
  if (filters.email?.trim()) {
    conditions.push("i.email LIKE ?");
    params.push(`%${filters.email.trim()}%`);
  }
  if (filters.phoneNumber?.trim()) {
    conditions.push("i.phone_number LIKE ?");
    params.push(`%${filters.phoneNumber.trim()}%`);
  }
  if (filters.address?.trim()) {
    conditions.push("i.address LIKE ?");
    params.push(`%${filters.address.trim()}%`);
  }
  if (filters.unitIds?.length) {
    conditions.push(`i.unit_id IN (${filters.unitIds.map(() => "?").join(",")})`);
    params.push(...filters.unitIds);
  }
  if (filters.from && filters.to) {
    conditions.push("i.created_at BETWEEN ? AND ?");
    params.push(`${filters.from} 00:00:00`, `${filters.to} 23:59:59`);
  }

  const where = conditions.join(" AND ");

  try {
    const countRows = await queryRaw<{ cnt: bigint }[]>(
      `SELECT COUNT(*) AS cnt FROM inquiries i WHERE ${where}`,
      ...params
    );
    const total = Number(countRows[0]?.cnt ?? 0);

    const rows = await queryRaw<
      {
        id: number;
        name: string | null;
        email: string | null;
        phone_number: string | null;
        address: string | null;
        project_id: number | null;
        unit_id: number | null;
        broker_id: number | null;
        created_at: Date | null;
        project_name: string | null;
        unit_title: string | null;
        agent_name: string | null;
        agent_code: string | null;
      }[]
    >(
      `SELECT i.id, i.name, i.email, i.phone_number, i.address, i.project_id, i.unit_id,
              i.broker_id, i.created_at,
              p.name AS project_name, u.title AS unit_title,
              br.contact_person_name AS agent_name, br.agent_code
       FROM inquiries i
       LEFT JOIN projects p ON p.id = i.project_id
       LEFT JOIN units u ON u.id = i.unit_id
       LEFT JOIN brokers br ON br.id = i.broker_id
       WHERE ${where}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      ...params,
      perPage,
      skip
    );

    const items: PropertyInquiryListItem[] = rows.map((r, i) => ({
      rowNum: skip + i + 1,
      id: jsonNum(r.id),
      name: r.name,
      email: r.email,
      phoneNumber: r.phone_number,
      address: r.address,
      projectId: r.project_id != null ? jsonNum(r.project_id) : null,
      unitId: r.unit_id != null ? jsonNum(r.unit_id) : null,
      projectName: r.project_name,
      unitTitle: r.unit_title,
      brokerId: r.broker_id != null ? jsonNum(r.broker_id) : null,
      agentName: r.agent_name,
      agentCode: r.agent_code,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    }));

    return { items, total };
  } catch (e) {
    return { items: [], total: 0, error: String(e) };
  }
}

export async function getPropertyInquiry(id: number) {
  if (!isDatabaseEnabled()) return { inquiry: null, error: "Database disabled" };

  const rows = await queryRaw<
    {
      id: number;
      name: string | null;
      email: string | null;
      phone_number: string | null;
      address: string | null;
      message: string | null;
      project_id: number | null;
      unit_id: number | null;
      broker_id: number | null;
      created_at: Date | null;
      project_name: string | null;
      unit_title: string | null;
      agent_name: string | null;
      agent_code: string | null;
    }[]
  >(
    `SELECT i.*, p.name AS project_name, u.title AS unit_title,
            br.contact_person_name AS agent_name, br.agent_code
     FROM inquiries i
     LEFT JOIN projects p ON p.id = i.project_id
     LEFT JOIN units u ON u.id = i.unit_id
     LEFT JOIN brokers br ON br.id = i.broker_id
     WHERE i.id = ?`,
    id
  );

  const r = rows[0];
  if (!r) return { inquiry: null, error: "Not found" };

  const inquiry: PropertyInquiryDetail = {
    id: jsonNum(r.id),
    rowNum: 0,
    name: r.name,
    email: r.email,
    phoneNumber: r.phone_number,
    address: r.address,
    message: r.message,
    projectId: r.project_id != null ? jsonNum(r.project_id) : null,
    unitId: r.unit_id != null ? jsonNum(r.unit_id) : null,
    projectName: r.project_name,
    unitTitle: r.unit_title,
    brokerId: r.broker_id != null ? jsonNum(r.broker_id) : null,
    agentName: r.agent_name,
    agentCode: r.agent_code,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
  };

  return { inquiry };
}

export async function deletePropertyInquiry(id: number) {
  await executeRaw(`DELETE FROM inquiries WHERE id = ?`, id);
}

export { loadBuilderProjectIds } from "@/lib/admin-builder-ownership";
