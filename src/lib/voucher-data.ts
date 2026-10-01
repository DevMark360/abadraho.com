export type VoucherMeta = {
  name?: string;
  discount_by?: "amount" | "percentage";
  discount_applied?: "project" | "unit";
  discount_value?: string | number;
  unit_ids?: number[];
  user_full_name?: string;
  user_email?: string;
  user_phone?: string;
  project_name?: string;
  project_cover_img?: string;
  project_discount?: string | number;
};

export function parseVoucherData(raw: string | null | undefined): VoucherMeta {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as VoucherMeta;
  } catch {
    return {};
  }
}

export function voucherDisplayName(meta: VoucherMeta, code: string): string {
  if (meta.name?.trim()) return meta.name.trim();
  if (meta.user_full_name?.trim()) return meta.user_full_name.trim();
  return code;
}

export function formatVoucherDiscount(meta: VoucherMeta): string {
  if (meta.discount_by && meta.discount_value != null && meta.discount_value !== "") {
    const v = String(meta.discount_value);
    if (meta.discount_by === "amount") return `PKR. ${v}`;
    if (meta.discount_by === "percentage") return `${v} %`;
    return v;
  }
  if (meta.project_discount != null && meta.project_discount !== "") {
    const d = String(meta.project_discount);
    return d === "0" || d === "0.00000000" ? "—" : d;
  }
  return "—";
}

export function voucherStatusLabel(status: number): string {
  return status === 1 ? "Active" : "Disable";
}

export function randomVoucherCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part()}-${part()}`;
}

export const VOUCHER_MODEL_TYPE = "App\\Models\\Project";

export function buildAdminVoucherData(payload: {
  name: string;
  discountBy: "amount" | "percentage";
  discountApplied: "project" | "unit";
  discountValue: string;
  unitIds?: number[];
  projectName?: string;
}): string {
  const meta: VoucherMeta = {
    name: payload.name,
    discount_by: payload.discountBy,
    discount_applied: payload.discountApplied,
    discount_value: payload.discountValue,
  };
  if (payload.discountApplied === "unit" && payload.unitIds?.length) {
    meta.unit_ids = payload.unitIds;
  }
  if (payload.projectName) meta.project_name = payload.projectName;
  return JSON.stringify(meta);
}
