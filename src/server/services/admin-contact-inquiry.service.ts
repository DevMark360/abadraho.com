import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { jsonNum } from "@/lib/prisma-json";

export type ContactInquiryFilters = {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  from?: string;
  to?: string;
};

export async function listContactInquiries(filters: ContactInquiryFilters = {}) {
  if (!isDatabaseEnabled()) return { items: [], error: "Database disabled" };

  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];

  if (filters.name?.trim()) {
    conditions.push("name LIKE ?");
    params.push(`%${filters.name.trim()}%`);
  }
  if (filters.email?.trim()) {
    conditions.push("email = ?");
    params.push(filters.email.trim());
  }
  if (filters.phone?.trim()) {
    conditions.push("phone = ?");
    params.push(filters.phone.trim());
  }
  if (filters.subject?.trim()) {
    conditions.push("subject LIKE ?");
    params.push(`%${filters.subject.trim()}%`);
  }
  if (filters.message?.trim()) {
    conditions.push("message LIKE ?");
    params.push(`%${filters.message.trim()}%`);
  }
  if (filters.from && filters.to) {
    conditions.push("created_at BETWEEN ? AND ?");
    params.push(`${filters.from} 00:00:00`, `${filters.to} 23:59:59`);
  }

  const where = conditions.join(" AND ");

  try {
    const rows = await queryRaw<
      {
        id: number;
        name: string | null;
        email: string | null;
        phone: string | null;
        subject: string | null;
        message: string | null;
        created_at: Date | null;
      }[]
    >(
      `SELECT id, name, email, phone, subject, message, created_at
       FROM contactus
       WHERE ${where}
       ORDER BY id DESC`,
      ...params
    );

    const items = rows.map((r, i) => ({
      rowNum: i + 1,
      id: jsonNum(r.id),
      name: r.name,
      email: r.email,
      phone: r.phone,
      subject: r.subject,
      message: r.message,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    }));

    return { items };
  } catch (e) {
    return { items: [], error: String(e) };
  }
}

export async function getContactInquiry(id: number) {
  if (!isDatabaseEnabled()) return { contact: null, error: "Database disabled" };

  const row = await prisma.contactUs.findUnique({ where: { id } });
  if (!row) return { contact: null, error: "Not found" };

  return {
    contact: {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      subject: row.subject,
      message: row.message,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    },
  };
}
