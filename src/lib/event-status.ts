export const EVENT_STATUSES = ["pending", "approved", "rejected"] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_STATUS_PENDING = "pending" satisfies EventStatus;
export const EVENT_STATUS_APPROVED = "approved" satisfies EventStatus;
export const EVENT_STATUS_REJECTED = "rejected" satisfies EventStatus;

export const approvedEventWhere = { status: EVENT_STATUS_APPROVED, isArchive: false } as const;

export function isEventStatus(value: string): value is EventStatus {
  return (EVENT_STATUSES as readonly string[]).includes(value);
}

export function eventStatusLabel(status: EventStatus): string {
  switch (status) {
    case EVENT_STATUS_PENDING:
      return "Pending";
    case EVENT_STATUS_APPROVED:
      return "Approved";
    case EVENT_STATUS_REJECTED:
      return "Rejected";
  }
}

export const EVENT_TYPES = ["launch", "open_house", "webinar", "expo", "other"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export function isEventType(value: string): value is EventType {
  return (EVENT_TYPES as readonly string[]).includes(value);
}

export function eventTypeLabel(type: EventType): string {
  switch (type) {
    case "launch":
      return "Project Launch";
    case "open_house":
      return "Open House";
    case "webinar":
      return "Webinar";
    case "expo":
      return "Expo";
    case "other":
      return "Other";
  }
}
