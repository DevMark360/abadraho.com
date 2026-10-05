import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { isDatabaseEnabled } from "@/lib/db";
import { tableExists } from "@/lib/db-table-exists";
import { jsonNum } from "@/lib/prisma-json";
import { userTypeIds } from "@/config/site";
import { formatAgentCode } from "@/config/broker-agent";

export type AgentStorageMode = "brokers" | "users";

export type AgentListFilters = {
  userName?: string;
  userEmail?: string;
};

function parseDealsIn(raw: unknown): string | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return JSON.stringify(raw.filter(Boolean));
  if (typeof raw === "string" && raw.trim()) {
    try {
      return JSON.stringify(JSON.parse(raw));
    } catch {
      return JSON.stringify(raw.split(",").map((s) => s.trim()).filter(Boolean));
    }
  }
  return null;
}

function dealsInToArray(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function isTableMissingError(e: unknown): boolean {
  const msg = String(e instanceof Error ? e.message : e);
  return msg.includes("1146") || msg.includes("doesn't exist") || msg.includes("does not exist");
}

async function ensureBrokerAgentCodeOnCreate(brokerId: number) {
  try {
    await prisma.broker.update({
      where: { id: brokerId },
      data: { agentCode: formatAgentCode(brokerId) } as never,
    });
  } catch {
    /* extended columns may not exist until migration */
  }
}

export async function getAgentStorageMode(): Promise<AgentStorageMode> {
  if (!(await tableExists("brokers"))) return "users";
  return "brokers";
}

async function listAgentsFromUsers(filters: AgentListFilters) {
  const conditions: string[] = ["u.is_archive = 0", "u.user_type_id = ?"];
  const params: unknown[] = [userTypeIds.agent];

  if (filters.userEmail?.trim()) {
    conditions.push("u.email = ?");
    params.push(filters.userEmail.trim());
  }
  if (filters.userName?.trim()) {
    const parts = filters.userName.trim().split(/\s+/);
    conditions.push("u.first_name LIKE ?");
    params.push(`%${parts[0]}%`);
    if (parts.length > 1) {
      conditions.push("u.last_name LIKE ?");
      params.push(`%${parts[1]}%`);
    }
  }

  const where = conditions.join(" AND ");
  const rows = await queryRaw<
    {
      id: number;
      first_name: string;
      last_name: string | null;
      email: string | null;
      phone_number: string | null;
      created_at: Date | null;
    }[]
  >(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone_number, u.created_at
     FROM users u
     WHERE ${where}
     ORDER BY u.created_at DESC`,
    ...params
  );

  const items = rows.map((r, i) => ({
    rowNum: i + 1,
    id: jsonNum(r.id),
    contactPersonName: `${r.first_name}${r.last_name ? ` ${r.last_name}` : ""}`.trim(),
    contactEmail: r.email,
    contactNumber: r.phone_number,
    companyName: null as string | null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
  }));

  return { items, storageMode: "users" as const };
}

export type AgentListResult = {
  items: {
    rowNum: number;
    id: number;
    contactPersonName: string | null;
    contactEmail: string | null;
    contactNumber: string | null;
    companyName: string | null;
    createdAt?: string | null;
  }[];
  storageMode?: AgentStorageMode;
  error?: string;
};

export async function listAdminAgents(filters: AgentListFilters = {}): Promise<AgentListResult> {
  if (!isDatabaseEnabled()) return { items: [], error: "Database disabled" };

  const storageMode = await getAgentStorageMode();

  if (storageMode === "users") {
    try {
      return await listAgentsFromUsers(filters);
    } catch (e) {
      return { items: [], error: String(e), storageMode };
    }
  }

  const conditions: string[] = ["is_archive = 0"];
  const params: unknown[] = [];

  if (filters.userEmail?.trim()) {
    conditions.push("contact_email = ?");
    params.push(filters.userEmail.trim());
  }
  if (filters.userName?.trim()) {
    conditions.push("contact_person_name LIKE ?");
    params.push(`%${filters.userName.trim()}%`);
  }

  const where = conditions.join(" AND ");

  try {
    const rows = await queryRaw<
      {
        id: number;
        contact_person_name: string | null;
        contact_email: string | null;
        contact_number: string | null;
        company_name: string | null;
        created_at: Date | null;
      }[]
    >(
      `SELECT id, contact_person_name, contact_email, contact_number, company_name, created_at
       FROM brokers WHERE ${where} ORDER BY created_at DESC`,
      ...params
    );

    const items = rows.map((r, i) => ({
      rowNum: i + 1,
      id: jsonNum(r.id),
      contactPersonName: r.contact_person_name,
      contactEmail: r.contact_email,
      contactNumber: r.contact_number,
      companyName: r.company_name,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    }));

    return { items, storageMode: "brokers" as const };
  } catch (e) {
    if (isTableMissingError(e)) {
      return listAgentsFromUsers(filters);
    }
    return { items: [], error: String(e), storageMode };
  }
}

async function loadBrokerAreaNames(areaIds: number[]): Promise<string[]> {
  if (!areaIds.length) return [];
  try {
    const rows = await queryRaw<{ name: string }[]>(
      `SELECT name FROM areas WHERE id IN (${areaIds.map(() => "?").join(",")}) ORDER BY name`,
      ...areaIds
    );
    return rows.map((r) => r.name);
  } catch {
    return [];
  }
}

async function loadBrokerAreaIds(brokerId: number): Promise<number[]> {
  if (!(await tableExists("broker_area"))) return [];
  try {
    const rows = await queryRaw<{ area_id: bigint }[]>(
      `SELECT area_id FROM broker_area WHERE broker_id = ?`,
      brokerId
    );
    return rows.map((r) => Number(r.area_id));
  } catch {
    return [];
  }
}

async function syncBrokerAreas(brokerId: number, areaIds: number[]) {
  if (!(await tableExists("broker_area"))) return;
  try {
    await executeRaw(`DELETE FROM broker_area WHERE broker_id = ?`, brokerId);
    for (const areaId of areaIds) {
      await executeRaw(
        `INSERT INTO broker_area (broker_id, area_id) VALUES (?, ?)`,
        brokerId,
        areaId
      );
    }
  } catch {
    /* optional pivot table */
  }
}

async function getAgentFromUser(id: number) {
  const user = await prisma.user.findFirst({
    where: { id, isArchive: false, userTypeId: userTypeIds.agent },
  });
  if (!user) return { agent: null, error: "Not found" };

  return {
    agent: {
      id: user.id,
      contactPersonName: `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`.trim(),
      contactNumber: user.phoneNumber ?? "",
      contactEmail: user.email ?? "",
      companyName: "",
      companyAddress: "",
      agentSinceYears: "",
      dealsIn: [] as string[],
      areaIds: [] as string[],
      areaNames: [] as string[],
      userId: user.id,
      createdAt: user.createdAt ? user.createdAt.toISOString() : null,
    },
    storageMode: "users" as const,
  };
}

export async function getAdminAgent(id: number) {
  if (!isDatabaseEnabled()) return { agent: null, error: "Database disabled" };

  const storageMode = await getAgentStorageMode();
  if (storageMode === "users") {
    return getAgentFromUser(id);
  }

  try {
    const broker = await prisma.broker.findFirst({
      where: { id, isArchive: false },
    });
    if (!broker) return { agent: null, error: "Not found" };

    const areaIds = await loadBrokerAreaIds(id);
    const areaNames = await loadBrokerAreaNames(areaIds);

    return {
      agent: {
        id: broker.id,
        contactPersonName: broker.contactPersonName ?? "",
        contactNumber: broker.contactNumber ?? "",
        contactEmail: broker.contactEmail ?? "",
        companyName: broker.companyName ?? "",
        companyAddress: broker.companyAddress ?? "",
        agentSinceYears: broker.agentSinceYears ?? "",
        dealsIn: dealsInToArray(broker.dealsIn),
        areaIds: areaIds.map(String),
        areaNames,
        userId: broker.userId,
        isActive: broker.isActive,
        commissionType: (broker as { commissionType?: string }).commissionType ?? "percentage",
        defaultCommission:
          (broker as { defaultCommission?: { toNumber?: () => number } | null }).defaultCommission !=
          null
            ? Number(
                (broker as { defaultCommission?: unknown }).defaultCommission
              )
            : null,
        bankName: (broker as { bankName?: string | null }).bankName ?? "",
        accountTitle: (broker as { accountTitle?: string | null }).accountTitle ?? "",
        accountNumber: (broker as { accountNumber?: string | null }).accountNumber ?? "",
        iban: (broker as { iban?: string | null }).iban ?? "",
        paymentNotes: (broker as { paymentNotes?: string | null }).paymentNotes ?? "",
        agentTier: (broker as { agentTier?: string }).agentTier ?? "bronze",
        agentCode: (broker as { agentCode?: string | null }).agentCode ?? null,
        createdAt: broker.createdAt ? broker.createdAt.toISOString() : null,
      },
      storageMode: "brokers" as const,
    };
  } catch (e) {
    if (isTableMissingError(e)) return getAgentFromUser(id);
    return { agent: null, error: String(e) };
  }
}

async function saveAgentUserOnly(
  id: number | null,
  body: Record<string, unknown>
): Promise<{ agent: { id: number } | null; error?: string }> {
  const contactPersonName = String(body.contactPersonName ?? "").trim();
  const contactNumber = String(body.contactNumber ?? "").trim();
  const contactEmail = String(body.contactEmail ?? "").trim();
  const password = body.password != null ? String(body.password) : "";

  if (!contactPersonName || !contactNumber || !contactEmail) {
    return { agent: null, error: "Contact name, phone, and email are required" };
  }

  const nameParts = contactPersonName.split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") || "";

  if (id == null) {
    if (password.length < 8) {
      return { agent: null, error: "Login password is required (min 8 characters)" };
    }
    const emailTaken = await prisma.user.findFirst({
      where: { email: contactEmail, isArchive: false },
    });
    if (emailTaken) return { agent: null, error: "Email is already taken" };

    const now = new Date();
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        username: `${firstName}${lastName}`.replace(/\s+/g, ""),
        email: contactEmail,
        phoneNumber: contactNumber,
        userTypeId: userTypeIds.agent,
        password: await bcrypt.hash(password, 10),
        isArchive: false,
        createdAt: now,
        updatedAt: now,
      },
    });

    if (await tableExists("brokers")) {
      try {
        const broker = await prisma.broker.create({
          data: {
            contactPersonName,
            contactNumber,
            contactEmail,
            userId: user.id,
            isActive: true,
            isArchive: false,
          },
        });
        const areaIds = Array.isArray(body.areaIds)
          ? (body.areaIds as unknown[]).map((x) => Number(x)).filter((n) => Number.isFinite(n))
          : [];
        await syncBrokerAreas(broker.id, areaIds);
        return { agent: { id: broker.id } };
      } catch {
        /* fall through — user still created */
      }
    }

    return { agent: { id: user.id } };
  }

  const user = await prisma.user.findFirst({
    where: { id, isArchive: false, userTypeId: userTypeIds.agent },
  });
  if (!user) return { agent: null, error: "Not found" };

  const userData: Record<string, unknown> = {
    firstName,
    lastName,
    email: contactEmail,
    phoneNumber: contactNumber,
    userTypeId: userTypeIds.agent,
  };
  if (password.length >= 8) {
    userData.password = await bcrypt.hash(password, 10);
  }
  await prisma.user.update({ where: { id }, data: userData as never });
  return { agent: { id } };
}

export async function saveAdminAgent(
  id: number | null,
  body: Record<string, unknown>
): Promise<{ agent: { id: number } | null; error?: string }> {
  if (!isDatabaseEnabled()) return { agent: null, error: "Database disabled" };

  const storageMode = await getAgentStorageMode();
  if (storageMode === "users") {
    return saveAgentUserOnly(id, body);
  }

  const contactPersonName = String(body.contactPersonName ?? "").trim();
  const contactNumber = String(body.contactNumber ?? "").trim();
  const contactEmail = String(body.contactEmail ?? "").trim();
  const companyName = body.companyName != null ? String(body.companyName) : null;
  const companyAddress = body.companyAddress != null ? String(body.companyAddress) : null;
  const agentSinceYears =
    body.agentSinceYears != null && body.agentSinceYears !== ""
      ? Number(body.agentSinceYears)
      : null;
  const password = body.password != null ? String(body.password) : "";
  const dealsIn = parseDealsIn(body.dealsIn);
  const areaIds = Array.isArray(body.areaIds)
    ? body.areaIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : [];
  const commissionType =
    body.commissionType === "fixed" ? "fixed" : "percentage";
  const defaultCommission =
    body.defaultCommission != null && body.defaultCommission !== ""
      ? Number(body.defaultCommission)
      : null;
  const bankName = body.bankName != null ? String(body.bankName) : null;
  const accountTitle = body.accountTitle != null ? String(body.accountTitle) : null;
  const accountNumber = body.accountNumber != null ? String(body.accountNumber) : null;
  const iban = body.iban != null ? String(body.iban) : null;
  const paymentNotes = body.paymentNotes != null ? String(body.paymentNotes) : null;
  const agentTier = ["bronze", "silver", "gold", "platinum"].includes(
    String(body.agentTier ?? "")
  )
    ? String(body.agentTier)
    : "bronze";
  const isActive = body.isActive !== false && body.isActive !== "false";

  const extendedBrokerData = {
    commissionType,
    defaultCommission,
    bankName,
    accountTitle,
    accountNumber,
    iban,
    paymentNotes,
    agentTier,
    isActive,
  };

  if (!contactPersonName || !contactNumber || !contactEmail) {
    return { agent: null, error: "Contact name, phone, and email are required" };
  }

  const nameParts = contactPersonName.split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") || "";

  try {
    if (id == null) {
      if (password.length < 8) {
        return { agent: null, error: "Login password is required (min 8 characters)" };
      }

      const emailTaken = await prisma.user.findFirst({
        where: { email: contactEmail, isArchive: false },
      });
      if (emailTaken) return { agent: null, error: "Email is already taken" };

      const now = new Date();
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          username: `${firstName}${lastName}`.replace(/\s+/g, ""),
          email: contactEmail,
          phoneNumber: contactNumber,
          userTypeId: userTypeIds.agent,
          password: await bcrypt.hash(password, 10),
          isArchive: false,
          createdAt: now,
          updatedAt: now,
        },
      });

      const broker = await prisma.broker.create({
        data: {
          contactPersonName,
          contactNumber,
          contactEmail,
          companyName,
          companyAddress,
          agentSinceYears,
          dealsIn,
          userId: user.id,
          isArchive: false,
          ...extendedBrokerData,
        } as never,
      });

      await ensureBrokerAgentCodeOnCreate(broker.id);

      await syncBrokerAreas(broker.id, areaIds);
      return { agent: { id: broker.id } };
    }

    const broker = await prisma.broker.findFirst({ where: { id, isArchive: false } });
    if (!broker) return { agent: null, error: "Not found" };

    if (broker.userId) {
      const userData: Record<string, unknown> = {
        firstName,
        lastName,
        email: contactEmail,
        phoneNumber: contactNumber,
        userTypeId: userTypeIds.agent,
      };
      if (password.length >= 8) {
        userData.password = await bcrypt.hash(password, 10);
      }
      await prisma.user.update({
        where: { id: broker.userId },
        data: userData as never,
      });
    }

    await prisma.broker.update({
      where: { id },
      data: {
        contactPersonName,
        contactNumber,
        contactEmail,
        companyName,
        companyAddress,
        agentSinceYears,
        dealsIn,
        ...extendedBrokerData,
      } as never,
    });

    await ensureBrokerAgentCodeOnCreate(id);

    await syncBrokerAreas(id, areaIds);
    return { agent: { id } };
  } catch (e) {
    if (isTableMissingError(e)) {
      return saveAgentUserOnly(id, body);
    }
    return { agent: null, error: String(e) };
  }
}

export type DeleteAgentResult =
  | { ok: true; userKeptArchived: boolean }
  | { ok: false; status: number; message: string };

/**
 * Deletes the login account; if other records still point at it, archives it instead (archived
 * users can't sign in). Raw SQL on purpose: Prisma model calls read back every mapped column and
 * fail on production tables that predate newer columns.
 */
async function deleteOrArchiveUser(userId: number): Promise<boolean> {
  try {
    await executeRaw(`DELETE FROM users WHERE id = ?`, userId);
    return false;
  } catch {
    await executeRaw(`UPDATE users SET is_archive = 1 WHERE id = ?`, userId);
    return true;
  }
}

/** Tables holding data that belongs only to one broker — removed with the broker. */
const BROKER_OWNED_TABLES = [
  "broker_referral_clicks",
  "broker_short_links",
  "broker_whatsapp_cards",
  "broker_pitch_decks",
  "broker_assignment_requests",
  "broker_project_assignments",
  "broker_leads",
  "broker_area",
] as const;

/**
 * Permanently deletes an agent/broker and the data that only belongs to them (assignments, requests,
 * leads, links, cards). Inquiries are customer records, so they are kept and just unlinked.
 * Agents with commission records are refused — those are payment history.
 * Uses raw SQL and skips tables that don't exist, so older production schemas work too.
 */
export async function deleteAdminAgent(id: number): Promise<DeleteAgentResult> {
  if (!Number.isInteger(id) || id < 1) return { ok: false, status: 400, message: "Invalid agent" };
  const storageMode = await getAgentStorageMode();

  if (storageMode === "users") {
    const rows = await queryRaw<{ id: number }[]>(
      `SELECT id FROM users WHERE id = ? AND user_type_id = ? LIMIT 1`,
      id,
      userTypeIds.agent
    );
    if (!rows.length) return { ok: false, status: 404, message: "Agent not found" };
    return { ok: true, userKeptArchived: await deleteOrArchiveUser(id) };
  }

  const rows = await queryRaw<{ id: number; user_id: number | null }[]>(
    `SELECT id, user_id FROM brokers WHERE id = ? LIMIT 1`,
    id
  );
  const broker = rows[0];
  if (!broker) return { ok: false, status: 404, message: "Agent not found" };

  if (await tableExists("broker_commissions")) {
    const [c] = await queryRaw<{ n: bigint | number }[]>(
      `SELECT COUNT(*) AS n FROM broker_commissions WHERE broker_id = ?`,
      id
    );
    const n = Number(c?.n ?? 0);
    if (n > 0) {
      return {
        ok: false,
        status: 409,
        message: `This agent has ${n} commission record(s). Delete those under Commissions first, because they are payment history.`,
      };
    }
  }

  try {
    await executeRaw(`UPDATE inquiries SET broker_id = NULL WHERE broker_id = ?`, id);
  } catch {
    // older schema without inquiries.broker_id — nothing to unlink
  }
  for (const table of BROKER_OWNED_TABLES) {
    if (await tableExists(table)) {
      await executeRaw(`DELETE FROM ${table} WHERE broker_id = ?`, id);
    }
  }
  await executeRaw(`DELETE FROM brokers WHERE id = ?`, id);

  const userKeptArchived = broker.user_id ? await deleteOrArchiveUser(Number(broker.user_id)) : false;
  return { ok: true, userKeptArchived };
}
