import { NextRequest, NextResponse } from "next/server";
import { fetchProjectPdf } from "@/server/services/pdf.service";

/** PDF from v2 public/uploads/project_documents only */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; filename: string }> }
) {
  const { projectId, filename } = await params;
  const id = Number(projectId);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });
  }

  const pdf = await fetchProjectPdf(id, filename);
  if (!pdf) {
    return NextResponse.json({ success: false, message: "PDF not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(pdf.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdf.filename}"`,
      "Content-Length": String(pdf.bytes.length),
    },
  });
}
