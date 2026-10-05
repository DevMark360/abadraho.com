import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import {
  deleteAdminAgent,
  getAdminAgent,
  saveAdminAgent,
} from "@/server/services/admin-agent.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await getAdminAgent(Number(id));

  if (!result.agent) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }

  let areas: { value: string; label: string }[] = [];
  try {
    const rows = await prisma.area.findMany({ orderBy: { name: "asc" }, take: 500 });
    areas = rows.map((a) => ({ value: String(a.id), label: a.name }));
  } catch {
    /* optional */
  }

  return NextResponse.json({
    success: true,
    agent: result.agent,
    areas,
    storageMode: result.storageMode ?? "brokers",
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = await saveAdminAgent(Number(id), body);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, id: result.agent?.id });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let result;
  try {
    result = await deleteAdminAgent(Number(id));
  } catch (err) {
    // Surface the reason in the admin UI instead of an empty 500.
    console.error("[admin/agents] delete failed", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.message }, { status: result.status });
  }
  return NextResponse.json({ success: true, userKeptArchived: result.userKeptArchived });
}
