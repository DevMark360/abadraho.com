import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { executeRaw } from "@/lib/prisma-raw";
import { isDatabaseEnabled } from "@/lib/db";
import { tableExists } from "@/lib/db-table-exists";
import { parseContactForm } from "@/lib/contact-form";
import {
  BROKER_ATTRIBUTION_COOKIE,
  normalizeAgentCode,
} from "@/lib/broker-attribution";
import { sendContactInquiryEmail, sendPropertyInquiryRoutedEmails } from "@/lib/mail";
import { sendProjectInquiryToN8n } from "@/lib/n8n-webhook";
import type { SessionUser } from "@/lib/session";
import { createNotification } from "@/server/services/notification.service";
import { ADMIN_BROADCAST } from "@/lib/notifications/recipient";
import {
  resolveBrokerByAgentCode,
  saveBrokerLead,
} from "@/server/services/broker-agent-ops.service";

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function resolveInquiryBrokerId(
  body: Record<string, unknown>
): Promise<number | null> {
  const fromBody = num(body.broker_id);
  if (fromBody) {
    const row = await prisma.broker.findFirst({
      where: { id: fromBody, isArchive: false, isActive: true },
      select: { id: true },
    });
    if (row) return row.id;
  }

  const agentCode = normalizeAgentCode(String(body.agent_code ?? ""));
  if (agentCode) {
    const brokerId = await resolveBrokerByAgentCode(agentCode);
    if (brokerId) return brokerId;
  }

  const jar = await cookies();
  const cookieCode = jar.get(BROKER_ATTRIBUTION_COOKIE)?.value;
  if (cookieCode) {
    return resolveBrokerByAgentCode(cookieCode);
  }

  return null;
}

async function resolveBrokerNotifyContact(brokerId: number): Promise<{
  name: string | null;
  email: string | null;
  agentCode: string | null;
}> {
  const broker = await prisma.broker.findUnique({
    where: { id: brokerId },
    select: {
      contactPersonName: true,
      contactEmail: true,
      agentCode: true,
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  });
  if (!broker) return { name: null, email: null, agentCode: null };

  const email = (broker.contactEmail ?? broker.user?.email)?.trim() || null;
  const userName = [broker.user?.firstName, broker.user?.lastName].filter(Boolean).join(" ").trim();
  const name = (broker.contactPersonName ?? userName)?.trim() || null;
  return { name, email, agentCode: broker.agentCode ?? null };
}

export async function createPropertyInquiry(
  body: Record<string, unknown>,
  session: SessionUser | null
) {
  if (!isDatabaseEnabled()) {
    return { success: false as const, message: "Database not configured" };
  }

  const name = str(body.name);
  const email = str(body.email);
  const address = str(body.address) || "N/A";
  const phoneNumber = str(body.phone_number ?? body.phone);
  const message = str(body.message);
  const unitId = num(body.unit_id);

  if (!name || !email || !address || !phoneNumber || !message || !unitId) {
    return { success: false as const, message: "All fields are required" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false as const, message: "Enter a valid email address" };
  }
  if (phoneNumber.replace(/\D/g, "").length < 11) {
    return { success: false as const, message: "Phone number must be at least 11 digits" };
  }

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: {
      id: true,
      projectId: true,
      title: true,
      project: {
        select: {
          id: true,
          name: true,
          owners: {
            take: 1,
            orderBy: { id: "asc" },
            select: {
              builder: {
                select: { fullName: true, email: true },
              },
            },
          },
        },
      },
    },
  });
  if (!unit) {
    return { success: false as const, message: "Unit not found" };
  }

  const projectId = num(body.project_id) ?? unit.projectId;
  const project = unit.project;
  const builderContact = await resolveProjectBuilderContact(
    projectId,
    project?.owners[0]?.builder ?? null
  );
  const brokerId = await resolveInquiryBrokerId(body);
  const brokerContact = brokerId ? await resolveBrokerNotifyContact(brokerId) : null;
  const now = new Date();

  const form = await prisma.inquiry.create({
    data: {
      userId: session?.id ?? null,
      brokerId,
      name,
      email,
      address,
      phoneNumber,
      unitId: unit.id,
      projectId,
      message,
      createdAt: now,
      updatedAt: now,
    },
  });

  if (brokerId) {
    try {
      await saveBrokerLead(brokerId, {
        clientName: name,
        phone: phoneNumber,
        email,
        projectId,
        unitId: unit.id,
        source: "inquiry_form",
        status: "new",
        notes: message ? `Inquiry #${form.id}: ${message}` : `Inquiry #${form.id}`,
      });
    } catch (e) {
      console.error("[inquiry] broker lead sync failed", e);
    }
  }

  // Don't block the response on outbound SMTP — a slow/unreachable mail host
  // must not hold this request handler open.
  sendPropertyInquiryRoutedEmails({
    name,
    email,
    address,
    phone: phoneNumber,
    unit: unit.title ?? `Unit #${unit.id}`,
    project: project?.name ?? `Project #${projectId}`,
    message,
    builderEmail: builderContact.email,
    builderName: builderContact.name,
    agentEmail: brokerContact?.email,
    agentName: brokerContact?.name,
    agentCode: brokerContact?.agentCode,
  }).catch((e) => console.error("[inquiry] email dispatch failed", e));

  // Fire-and-forget, same as email — the n8n workflow must not delay the response.
  void sendProjectInquiryToN8n({
    clientName: name,
    email,
    phone: phoneNumber,
    projectName: project?.name ?? `Project #${projectId}`,
  });

  createNotification({
    recipientType: ADMIN_BROADCAST.type,
    recipientId: ADMIN_BROADCAST.id,
    type: "inquiry",
    title: "New property inquiry",
    message: `${name} inquired about ${project?.name ?? "a project"} — ${unit.title ?? `Unit #${unit.id}`}`,
    link: "/admin/inquiries",
  }).catch(() => {});

  return {
    success: true as const,
    data: form,
    response: "200",
    message: "Inquiry submitted. We will contact you soon.",
  };
}

