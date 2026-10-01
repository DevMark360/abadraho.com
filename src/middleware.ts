import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  parseAdminSessionCookie,
} from "@/lib/admin-session-cookie";
import { canAccessAdminPath } from "@/lib/admin-rbac";
import { parseSessionCookie, USER_COOKIE } from "@/lib/session-cookie";
import { canAccessBrokerPortal } from "@/lib/roles";
import {
  ensureCsrfCookie,
  legacyImportApiPath,
  requiresCsrfValidation,
  validateCsrfRequest,
} from "@/lib/csrf-edge";
import { logAdminActionEdge } from "@/lib/security-log-edge";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/home") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/" && request.nextUrl.searchParams.toString()) {
    const url = request.nextUrl.clone();
    url.pathname = "/projects";
    return NextResponse.redirect(url, 308);
  }

  // Legacy Laravel filter URL → v2 listings (preserve filters for SEO)
  if (pathname === "/projects/getlistings") {
    const url = request.nextUrl.clone();
    url.pathname = "/projects";
    const legacyArea = request.nextUrl.searchParams.getAll("area[]");
    if (legacyArea.length) {
      url.searchParams.delete("area[]");
      url.searchParams.set("area", legacyArea.join(","));
    }
    return NextResponse.redirect(url, 308);
  }

  if (requiresCsrfValidation(request.method, pathname)) {
    if (!(await validateCsrfRequest(request))) {
      return NextResponse.json(
        { success: false, message: "Invalid or missing CSRF token" },
        { status: 403 }
      );
    }
  }

  const adminSession = await parseAdminSessionCookie(
    request.cookies.get(ADMIN_COOKIE)?.value
  );

  const legacyImportPath = legacyImportApiPath(pathname);
  if (legacyImportPath) {
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdminPath(legacyImportPath, adminSession)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    logAdminActionEdge(request, legacyImportPath, adminSession);
  }

  // Cookie signature + path RBAC only (Edge cannot use Prisma). Route handlers call
  // getAdminSession() which revalidates id/email/role against the database (sec-2).
  if (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth/")) {
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdminPath(pathname, adminSession)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    logAdminActionEdge(request, pathname, adminSession);
  } else if (pathname === "/api/admin/auth/logout") {
    logAdminActionEdge(request, pathname, adminSession);
  }

  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/register") &&
    !pathname.startsWith("/admin/forbidden")
  ) {
    if (!adminSession) {
      const login = new URL("/login", request.url);
      login.searchParams.set("ref", pathname);
      return NextResponse.redirect(login);
    }
    if (!canAccessAdminPath(pathname, adminSession)) {
      return NextResponse.redirect(new URL("/admin/forbidden", request.url));
    }
  }

  const userSession = await parseSessionCookie(request.cookies.get(USER_COOKIE)?.value);
  const session = userSession
    ? {
        id: userSession.id,
        userTypeId: userSession.userTypeId ?? null,
        role: userSession.role,
      }
    : null;

  if (pathname.startsWith("/account")) {
    if (!session) {
      const login = new URL("/login", request.url);
      login.searchParams.set("ref", pathname);
      return NextResponse.redirect(login);
    }
  }

  if (pathname.startsWith("/broker") || pathname.startsWith("/agent")) {
    if (!session) {
      const login = new URL("/login", request.url);
      login.searchParams.set("ref", pathname);
      return NextResponse.redirect(login);
    }
    if (!canAccessBrokerPortal(session.userTypeId)) {
      return NextResponse.redirect(new URL("/account", request.url));
    }
  }

  const response = NextResponse.next();
  if (pathname.startsWith("/api/") || !pathname.startsWith("/_next")) {
    await ensureCsrfCookie(request, response);
  }
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/:path*",
    "/account",
    "/account/:path*",
    "/broker/:path*",
    "/agent/:path*",
    "/((?!_next/static|_next/image|favicon.ico|assets/).*)",
  ],
};
