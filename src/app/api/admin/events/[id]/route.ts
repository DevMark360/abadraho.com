import { NextRequest, NextResponse } from "next/server";
import { requireAdminEventAccess } from "@/lib/admin-api-guard";
import { isFullStaff } from "@/lib/admin-rbac";
import { toJsonSafe } from "@/lib/prisma-json";
import {
  archiveAdminEvent,
  getAdminEventDetail,
  saveAdminEvent,
  type AdminEventInput,
} from "@/server/services/admin-event.service";
import { saveEventCoverImage } from "@/server/services/admin-event-upload.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);
  const auth = await requireAdminEventAccess(eventId);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await getAdminEventDetail(eventId, auth.session);
    if (!result.event) {
      return NextResponse.json(
        { success: false, message: result.error ?? "Not found" },
        { status: result.error === "Forbidden" ? 403 : 404 }
      );
    }
    return NextResponse.json(
      toJsonSafe({ success: true, event: result.event, isFullStaff: isFullStaff(auth.session) })
    );
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);
  const auth = await requireAdminEventAccess(eventId, "edit");
  if (auth instanceof NextResponse) return auth;

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

  let coverImage: string | null | undefined;
  if (coverFile) {
    const cover = await saveEventCoverImage(coverFile);
    if (cover.error) {
      return NextResponse.json({ success: false, message: cover.error }, { status: 400 });
    }
    coverImage = cover.filename;
  } else if (body.removeCoverImage === "true") {
    coverImage = null;
  }

  // A key genuinely absent from the request body (JSON status-only PATCH,
  // e.g. moderation) must stay `undefined` here so the service falls back
  // to the event's existing stored value instead of wiping it.
  const input: AdminEventInput = {
    ...(body.title !== undefined ? { title: String(body.title) } : {}),
    ...(body.eventType !== undefined ? { eventType: String(body.eventType) } : {}),
    ...(body.description !== undefined ? { description: String(body.description) } : {}),
    ...(body.venue !== undefined ? { venue: String(body.venue) } : {}),
    ...(body.startDate !== undefined ? { startDate: String(body.startDate) } : {}),
    ...(body.endDate !== undefined
      ? { endDate: body.endDate ? String(body.endDate) : null }
      : {}),
    ...(body.projectId !== undefined
      ? { projectId: body.projectId ? Number(body.projectId) : null }
      : {}),
    ...(body.builderId !== undefined
      ? { builderId: body.builderId ? Number(body.builderId) : null }
      : {}),
    ...(body.status != null ? { status: String(body.status) } : {}),
  };
  if (coverImage !== undefined) input.coverImage = coverImage;

  try {
    const result = await saveAdminEvent(eventId, input, auth.session);
    if (result.error) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }
    return NextResponse.json(toJsonSafe({ success: true, id: result.event?.id }));
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);
  const auth = await requireAdminEventAccess(eventId, "delete");
  if (auth instanceof NextResponse) return auth;

  try {
    await archiveAdminEvent(eventId, auth.session);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 400 });
  }
}
