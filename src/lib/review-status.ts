export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_STATUS_PENDING = "pending" satisfies ReviewStatus;
export const REVIEW_STATUS_APPROVED = "approved" satisfies ReviewStatus;
export const REVIEW_STATUS_REJECTED = "rejected" satisfies ReviewStatus;

export const approvedReviewWhere = { status: REVIEW_STATUS_APPROVED } as const;

export function isReviewStatus(value: string): value is ReviewStatus {
  return (REVIEW_STATUSES as readonly string[]).includes(value);
}

export function reviewStatusLabel(status: ReviewStatus): string {
  switch (status) {
    case REVIEW_STATUS_PENDING:
      return "Pending";
    case REVIEW_STATUS_APPROVED:
      return "Approved";
    case REVIEW_STATUS_REJECTED:
      return "Rejected";
  }
}
