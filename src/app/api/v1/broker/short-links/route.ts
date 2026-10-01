import { NextRequest, NextResponse } from "next/server";
import { requireBrokerApi } from "@/lib/broker-api-guard";
import { resolveRequestSiteUrl } from "@/lib/app-url";
import { createBrokerShortLink } from "@/server/services/broker-marketing.service";

export async function POST(request: NextRequest) {
  const auth = await requireBrokerApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as { projectId?: number };
    const projectId = Number(body.projectId);

    if (!projectId || Number.isNaN(projectId)) {
      return NextResponse.json(
        { success: false, message: "projectId is required", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    const result = await createBrokerShortLink(
      auth.broker.id,
      projectId,
      resolveRequestSiteUrl(request)
    );
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
    console.error("[broker/short-links POST]", e);
    return NextResponse.json(
      { success: false, message: "Could not create short link", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
