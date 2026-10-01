import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import {
  jsonContainsFragment,
  joinSqlOr,
  safeFilterStrings,
  safePositiveInts,
} from "@/lib/mysql-json-contains";
import { intersectBuilderProjectIds } from "@/lib/admin-builder-ownership";
import { jsonNum } from "@/lib/prisma-json";
import { formatDuration } from "@/lib/payment-schedule-payload";

function dec(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export type PaymentScheduleFilters = {
  projectIds?: number[];
  unitIds?: number[];
  duration?: string[];
  downPayment?: number;
  monthlyInstallment?: number;
  quarterlyInstallment?: number;
  halfYearlyInstallment?: number;
  yearlyInstallment?: number;
  possession?: number;
  loanAmount?: number;
  slabCasting?: number;
  plinth?: number;
  colour?: number;
  startOfWork?: number;
  from?: string;
  to?: string;
  builderProjectIds?: number[];
};

export async function listPaymentSchedules(filters: PaymentScheduleFilters = {}) {
  if (!isDatabaseEnabled()) return { items: [], error: "Database disabled" };

  const conditions: string[] = ["ps.is_archive = 0"];
  const params: unknown[] = [];

  if (filters.builderProjectIds !== undefined) {
    const scoped = intersectBuilderProjectIds(
      filters.builderProjectIds,
      filters.projectIds
    );
    if (!scoped?.length) {
      conditions.push("1=0");
    } else {
      conditions.push(`ps.project_id IN (${scoped.map(() => "?").join(",")})`);
      params.push(...scoped);
    }
  } else if (filters.projectIds?.length) {
    const projectIds = safePositiveInts(filters.projectIds);
    if (projectIds.length) {
      conditions.push(`ps.project_id IN (${projectIds.map(() => "?").join(",")})`);
      params.push(...projectIds);
    }
  }
  const unitIds = safePositiveInts(filters.unitIds);
  if (unitIds.length) {
    conditions.push(`ps.unit_id IN (${unitIds.map(() => "?").join(",")})`);
    params.push(...unitIds);
  }
  const durationValues = safeFilterStrings(filters.duration);
  if (durationValues.length) {
    const frag = joinSqlOr(
      durationValues.map((d) => jsonContainsFragment("ps.json", "duration", d))
    );
    conditions.push(frag.sql);
    params.push(...frag.params);
  }
  if (filters.downPayment != null) {
    conditions.push("ps.down_payment <= ?");
    params.push(filters.downPayment);
  }
  if (filters.monthlyInstallment != null) {
    conditions.push("ps.monthly_installment <= ?");
    params.push(filters.monthlyInstallment);
  }
  if (filters.quarterlyInstallment != null) {
    conditions.push("ps.quarterly_installment <= ?");
    params.push(filters.quarterlyInstallment);
  }
  if (filters.halfYearlyInstallment != null) {
    conditions.push("ps.half_yearly_installment <= ?");
    params.push(filters.halfYearlyInstallment);
  }
  if (filters.yearlyInstallment != null) {
    conditions.push("ps.yearly_installment <= ?");
    params.push(filters.yearlyInstallment);
  }
  if (filters.possession != null) {
    conditions.push("ps.possession <= ?");
    params.push(filters.possession);
  }
  if (filters.loanAmount != null) {
    conditions.push("ps.loan_amount <= ?");
    params.push(filters.loanAmount);
  }
  if (filters.slabCasting != null) {
    conditions.push("ps.slab_casting <= ?");
    params.push(filters.slabCasting);
  }
  if (filters.plinth != null) {
    conditions.push("ps.plinth <= ?");
    params.push(filters.plinth);
  }
  if (filters.colour != null) {
    conditions.push("ps.colour <= ?");
    params.push(filters.colour);
  }
  if (filters.startOfWork != null) {
    conditions.push("ps.start_of_work <= ?");
    params.push(filters.startOfWork);
  }
  if (filters.from && filters.to) {
    conditions.push("ps.created_at BETWEEN ? AND ?");
    params.push(`${filters.from} 00:00:00`, `${filters.to} 23:59:59`);
  }

  const where = conditions.join(" AND ");

  try {
    const rows = await queryRaw<
      {
        id: number;
        json: string;
        created_at: Date;
        project_id: number | null;
        unit_id: number | null;
        down_payment: unknown;
        monthly_installment: unknown;
        quarterly_installment: unknown;
        half_yearly_installment: unknown;
        yearly_installment: unknown;
        possession: unknown;
        loan_amount: unknown;
        slab_casting: unknown;
        plinth: unknown;
        colour: unknown;
        start_of_work: unknown;
        first_name: string | null;
        last_name: string | null;
        phone_number: string | null;
        email: string | null;
        project_name: string | null;
        unit_title: string | null;
      }[]
    >(
      `SELECT ps.id, ps.json, ps.created_at, ps.project_id, ps.unit_id,
              ps.down_payment, ps.monthly_installment, ps.quarterly_installment,
              ps.half_yearly_installment, ps.yearly_installment, ps.possession,
              ps.loan_amount, ps.slab_casting, ps.plinth, ps.colour, ps.start_of_work,
              u.first_name, u.last_name, u.phone_number, u.email,
              p.name AS project_name, un.title AS unit_title
       FROM payment_schedule ps
       LEFT JOIN users u ON u.id = ps.user_id
       LEFT JOIN projects p ON p.id = ps.project_id
       LEFT JOIN units un ON un.id = ps.unit_id
       WHERE ${where}
       ORDER BY ps.created_at DESC`,
      ...params
    );

    const items = rows.map((r, i) => {
      const userName =
        r.first_name != null
          ? `${r.first_name}${r.last_name ? ` ${r.last_name}` : ""}`.trim()
          : "Visitor";
      return {
        rowNum: i + 1,
        id: jsonNum(r.id),
        createdAt: new Date(r.created_at).toISOString(),
        userName,
        phone: r.phone_number,
        email: r.email,
        projectName: r.project_name,
        unitTitle: r.unit_title,
        duration: formatDuration(r.json),
        downPayment: dec(r.down_payment),
        monthlyInstallment: dec(r.monthly_installment),
        quarterlyInstallment: dec(r.quarterly_installment),
        halfYearlyInstallment: dec(r.half_yearly_installment),
        yearlyInstallment: dec(r.yearly_installment),
        possession: dec(r.possession),
        loanAmount: dec(r.loan_amount),
        slabCasting: dec(r.slab_casting),
        plinth: dec(r.plinth),
        colour: dec(r.colour),
        startOfWork: dec(r.start_of_work),
      };
    });

    return { items };
  } catch (e) {
    return { items: [], error: String(e) };
  }
}

export async function getPaymentSchedule(id: number) {
  if (!isDatabaseEnabled()) return { record: null, error: "Database disabled" };

  const rows = await queryRaw<
    {
      id: number;
      json: string;
      created_at: Date;
      project_id: number | null;
      project_name: string | null;
      unit_title: string | null;
      first_name: string | null;
      last_name: string | null;
      phone_number: string | null;
      email: string | null;
      down_payment: unknown;
      monthly_installment: unknown;
      quarterly_installment: unknown;
      half_yearly_installment: unknown;
      yearly_installment: unknown;
      possession: unknown;
      loan_amount: unknown;
      slab_casting: unknown;
      plinth: unknown;
      colour: unknown;
      start_of_work: unknown;
    }[]
  >(
    `SELECT ps.*, p.name AS project_name, un.title AS unit_title,
            u.first_name, u.last_name, u.phone_number, u.email
     FROM payment_schedule ps
     LEFT JOIN users u ON u.id = ps.user_id
     LEFT JOIN projects p ON p.id = ps.project_id
     LEFT JOIN units un ON un.id = ps.unit_id
     WHERE ps.id = ?`,
    id
  );

  const r = rows[0];
  if (!r) return { record: null, error: "Not found" };

  const userName =
    r.first_name != null
      ? `${r.first_name}${r.last_name ? ` ${r.last_name}` : ""}`.trim()
      : "Visitor";

  return {
    record: {
      id: jsonNum(r.id),
      createdAt: new Date(r.created_at).toISOString(),
      userName,
      phone: r.phone_number,
      email: r.email,
      projectId: r.project_id != null ? jsonNum(r.project_id) : null,
      projectName: r.project_name,
      unitTitle: r.unit_title,
      duration: formatDuration(r.json),
      downPayment: dec(r.down_payment),
      monthlyInstallment: dec(r.monthly_installment),
      quarterlyInstallment: dec(r.quarterly_installment),
      halfYearlyInstallment: dec(r.half_yearly_installment),
      yearlyInstallment: dec(r.yearly_installment),
      possession: dec(r.possession),
      loanAmount: dec(r.loan_amount),
      slabCasting: dec(r.slab_casting),
      plinth: dec(r.plinth),
      colour: dec(r.colour),
      startOfWork: dec(r.start_of_work),
      json: r.json,
    },
  };
}
