import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-guard";
import { builderProjectIdsForSession } from "@/lib/admin-builder-ownership";
import { toJsonSafe } from "@/lib/prisma-json";
import { loadUnitFormMeta } from "@/server/services/admin-unit.service";

export async function GET() {

  const auth = await requireAdminSession();

  if (auth instanceof NextResponse) return auth;

  try {

    const builderScoped = await builderProjectIdsForSession(auth.session);
    const meta = await loadUnitFormMeta({ projectIds: builderScoped });
    return NextResponse.json(toJsonSafe({ success: true, ...meta }));

  } catch (e) {

    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Failed to load form options" },
      { status: 500 }
    );
  }
}