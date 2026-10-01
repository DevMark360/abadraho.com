/** Legacy project status values (dev.abadraho.com admin) */
export const PROJECT_STATUS_LABELS: Record<number, string> = {
  1: "Live",
  2: "On hold",
  3: "Rejected",
};

export type ProjectApprovalAction = "approve" | "hold" | "reject";

export const PROJECT_STATUS_BY_APPROVAL: Record<ProjectApprovalAction, number> = {
  approve: 1,
  hold: 2,
  reject: 3,
};
