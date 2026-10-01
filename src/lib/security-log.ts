import { clientIp } from "@/lib/rate-limit";
import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export type SecurityEventType =
  | "auth.login.failed"
  | "auth.login.success"
  | "auth.login.rate_limited"
  | "admin.action";

export type SecurityActor = {
  id?: number;
  email?: string;
  source?: string;
  role?: string;
};

export type SecurityEvent = {
  type: SecurityEventType;
  ts: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  channel?: "public" | "admin";
  actor?: SecurityActor;
  target?: { email?: string };
  meta?: Record<string, unknown>;
};

function persistEnabled(): boolean {
  return process.env.SECURITY_LOG_PERSIST !== "false";
}

function eventSummary(event: SecurityEvent): string {
  switch (event.type) {
    case "auth.login.failed":
      return `Login failed (${event.channel ?? "unknown"})${event.target?.email ? `: ${event.target.email}` : ""}`;
    case "auth.login.success":
      return `Login success (${event.channel ?? "unknown"})${event.actor?.email ? `: ${event.actor.email}` : ""}`;
    case "auth.login.rate_limited":
      return `Login rate limited (${event.channel ?? "unknown"})${event.target?.email ? `: ${event.target.email}` : ""}`;
    case "admin.action":
      return `${event.method ?? "MUTATE"} ${event.path ?? ""}`.trim();
    default:
      return event.type;
  }
}

/** Structured JSON line for log shipping (Node runtime). */
export function emitSecurityEvent(event: SecurityEvent): void {
  const line = JSON.stringify({ level: "security", ...event });
  if (event.type === "auth.login.failed" || event.type === "auth.login.rate_limited") {
    console.warn(line);
  } else {
    console.info(line);
  }

  if (isDatabaseEnabled() && persistEnabled()) {
    void persistSecurityEvent(event).catch((err) => {
      console.error("[security-log] persist failed:", err);
    });
  }
}

async function persistSecurityEvent(event: SecurityEvent): Promise<void> {
  const causerId =
    event.actor?.source === "user" && event.actor.id != null ? event.actor.id : null;

  await prisma.activityLog.create({
    data: {
      logName: "security",
      logTable: "security_events",
      description: eventSummary(event),
      causerType: causerId ? "App\\Models\\User" : null,
      causerId,
      ip: event.ip ?? null,
      pageUrl: event.path ?? null,
      properties: JSON.stringify(event),
      createdDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export function securityRequestContext(request: Request): Pick<
  SecurityEvent,
  "ip" | "userAgent" | "path"
> {
  let path: string | undefined;
  try {
    path = new URL(request.url).pathname;
  } catch {
    path = undefined;
  }
  return {
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
    path,
  };
}

export function logLoginFailed(
  request: Request,
  input: { channel: "public" | "admin"; email: string; reason?: string }
): void {
  const ctx = securityRequestContext(request);
  emitSecurityEvent({
    type: "auth.login.failed",
    ts: new Date().toISOString(),
    channel: input.channel,
    target: { email: input.email },
    meta: input.reason ? { reason: input.reason } : undefined,
    ...ctx,
  });
}

export function logLoginSuccess(
  request: Request,
  input: {
    channel: "public" | "admin";
    actor: SecurityActor;
  }
): void {
  const ctx = securityRequestContext(request);
  emitSecurityEvent({
    type: "auth.login.success",
    ts: new Date().toISOString(),
    channel: input.channel,
    actor: input.actor,
    ...ctx,
  });
}

export function logLoginRateLimited(
  request: Request,
  input: { channel: "public" | "admin"; email?: string }
): void {
  const ctx = securityRequestContext(request);
  emitSecurityEvent({
    type: "auth.login.rate_limited",
    ts: new Date().toISOString(),
    channel: input.channel,
    target: input.email ? { email: input.email } : undefined,
    ...ctx,
  });
}
