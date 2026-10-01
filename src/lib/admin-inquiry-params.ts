import type { PropertyInquiryFilters } from "@/server/services/admin-inquiry.service";
import type { PaymentScheduleFilters } from "@/server/services/admin-payment-schedule.service";
import type { ContactInquiryFilters } from "@/server/services/admin-contact-inquiry.service";

function num(v: string | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function intList(v: string | null): number[] | undefined {
  if (!v) return undefined;
  const arr = v.split(",").map(Number).filter((n) => Number.isFinite(n) && n > 0);
  return arr.length ? arr : undefined;
}

function strList(v: string | null): string[] | undefined {
  if (!v) return undefined;
  const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

export function parsePropertyInquiryParams(sp: URLSearchParams): PropertyInquiryFilters {
  return {
    page: Number(sp.get("page") ?? 1) || 1,
    perPage: Number(sp.get("perPage") ?? 25) || 25,
    name: sp.get("name") ?? undefined,
    email: sp.get("email") ?? undefined,
    phoneNumber: sp.get("phoneNumber") ?? undefined,
    address: sp.get("address") ?? undefined,
    projectIds: intList(sp.get("projectIds")),
    unitIds: intList(sp.get("unitIds")),
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  };
}

export function parsePaymentScheduleParams(sp: URLSearchParams): PaymentScheduleFilters {
  return {
    projectIds: intList(sp.get("projectIds")),
    unitIds: intList(sp.get("unitIds")),
    duration: strList(sp.get("duration")),
    downPayment: num(sp.get("downPayment")),
    monthlyInstallment: num(sp.get("monthlyInstallment")),
    quarterlyInstallment: num(sp.get("quarterlyInstallment")),
    halfYearlyInstallment: num(sp.get("halfYearlyInstallment")),
    yearlyInstallment: num(sp.get("yearlyInstallment")),
    possession: num(sp.get("possession")),
    loanAmount: num(sp.get("loanAmount")),
    slabCasting: num(sp.get("slabCasting")),
    plinth: num(sp.get("plinth")),
    colour: num(sp.get("colour")),
    startOfWork: num(sp.get("startOfWork")),
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  };
}

export function parseContactInquiryParams(sp: URLSearchParams): ContactInquiryFilters {
  return {
    name: sp.get("name") ?? undefined,
    email: sp.get("email") ?? undefined,
    phone: sp.get("phone") ?? undefined,
    subject: sp.get("subject") ?? undefined,
    message: sp.get("message") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  };
}
