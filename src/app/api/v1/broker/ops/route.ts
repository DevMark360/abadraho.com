import { NextRequest, NextResponse } from "next/server";
import { requireBrokerApi } from "@/lib/broker-api-guard";
import {
  listBrokerAssignments,
  listBrokerLeads,
  listCommissions,
  loadBrokerOpsStats,
  loadBrowseGroups,
  loadMonthlyCommissionChart,
  saveBrokerLead,
  createAssignmentRequest,
  countReferralClicks,
  ensureBrokerAgentCode,
} from "@/server/services/broker-agent-ops.service";
import { enrichWithBrokerMarketing } from "@/server/services/broker-portal.service";
import { getSiteUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireBrokerApi();
  if (auth instanceof NextResponse) return auth;

  const resource = req.nextUrl.searchParams.get("resource");
  const brokerId = auth.broker.id;

  if (resource === "assigned-projects") {
    const q = req.nextUrl.searchParams.get("q") ?? undefined;
    const areaId = req.nextUrl.searchParams.get("areaId");
    const builderId = req.nextUrl.searchParams.get("builderId");
    const commissionType = req.nextUrl.searchParams.get("commissionType") as
      | "percentage"
      | "fixed"
      | undefined;
    const assignments = await listBrokerAssignments(brokerId, {
      activeOnly: true,
      q,
      areaId: areaId ? Number(areaId) : undefined,
      builderId: builderId ? Number(builderId) : undefined,
      commissionType:
        commissionType === "fixed" || commissionType === "percentage"
          ? commissionType
          : undefined,
    });
    const enriched = await enrichWithBrokerMarketing(brokerId, assignments);
    return NextResponse.json({
      success: true,
      items: enriched.items,
      brokerToolsReady: enriched.brokerToolsReady,
    });
  }

  if (resource === "commissions") {
    const items = await listCommissions({
      brokerId,
      status: req.nextUrl.searchParams.get("status") ?? undefined,
      projectId: req.nextUrl.searchParams.get("projectId")
        ? Number(req.nextUrl.searchParams.get("projectId"))
        : undefined,
      month: req.nextUrl.searchParams.get("month") ?? undefined,
    });
    const chart = await loadMonthlyCommissionChart(brokerId);
    return NextResponse.json({ success: true, items, chart });
  }

  if (resource === "leads") {
    const items = await listBrokerLeads(brokerId, {
      status: req.nextUrl.searchParams.get("status") ?? undefined,
      q: req.nextUrl.searchParams.get("q") ?? undefined,
    });
    return NextResponse.json({ success: true, items });
  }

  if (resource === "browse") {
    const data = await loadBrowseGroups(brokerId);
    return NextResponse.json({ success: true, ...data });
  }

  if (resource === "profile") {
    const broker = await prisma.broker.findUnique({ where: { id: brokerId } });
    const agentCode = await ensureBrokerAgentCode(brokerId);
    const clicks = await countReferralClicks(brokerId);
    const stats = await loadBrokerOpsStats(brokerId);
    const base = getSiteUrl();
    return NextResponse.json({
      success: true,
      profile: {
        bankName: (broker as { bankName?: string | null })?.bankName ?? "",
        accountTitle: (broker as { accountTitle?: string | null })?.accountTitle ?? "",
        accountNumber: (broker as { accountNumber?: string | null })?.accountNumber ?? "",
        iban: (broker as { iban?: string | null })?.iban ?? "",
        agentTier: (broker as { agentTier?: string })?.agentTier ?? "bronze",
        agentCode,
        referralUrl: `${base}/ref/${agentCode}`,
        referralClicks: clicks,
        dealsClosedAllTime: stats.dealsClosedAllTime,
        totalEarned: stats.totalEarned,
        memberSince: broker?.createdAt?.getFullYear() ?? null,
      },
    });
  }

  const opsStats = await loadBrokerOpsStats(brokerId);
  return NextResponse.json({ success: true, opsStats });
}

export async function POST(req: NextRequest) {
  const auth = await requireBrokerApi();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const action = String(body.action ?? "");

  if (action === "lead") {
    const id = await saveBrokerLead(auth.broker.id, {
      id: body.id ? Number(body.id) : undefined,
      clientName: String(body.clientName ?? ""),
      phone: String(body.phone ?? ""),
      email: body.email ? String(body.email) : null,
      projectId: body.projectId ? Number(body.projectId) : null,
      unitId: body.unitId ? Number(body.unitId) : null,
      source: body.source ? String(body.source) : null,
      status: body.status ? String(body.status) : undefined,
      notes: body.notes ? String(body.notes) : null,
      logContact: Boolean(body.logContact),
    });
    return NextResponse.json({ success: true, id });
  }

  if (action === "request-assignment") {
    await createAssignmentRequest(
      auth.broker.id,
      Number(body.projectId),
      body.message ? String(body.message) : null
    );
    return NextResponse.json({ success: true });
  }

  if (action === "profile") {
    await prisma.broker.update({
      where: { id: auth.broker.id },
      data: {
        bankName: body.bankName ? String(body.bankName) : null,
        accountTitle: body.accountTitle ? String(body.accountTitle) : null,
        accountNumber: body.accountNumber ? String(body.accountNumber) : null,
        iban: body.iban ? String(body.iban) : null,
      } as never,
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
}
