import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { ensureBrokerAgentCode } from "@/server/services/broker-agent-ops.service";

export type BrokerShortLinkTarget = {
  path: string;
  agentCode: string | null;
};

export async function resolveBrokerShortLink(
  slug: string,
  shortCode: string
): Promise<BrokerShortLinkTarget> {
  const params = new URLSearchParams({
    utm_source: "broker",
    utm_medium: "short_link",
    utm_content: shortCode,
  });
  const path = `/project/${encodeURIComponent(slug)}?${params.toString()}`;
  let agentCode: string | null = null;

  if (!isDatabaseEnabled()) return { path, agentCode };

  try {
    const project = await prisma.project.findFirst({
      where: { slug },
      select: { id: true },
    });
    const link = project
      ? await prisma.brokerShortLink.findFirst({
          where: { shortCode, projectId: project.id },
          select: { id: true, brokerId: true },
        })
      : null;

    if (link) {
      await prisma.brokerShortLink.update({
        where: { id: link.id },
        data: { clicks: { increment: 1 } },
      });
      agentCode = await ensureBrokerAgentCode(link.brokerId);
    }
  } catch {
    /* still redirect to project */
  }

  return { path, agentCode };
}
