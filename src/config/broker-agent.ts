export const COMMISSION_TYPES = ["percentage", "fixed"] as const;
export type CommissionType = (typeof COMMISSION_TYPES)[number];

export const AGENT_TIERS = ["bronze", "silver", "gold", "platinum"] as const;
export type AgentTier = (typeof AGENT_TIERS)[number];

export const COMMISSION_STATUSES = ["pending", "confirmed", "paid"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const ASSIGNMENT_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type AssignmentRequestStatus = (typeof ASSIGNMENT_REQUEST_STATUSES)[number];

export const ASSIGNMENT_REQUEST_STATUS_LABELS: Record<AssignmentRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const AGENT_TIER_LABELS: Record<AgentTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  negotiation: "Negotiation",
  closed_won: "Closed won",
  closed_lost: "Closed lost",
};

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  paid: "Paid",
};

export function formatAgentCode(brokerId: number): string {
  return `AGT-${String(brokerId).padStart(5, "0")}`;
}

export function calculateCommissionAmount(
  dealValue: number,
  commissionType: CommissionType,
  commissionValue: number
): number {
  if (commissionType === "percentage") {
    return Math.round((dealValue * commissionValue) / 100);
  }
  return Math.round(commissionValue);
}

export function formatCommissionRate(
  commissionType: CommissionType,
  commissionValue: number
): string {
  if (commissionType === "percentage") {
    return `${commissionValue}%`;
  }
  return `Rs ${Math.round(commissionValue).toLocaleString("en-PK")} fixed`;
}

export function tierFromDealCount(dealsClosed: number): AgentTier {
  if (dealsClosed >= 25) return "platinum";
  if (dealsClosed >= 10) return "gold";
  if (dealsClosed >= 3) return "silver";
  return "bronze";
}
