import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-guard";
import { requireModulePermission } from "@/lib/admin-api-permissions";
import { builderProjectIdsForSession } from "@/lib/admin-builder-ownership";
import { csvAttachmentResponse } from "@/lib/admin-export-route";
import { readValidatedCsvText } from "@/lib/admin-file-upload";
import { isDatabaseEnabled } from "@/lib/db";
import type { PermissionAction } from "@/config/admin-permissions";
import { exportUnitsCsv, importUnitsCsv } from "@/server/services/admin-unit-csv.service";

async function authorize(action: PermissionAction) {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;
  const denied = await requireModulePermission(auth.session, "units", action);
  if (denied) return denied;
  return { session: auth.session, projectIds: await builderProjectIdsForSession(auth.session) };
}

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(request: NextRequest) {
  const auth = await authorize("view");
  if (auth instanceof NextResponse) return auth;
  if (!isDatabaseEnabled()) return fail("Database is not enabled", 503);

  const sp = request.nextUrl.searchParams;
  const projectId = Number(sp.get("projectId") ?? 0) || undefined;
  if (auth.projectIds && projectId && !auth.projectIds.includes(projectId)) {
    return fail("Forbidden", 403);
  }
  const status = sp.get("projectStatus");

  try {
    const csv = await exportUnitsCsv({
      projectId,
      q: sp.get("q") ?? undefined,
      projectIds: auth.projectIds,
      projectStatus: status === "live" || status === "inactive" ? status : undefined,
    });
    const date = new Date().toISOString().slice(0, 10);
    return csvAttachmentResponse(csv, `units-${date}.csv`);
  } catch (e) {
    console.error("[units-csv] export failed", e);
    return fail("Export failed. Check the database connection.", 500);
  }
}

/** multipart: `file` (.csv), `dryRun` ("1" = preview only, nothing is saved). */
export async function POST(request: NextRequest) {
  const auth = await authorize("edit");
  if (auth instanceof NextResponse) return auth;
  if (!isDatabaseEnabled()) return fail("Database is not enabled", 503);
  if (auth.projectIds && !auth.projectIds.length) return fail("You have no projects to import into", 403);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Choose a .csv file", 400);

  const csv = await readValidatedCsvText(file);
  if (!csv.ok) return fail(csv.error, 400);

  try {
    const result = await importUnitsCsv(csv.text, {
      dryRun: form.get("dryRun") === "1",
      projectIds: auth.projectIds,
    });
    if ("error" in result) return fail(result.error, 422);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("[units-csv] import failed", e);
    return fail("Import failed and nothing was saved. Try again or check the server log.", 500);
  }
}
