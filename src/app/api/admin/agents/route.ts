import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import {
  listAdminAgents,
  saveAdminAgent,
} from "@/server/services/admin-agent.service";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const result = await listAdminAgents({
    userName: sp.get("userName") ?? undefined,
    userEmail: sp.get("userEmail") ?? undefined,
  });

  let areas: { value: string; label: string }[] = [];
  try {
    const rows = await prisma.area.findMany({ orderBy: { name: "asc" }, take: 500 });
    areas = rows.map((a) => ({ value: String(a.id), label: a.name }));
  } catch {
    /* optional */
  }

  return NextResponse.json({
    success: !result.error,
    items: result.items,
    areas,
    storageMode: result.storageMode ?? "brokers",
    error: result.error,
  });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = await saveAdminAgent(null, body);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, id: result.agent?.id });
}
