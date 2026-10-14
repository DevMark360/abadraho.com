import { NextRequest, NextResponse } from "next/server";
import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  BUYER_PURPOSES,
  getCompareVerdict,
  type BuyerPurpose,
} from "@/server/services/compare-verdict.service";

function locationLabel(area: { name: string; city: { name: string } | null } | null): string | null {
  const name = area?.name.trim();
  if (!name) return null;
  const city = area?.city?.name.trim();
  return city && !name.toLowerCase().includes(city.toLowerCase()) ? `${name}, ${city}` : name;
}

/**
 * AI verdicts for the "Which unit wins" card: location and developer of two compared projects,
 * judged for the buyer's purpose ("living" or "investment"). Called only when the visitor asks.
 * Only project ids come in; names are read here so the endpoint can't be used as a free Groq proxy.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
  }
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ success: true, location: null, developer: null });
  }

  const body = (await request.json().catch(() => ({}))) as { ids?: unknown; purpose?: unknown };
  const purpose: BuyerPurpose = BUYER_PURPOSES.includes(body.purpose as BuyerPurpose)
    ? (body.purpose as BuyerPurpose)
    : "living";
  const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
  if (ids.length !== 2 || !ids.every((id) => Number.isInteger(id) && id > 0) || ids[0] === ids[1]) {
    return NextResponse.json({ success: false, message: "Two project ids required" }, { status: 400 });
  }

  const rows = await prisma.project.findMany({
    where: { id: { in: ids }, status: 1, isArchive: false },
    select: {
      id: true,
      location: { select: { name: true, city: { select: { name: true } } } },
      owners: { take: 1, select: { builder: { select: { fullName: true } } } },
    },
  });
  const [first, second] = ids.map((id) => rows.find((r) => r.id === id));
  if (!first || !second) {
    return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
  }

  const [location, developer] = await Promise.all([
    getCompareVerdict("location", purpose, locationLabel(first.location), locationLabel(second.location)),
    getCompareVerdict(
      "developer",
      purpose,
      first.owners[0]?.builder.fullName,
      second.owners[0]?.builder.fullName
    ),
  ]);

  return NextResponse.json({ success: true, location, developer });
}
