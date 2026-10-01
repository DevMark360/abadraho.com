import { clientIp } from "@/lib/rate-limit";
import type { AdminSession } from "@/lib/admin-session-cookie";
import type { SecurityEvent } from "@/lib/security-log";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const ADMIN_AUTH_ACTION_EXEMPT = new Set([
  "/api/admin/auth/login",
  "/api/admin/auth/register",
]);

/** Edge-safe structured security log (stdout only — no Prisma). */
export function emitSecurityEventEdge(event: SecurityEvent): void {
  console.info(JSON.stringify({ level: "security", ...event }));
}

function isAdminActionPath(pathname: string): boolean {
  return pathname.startsWith("/api/admin/") || pathname.startsWith("/import-");
}

export function logAdminActionEdge(
  request: Request,
  pathname: string,
  session: AdminSession | null
): void {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return;
  if (!isAdminActionPath(pathname)) return;
  if (ADMIN_AUTH_ACTION_EXEMPT.has(pathname)) return;

  emitSecurityEventEdge({
    type: "admin.action",
    ts: new Date().toISOString(),
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
    path: pathname,
    method: request.method.toUpperCase(),
    actor: session
      ? {
          id: session.id,
          email: session.email,
          source: session.source,
        }
      : undefined,
  });
}
