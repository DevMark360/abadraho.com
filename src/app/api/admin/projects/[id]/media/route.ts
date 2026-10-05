import { NextRequest, NextResponse } from "next/server";
import { requireAdminProjectAccess } from "@/lib/admin-api-guard";
import { ADMIN_PDF_MAX_LABEL } from "@/lib/admin-upload-limits";
import { uploadProjectMedia } from "@/server/services/admin-project-upload.service";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = Number(id);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return NextResponse.json({ success: false, message: "Invalid project ID" }, { status: 400 });
    }

    const auth = await requireAdminProjectAccess(projectId);
    if (auth instanceof NextResponse) return auth;

    let form: FormData;
    try {
      form = await request.formData();
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Upload too large. Each PDF can be up to ${ADMIN_PDF_MAX_LABEL}. If your file is smaller, rebuild/restart the app after deploy (Next.js middleware body limit) or ask hosting to raise Apache upload limits.`,
          detail: process.env.NODE_ENV === "development" ? String(e) : undefined,
        },
        { status: 413 }
      );
    }

    const cover = form.get("cover");
    const images = form.getAll("images").filter((f): f is File => f instanceof File);
    const docs = form.getAll("docs").filter((f): f is File => f instanceof File);

    const result = await uploadProjectMedia(projectId, {
      cover: cover instanceof File ? cover : null,
      images,
      docs,
    });

    if (result.error) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/projects/media]", e);
    return NextResponse.json(
      {
        success: false,
        message: "Upload failed on the server. Try a smaller file or contact support.",
        detail: process.env.NODE_ENV === "development" ? String(e) : undefined,
      },
      { status: 500 }
    );
  }
}
