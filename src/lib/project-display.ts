/** Display helpers for project list cards (legacy-style labels from DB fields). */

export function formatPaymentPlanLabel(installmentMonths: number | null): string | null {
  if (!installmentMonths || installmentMonths <= 0) return null;
  if (installmentMonths >= 36) return "60/40%";
  if (installmentMonths >= 24) return "50/50%";
  return "40/60%";
}

export function formatInstallmentPlanBadge(months: number | null): string | null {
  if (!months || months <= 0) return null;
  const years = Math.ceil(months / 12);
  return `${years}y plan`;
}

export function progressStatusSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
