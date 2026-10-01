import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createInterestGoal } from "@/server/services/public-forms.service";

export async function POST(request: NextRequest) {
  let goal = "";
  try {
    const body = (await request.json()) as { goal?: string };
    goal = String(body.goal ?? "");
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  const session = await getSession();
  const result = await createInterestGoal(goal, session);

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