async function resolveProjectBuilderContact(
  projectId: number,
  builder: { fullName: string; email: string | null } | null
): Promise<{ name: string | null; email: string | null }> {
  if (builder?.email?.trim()) {
    return { name: builder.fullName, email: builder.email.trim() };
  }

  try {
    const rows = await prisma.$queryRaw<
      {
        contact_person_email: string | null;
        contact_person_name: string | null;
        email: string | null;
        full_name: string | null;
      }[]
    >`
      SELECT b.contact_person_email, b.contact_person_name, b.email, b.full_name
      FROM project_owners po
      INNER JOIN builders b ON b.id = po.builder_id
      WHERE po.project_id = ${projectId}
      ORDER BY po.id ASC
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { name: builder?.fullName ?? null, email: null };
    const email = (row.contact_person_email ?? row.email)?.trim() || null;
    const name = (row.contact_person_name ?? row.full_name ?? builder?.fullName)?.trim() || null;
    return { name, email };
  } catch {
    return { name: builder?.fullName ?? null, email: builder?.email?.trim() ?? null };
  }
}

export async function createContactInquiry(body: Record<string, unknown>) {
  if (!isDatabaseEnabled()) {
    return { success: false as const, message: "Database not configured" };
  }

  const parsed = parseContactForm(body);
  if (!parsed.success) {
    return { success: false as const, message: parsed.message };
  }

  const { name, email, phone, subject, message } = parsed.data;

  await prisma.contactUs.create({
    data: { name, email, phone, subject, message },
  });

  sendContactInquiryEmail({ name, email, phone, subject, message }).catch((e) =>
    console.error("[contact] email dispatch failed", e)
  );

  createNotification({
    recipientType: ADMIN_BROADCAST.type,
    recipientId: ADMIN_BROADCAST.id,
    type: "contact",
    title: "New contact inquiry",
    message: `${name} — ${subject || "No subject"}`,
    link: "/admin/contact",
  }).catch(() => {});

  return {
    success: true as const,
    message: "Thank you for your inquiry. We will get back to you shortly!",
  };
}

export async function createSearchHistory(
  body: Record<string, unknown>,
  session: SessionUser | null
) {
  if (!isDatabaseEnabled()) {
    return { success: false as const, message: "Database not configured" };
  }

  if (!session?.id) {
    return { success: false as const, message: "Sign in to save search history." };
  }

  const now = new Date();
  const userId = session.id;

  if (body.type === "housing_calc") {
    const row = await prisma.userSearchHistory.create({
      data: {
        userId,
        searchType: "housing_calc",
        json: JSON.stringify({
          annual_income: body.annual_income,
          down_payment: body.down_payment,
          result: body.result,
        }),
        maxBudget: num(body.result),
        downPayment: num(body.down_payment),
        createdAt: now,
        updatedAt: now,
      },
    });
    return { success: true as const, data: row };
  }

  if (body.type === "calculator") {
    const row = await prisma.userSearchHistory.create({
      data: {
        userId,
        searchType: "calculator",
        json: JSON.stringify({
          area: body.area,
          type: body.type,
          maxBudget: body.maxBudget,
          downPayment: body.downPayment,
          booking: body.booking,
          allocation: body.allocation,
          confirmation: body.confirmation,
          startOfWork: body.startOfWork,
          splitDownPayment: body.splitDownPayment,
          monthInstall: body.monthInstall,
          quarterlyInstall: body.quarterlyInstall,
          halfYearlyInstall: body.halfYearlyInstall,
          yearlyInstall: body.yearlyInstall,
          possession: body.possession,
          projectType: body.projectType,
          duration: body.duration,
          slabCasting: body.slabCasting,
          plinth: body.plinth,
          colour: body.colour,
        }),
        maxBudget: num(body.maxBudget),
        downPayment: num(body.downPayment),
        monthInstall: num(body.monthInstall),
        quarterlyInstall: num(body.quarterlyInstall),
        halfYearlyInstall: num(body.halfYearlyInstall),
        yearlyInstall: num(body.yearlyInstall),
        possession: num(body.possession),
        slabCasting: num(body.slabCasting),
        plinth: num(body.plinth),
        colour: num(body.colour),
        createdAt: now,
        updatedAt: now,
      },
    });
    return { success: true as const, data: row };
  }

  const row = await prisma.userSearchHistory.create({
    data: {
      userId,
      hash: body.hash != null ? str(body.hash) : null,
      searchType: "filter",
      json: JSON.stringify({
        area: body.area,
        progress: body.progress,
        type: body.type,
        admin: body.builder ?? body.admin,
        minDP: body.minDP,
        maxDP: body.maxDP,
        minMI: body.minMI,
        maxMI: body.maxMI,
        minPrice: body.minPrice,
        maxPrice: body.maxPrice,
      }),
      minDP: num(body.minDP),
      maxDP: num(body.maxDP),
      minMI: num(body.minMI),
      maxMI: num(body.maxMI),
      minPrice: num(body.minPrice),
      maxPrice: num(body.maxPrice),
      createdAt: now,
      updatedAt: now,
    },
  });

  return { success: true as const, data: row };
}

export async function createInterestGoal(
  goal: string,
  session: SessionUser | null
) {
  if (!["rental", "capital", "vacation"].includes(goal)) {
    return { success: false as const, message: "Invalid goal" };
  }
  if (!isDatabaseEnabled()) {
    return { success: false as const, message: "Database not configured" };
  }
  if (!(await tableExists("interests"))) {
    return { success: true as const };
  }

  await executeRaw(
    `INSERT INTO interests (goal, user_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`,
    goal,
    session?.id ?? null
  );

  return { success: true as const };
}
