import { NextRequest, NextResponse } from "next/server";
import { requireStaffAdminModule } from "@/lib/admin-api-guard";
import { prisma } from "@/lib/prisma";
import { builderLogoInfo, removeBuilderLogo, saveBuilderLogo } from "@/server/builder-logos";

export const runtime = "nodejs";

async function loadBuilder(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return null;
  return prisma.builder.findFirst({
    where: { id, isArchive: false },
    select: { id: true, fullName: true },
  });
}

function notFound() {
  return NextResponse.json({ success: false, message: "Builder not found" }, { status: 404 });
}

/** Logo in use: `source` is "upload" (removable here), "file" (public/builders-logos) or null. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("builders", "view");
  if (auth instanceof NextResponse) return auth;

  const builder = await loadBuilder((await params).id);
  if (!builder) return notFound();
  return NextResponse.json({ success: true, ...builderLogoInfo(builder.id, builder.fullName) });
}

/** Upload or replace the logo. Multipart field: `logo`. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("builders", "edit");
  if (auth instanceof NextResponse) return auth;

  const builder = await loadBuilder((await params).id);
  if (!builder) return notFound();

  let file: FormDataEntryValue | null = null;
  try {
    file = (await request.formData()).get("logo");
  } catch {
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 400 });
  }
  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ success: false, message: "Choose an image" }, { status: 400 });
  }

  try {
    const result = await saveBuilderLogo(builder.id, file);
    if (result.error) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }
  } catch (e) {
    console.error("[admin/builders/logo]", e);
    return NextResponse.json({ success: false, message: "Could not save the logo" }, { status: 500 });
  }
  return NextResponse.json({ success: true, ...builderLogoInfo(builder.id, builder.fullName) });
}

/** Remove the uploaded logo (falls back to a public/builders-logos file, if any). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("builders", "edit");
  if (auth instanceof NextResponse) return auth;

  const builder = await loadBuilder((await params).id);
  if (!builder) return notFound();
  await removeBuilderLogo(builder.id);
  return NextResponse.json({ success: true, ...builderLogoInfo(builder.id, builder.fullName) });
}
