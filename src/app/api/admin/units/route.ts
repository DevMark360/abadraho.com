import { NextRequest, NextResponse } from "next/server";
import { requireAdminProjectAccess, requireAdminSession } from "@/lib/admin-api-guard";
import { builderProjectIdsForSession } from "@/lib/admin-builder-ownership";
import { isDatabaseEnabled } from "@/lib/db";
import {
  createAdminUnit,
  listAdminUnits,
  loadUnitFormMeta,
  type UnitFormPayload,
} from "@/server/services/admin-unit.service";

function num(value: unknown, fallback?: number): number | null {
  if (value == null || value === "") return fallback ?? null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parsePayload(
  body: Record<string, unknown>
): { payload?: UnitFormPayload; error?: string } {
  const projectId = num(body.projectId);
  const unitTypeId = num(body.unitTypeId);
  const price = num(body.price, 0);
  const downPayment = num(body.downPayment, 0);
  const monthlyInstallment = num(body.monthlyInstallment, 0);

  if (!projectId || !unitTypeId) {
    return { error: "Project, title, and unit type are required" };
  }
  if (price == null || downPayment == null || monthlyInstallment == null) {
    return { error: "Price, down payment, and monthly installment must be valid numbers" };
  }

  return {
    payload: {
      projectId,
      title: String(body.title ?? "").trim(),
      rooms: body.rooms != null ? String(body.rooms) : undefined,
      grossArea: num(body.grossArea),
      netArea: num(body.netArea),
      measurementTypeId: num(body.measurementTypeId, 1),
      unitTypeId,
      price,
      loanAmount: num(body.loanAmount, 0) ?? 0,
      downPayment,
      monthlyInstallment,
      installmentTypeId: num(body.installmentTypeId, 1),
      installmentLength: num(body.installmentLength),
      description: body.description != null ? String(body.description) : undefined,
    },
  };
}

function formatCreateError(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    if (code === "P2003") {
      return "Invalid project, unit type, or installment settings. Refresh the form and try again.";
    }
    if (code === "P2002") {
      return "A unit with these details already exists.";
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return "Could not create unit";
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;

  const sp = request.nextUrl.searchParams;
  const builderScoped = await builderProjectIdsForSession(auth.session);

  const projectId = Number(sp.get("projectId") ?? 0) || undefined;
  if (builderScoped !== undefined && projectId && !builderScoped.includes(projectId)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const [result, meta] = await Promise.all([
    listAdminUnits({
      page: Number(sp.get("page") ?? 1),
      perPage: Number(sp.get("perPage") ?? 25),
      projectId,
      q: sp.get("q") ?? undefined,
      projectIds: builderScoped,
    }),
    loadUnitFormMeta({ projectIds: builderScoped }),
  ]);

  return NextResponse.json({
    success: !result.error,
    items: result.items,
    total: result.total,
    projects: meta.projects,
    error: result.error,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;
  if (!isDatabaseEnabled()) {
    return NextResponse.json(
      { success: false, message: "Database is not enabled" },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parsePayload(body);
  if (parsed.error || !parsed.payload) {
    return NextResponse.json(
      { success: false, message: parsed.error ?? "Invalid unit data" },
      { status: 400 }
    );
  }
  if (!parsed.payload.title) {
    return NextResponse.json(
      { success: false, message: "Project, title, and unit type are required" },
      { status: 400 }
    );
  }

  const projectAuth = await requireAdminProjectAccess(parsed.payload.projectId);
  if (projectAuth instanceof NextResponse) return projectAuth;

  try {
    const { id } = await createAdminUnit(parsed.payload);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: formatCreateError(err) },
      { status: 500 }
    );
  }
}
