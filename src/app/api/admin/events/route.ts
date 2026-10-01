import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-guard";
import { requireModulePermission } from "@/lib/admin-api-permissions";
import { builderProjectIdsForSession, scopedProjectsWhere } from "@/lib/admin-builder-ownership";
import { isFullStaff } from "@/lib/admin-rbac";
import { prisma } from "@/lib/prisma";
import { toJsonSafe } from "@/lib/prisma-json";
import {
  listAdminEvents,
  parseEventListQuery,
  saveAdminEvent,
} from "@/server/services/admin-event.service";
import { saveEventCoverImage } from "@/server/services/admin-event-upload.service";

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;
  const denied = await requireModulePermission(auth.session, "events", "view");
  if (denied) return denied;

  try {
    const filters = parseEventListQuery(request.nextUrl.searchParams);
    const result = await listAdminEvents(filters, auth.session);

    const builderScope = await builderProjectIdsForSession(auth.session);
    let projectOptions: { value: string; label: string }[] = [];
    try {
      const rows = await prisma.project.findMany({
        where: scopedProjectsWhere(builderScope ?? null),
        orderBy: { name: "asc" },
        select: { id: true, name: true },
        take: builderScope === undefined ? 5000 : undefined,
      });
      projectOptions = rows.map((p) => ({ value: String(p.id), label: p.name }));
    } catch {
      /* optional */
    }

    return NextResponse.json(
      toJsonSafe({
        success: !result.error,
        items: result.items,
        total: result.total,
        error: result.error,
        projectOptions,
        isFullStaff: isFullStaff(auth.session),
      })
    );
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;
  const denied = await requireModulePermission(auth.session, "events", "add");
  if (denied) return denied;

  const ct = request.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};
  let coverFile: File | null = null;

  if (ct.includes("multipart/form-data")) {
    const fd = await request.formData();
    body = Object.fromEntries(
      [...fd.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, v])
    );
    const f = fd.get("coverImage");
    if (f instanceof File && f.size > 0) coverFile = f;
  } else {
    body = await request.json();
  }

  let coverImage: string | null = null;
  if (coverFile) {
    const cover = await saveEventCoverImage(coverFile);
    if (cover.error) {
      return NextResponse.json({ success: false, message: cover.error }, { status: 400 });
    }
    coverImage = cover.filename;
  }

  try {
    const result = await saveAdminEvent(
      null,
      {
        title: String(body.title ?? ""),
        eventType: String(body.eventType ?? ""),
        description: body.description != null ? String(body.description) : null,
        venue: body.venue != null ? String(body.venue) : null,
        startDate: String(body.startDate ?? ""),
        endDate: body.endDate ? String(body.endDate) : null,
        coverImage,
        projectId: body.projectId ? Number(body.projectId) : null,
        builderId: body.builderId ? Number(body.builderId) : null,
        status: body.status != null ? String(body.status) : undefined,
      },
      auth.session
    );

    if (result.error || !result.event) {
      return NextResponse.json(
        { success: false, message: result.error ?? "Create failed" },
        { status: 400 }
      );
    }
    return NextResponse.json(toJsonSafe({ success: true, id: result.event.id }));
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}
