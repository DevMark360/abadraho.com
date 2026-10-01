import { NextRequest, NextResponse } from "next/server";
import { requireBrokerApi } from "@/lib/broker-api-guard";
import { listBrokerPitchDecks } from "@/server/services/broker-portal.service";
import {
  generateBrokerPitchDeck,
  uploadBrokerPitchDeck,
} from "@/server/services/broker-marketing.service";

export async function GET() {
  const auth = await requireBrokerApi();
  if (auth instanceof NextResponse) return auth;

  const items = await listBrokerPitchDecks(auth.broker.id);
  return NextResponse.json({ success: true, items, broker: auth.broker });
}

export async function POST(request: NextRequest) {
  const auth = await requireBrokerApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let projectId = 0;
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      projectId = Number(form.get("projectId"));
      const uploaded = form.get("file");
      file = uploaded instanceof File && uploaded.size > 0 ? uploaded : null;
    } else {
      const body = (await request.json()) as { projectId?: number };
      projectId = Number(body.projectId);
    }

    if (!projectId || Number.isNaN(projectId)) {
      return NextResponse.json(
        { success: false, message: "projectId is required", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    const result = file
      ? await uploadBrokerPitchDeck(auth.broker.id, projectId, file)
      : await generateBrokerPitchDeck(auth.broker.id, projectId);

    if (!result.success) {
      const status =
        result.code === "PROJECT_NOT_FOUND"
          ? 404
          : result.code === "TOOLS_UNAVAILABLE"
            ? 503
            : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("[broker/pitch-decks POST]", e);
    return NextResponse.json(
      { success: false, message: "Could not create pitch deck", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
