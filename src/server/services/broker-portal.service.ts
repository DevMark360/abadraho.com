import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { tableExists } from "@/lib/db-table-exists";
import { publicAssetUrl } from "@/lib/media-url";
import { brokerShortLinkPath, brokerShortLinkUrl } from "@/lib/broker-short-link-url";
import { userTypeIds } from "@/config/site";

export type BrokerToolTables = {
  pitchDecks: boolean;
  whatsappCards: boolean;
  shortLinks: boolean;
};

export async function getBrokerToolTables(): Promise<BrokerToolTables> {
  const [pitchDecks, whatsappCards, shortLinks] = await Promise.all([
    tableExists("broker_pitch_decks"),
    tableExists("broker_whatsapp_cards"),
    tableExists("broker_short_links"),
  ]);
  return { pitchDecks, whatsappCards, shortLinks };
}

export type BrokerProfile = {
  id: number;
  contactPersonName: string | null;
  companyName: string | null;
  contactEmail: string | null;
  contactNumber: string | null;
};

export type BrokerDashboardData = {
  broker: BrokerProfile;
  /** False when pitch deck / WhatsApp / short-link tables are not in MySQL yet */
  brokerToolsReady: boolean;
  stats: {
    pitchDecks: number;
    whatsappCards: number;
    shortLinks: number;
    totalClicks: number;
  };
  opsStats?: {
    commissionThisMonth: number;
    commissionMonthChangePct: number;
    assignedProjects: number;
    assignedAreas: number;
    activeLeads: number;
    followUpPending: number;
    dealsClosedThisMonth: number;
    dealsClosedAllTime: number;
    pendingCommission: number;
    pendingDeals: number;
    totalEarned: number;
    topAssignments: Array<{
      projectId: number;
      projectName: string;
      areaName: string | null;
      builderName: string | null;
      commissionType: string;
      commissionValue: number;
    }>;
    recentActivity: Array<{ type: string; text: string; at: string; color: string }>;
  };
  recentPitchDecks: Array<{
    id: number;
    projectName: string;
    projectSlug: string;
    fileUrl: string | null;
    createdAt: string;
  }>;
  recentWhatsappCards: Array<{
    id: number;
    projectName: string;
    projectSlug: string;
    fileUrl: string | null;
    createdAt: string;
  }>;
  topLinks: Array<{
    id: number;
    projectName: string;
    projectSlug: string;
    shortCode: string;
    shortPath: string;
    shortUrl: string;
    clicks: number;
  }>;
};

function filePublicUrl(filePath: string | null | undefined): string | null {
  if (!filePath?.trim()) return null;
  const p = filePath.trim();
  if (p.startsWith("http")) return p;
  if (p.startsWith("/")) return p;
  return publicAssetUrl(p) ?? `/${p.replace(/^\//, "")}`;
}

async function projectMap(ids: number[]) {
  if (!ids.length) return new Map<number, { name: string; slug: string }>();
  const rows = await prisma.project.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, slug: true },
  });
  return new Map(rows.map((p) => [p.id, { name: p.name, slug: p.slug }]));
}

const brokerProfileSelect = {
  id: true,
  contactPersonName: true,
  companyName: true,
  contactEmail: true,
  contactNumber: true,
} as const;

export async function findBrokerByUserId(userId: number): Promise<BrokerProfile | null> {
  if (!isDatabaseEnabled()) return null;
  const broker = await prisma.broker.findFirst({
    where: { userId, isArchive: false },
    select: brokerProfileSelect,
  });
  return broker;
}

/**
 * Agent login uses `users` (type Agent). Portal tools use `brokers` linked by `user_id`.
 * Links by email or creates a broker row when admin only created the user (users-only mode).
 */
export async function resolveBrokerForAgentUser(userId: number): Promise<BrokerProfile | null> {
  if (!isDatabaseEnabled()) return null;

  const linked = await findBrokerByUserId(userId);
  if (linked) return linked;

  const user = await prisma.user.findFirst({
    where: { id: userId, isArchive: false, userTypeId: userTypeIds.agent },
  });
  if (!user) return null;

  const email = user.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await prisma.broker.findFirst({
      where: { isArchive: false, contactEmail: { equals: email } },
      select: brokerProfileSelect,
    });
    if (byEmail) {
      await prisma.broker.update({
        where: { id: byEmail.id },
        data: { userId: user.id },
      });
      return byEmail;
    }
  }

  const contactPersonName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.firstName;

  try {
    const created = await prisma.broker.create({
      data: {
        contactPersonName,
        contactEmail: user.email,
        contactNumber: user.phoneNumber,
        userId: user.id,
        isActive: true,
        isArchive: false,
      },
      select: brokerProfileSelect,
    });
    return created;
  } catch {
    return findBrokerByUserId(userId);
  }
}

export async function loadBrokerDashboard(
  brokerId: number
): Promise<BrokerDashboardData | null> {
  if (!isDatabaseEnabled()) return null;

  const broker = await prisma.broker.findFirst({
    where: { id: brokerId, isArchive: false },
    select: {
      id: true,
      contactPersonName: true,
      companyName: true,
      contactEmail: true,
      contactNumber: true,
    },
  });
  if (!broker) return null;

  const tools = await getBrokerToolTables();
  const brokerToolsReady =
    tools.pitchDecks || tools.whatsappCards || tools.shortLinks;

  const emptyLists = { pitchDecks: [], whatsappCards: [], shortLinks: [] };
  const [pitchDecks, whatsappCards, shortLinks] = brokerToolsReady
    ? await Promise.all([
        tools.pitchDecks
          ? prisma.brokerPitchDeck.findMany({
              where: { brokerId },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          : Promise.resolve([]),
        tools.whatsappCards
          ? prisma.brokerWhatsAppCard.findMany({
              where: { brokerId },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          : Promise.resolve([]),
        tools.shortLinks
          ? prisma.brokerShortLink.findMany({
              where: { brokerId },
              orderBy: { clicks: "desc" },
              take: 5,
            })
          : Promise.resolve([]),
      ])
    : [emptyLists.pitchDecks, emptyLists.whatsappCards, emptyLists.shortLinks];

  const [pitchCount, cardCount, linkCount, clickAgg] = await Promise.all([
    tools.pitchDecks
      ? prisma.brokerPitchDeck.count({ where: { brokerId } })
      : Promise.resolve(0),
    tools.whatsappCards
      ? prisma.brokerWhatsAppCard.count({ where: { brokerId } })
      : Promise.resolve(0),
    tools.shortLinks
      ? prisma.brokerShortLink.count({ where: { brokerId } })
      : Promise.resolve(0),
    tools.shortLinks
      ? prisma.brokerShortLink.aggregate({
          where: { brokerId },
          _sum: { clicks: true },
        })
      : Promise.resolve({ _sum: { clicks: 0 } }),
  ]);

  const projectIds = [
    ...new Set([
      ...pitchDecks.map((d) => d.projectId),
      ...whatsappCards.map((c) => c.projectId),
      ...shortLinks.map((l) => l.projectId),
    ]),
  ];
  const projects = await projectMap(projectIds);

  return {
    broker,
    brokerToolsReady,
    stats: {
      pitchDecks: pitchCount,
      whatsappCards: cardCount,
      shortLinks: linkCount,
      totalClicks: clickAgg._sum.clicks ?? 0,
    },
    recentPitchDecks: pitchDecks.map((d) => {
      const p = projects.get(d.projectId);
      return {
        id: d.id,
        projectName: p?.name ?? `Project #${d.projectId}`,
        projectSlug: p?.slug ?? "",
        fileUrl: filePublicUrl(d.filePath),
        createdAt: d.createdAt.toISOString(),
      };
    }),
    recentWhatsappCards: whatsappCards.map((c) => {
      const p = projects.get(c.projectId);
      return {
        id: c.id,
        projectName: p?.name ?? `Project #${c.projectId}`,
        projectSlug: p?.slug ?? "",
        fileUrl: filePublicUrl(c.filePath),
        createdAt: c.createdAt.toISOString(),
      };
    }),
    topLinks: shortLinks.map((l) => {
      const p = projects.get(l.projectId);
      const slug = p?.slug ?? "";
      const shortPath = slug ? brokerShortLinkPath(slug, l.shortCode) : "";
      return {
        id: l.id,
        projectName: p?.name ?? `Project #${l.projectId}`,
        projectSlug: slug,
        shortCode: l.shortCode,
        shortPath,
        shortUrl: slug ? brokerShortLinkUrl(slug, l.shortCode) : "",
        clicks: l.clicks,
      };
    }),
  };
}

export type BrokerProjectsListResult = {
  items: Awaited<ReturnType<typeof mapBrokerProjectRows>>;
  total: number;
  page: number;
  pageSize: number;
  brokerToolsReady: boolean;
};

type BrokerProjectRowInput = {
  id: number;
  name: string;
  slug: string;
  minPrice: unknown;
  location: { name: string } | null;
};

function mapBrokerProjectRows(
  projects: BrokerProjectRowInput[],
  deckByProject: Map<number, { id: number; filePath: string | null }>,
  cardByProject: Map<number, { id: number; filePath: string | null }>,
  linkByProject: Map<number, { id: number; shortCode: string; clicks: number }>
) {
  return projects.map((p) => {
    const deck = deckByProject.get(p.id);
    const card = cardByProject.get(p.id);
    const link = linkByProject.get(p.id);
    const shortPath = link ? brokerShortLinkPath(p.slug, link.shortCode) : "";
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      areaName: p.location?.name ?? null,
      minPrice: p.minPrice != null ? Number(p.minPrice) : null,
      projectUrl: `/project/${p.slug}`,
      pitchDeck: deck
        ? { id: deck.id, fileUrl: filePublicUrl(deck.filePath) }
        : null,
      whatsappCard: card
        ? { id: card.id, fileUrl: filePublicUrl(card.filePath) }
        : null,
      shortLink: link
        ? {
            id: link.id,
            shortCode: link.shortCode,
            clicks: link.clicks,
            shortPath,
            shortUrl: brokerShortLinkUrl(p.slug, link.shortCode),
          }
        : null,
    };
  });
}

export type BrokerProjectMarketingAssets = {
  pitchDeck: { id: number; fileUrl: string | null } | null;
  whatsappCard: { id: number; fileUrl: string | null } | null;
  shortLink: {
    id: number;
    shortCode: string;
    shortPath: string;
    shortUrl: string;
    clicks: number;
  } | null;
};

function marketingAssetsForProject(
  projectId: number,
  slug: string,
  deckByProject: Map<number, { id: number; filePath: string | null }>,
  cardByProject: Map<number, { id: number; filePath: string | null }>,
  linkByProject: Map<number, { id: number; shortCode: string; clicks: number }>
): BrokerProjectMarketingAssets {
  const deck = deckByProject.get(projectId);
  const card = cardByProject.get(projectId);
  const link = linkByProject.get(projectId);
  const shortPath = link ? brokerShortLinkPath(slug, link.shortCode) : "";
  return {
    pitchDeck: deck ? { id: deck.id, fileUrl: filePublicUrl(deck.filePath) } : null,
    whatsappCard: card ? { id: card.id, fileUrl: filePublicUrl(card.filePath) } : null,
    shortLink: link
      ? {
          id: link.id,
          shortCode: link.shortCode,
          clicks: link.clicks,
          shortPath,
          shortUrl: brokerShortLinkUrl(slug, link.shortCode),
        }
      : null,
  };
}

export async function enrichWithBrokerMarketing<
  T extends { projectId: number; projectSlug: string },
>(brokerId: number, items: T[]) {
  const tools = await getBrokerToolTables();
  const brokerToolsReady =
    tools.pitchDecks || tools.whatsappCards || tools.shortLinks;
  const projectIds = items.map((i) => i.projectId);

  if (!projectIds.length) {
    return { brokerToolsReady, items: items as Array<T & BrokerProjectMarketingAssets> };
  }

  const [decks, cards, links] = await Promise.all([
    tools.pitchDecks
      ? prisma.brokerPitchDeck.findMany({
          where: { brokerId, projectId: { in: projectIds } },
          select: { id: true, projectId: true, filePath: true },
        })
      : Promise.resolve([]),
    tools.whatsappCards
      ? prisma.brokerWhatsAppCard.findMany({
          where: { brokerId, projectId: { in: projectIds } },
          select: { id: true, projectId: true, filePath: true },
        })
      : Promise.resolve([]),
    tools.shortLinks
      ? prisma.brokerShortLink.findMany({
          where: { brokerId, projectId: { in: projectIds } },
          select: { id: true, projectId: true, shortCode: true, clicks: true },
        })
      : Promise.resolve([]),
  ]);

  const deckByProject = new Map(decks.map((d) => [d.projectId, d]));
  const cardByProject = new Map(cards.map((c) => [c.projectId, c]));
  const linkByProject = new Map(links.map((l) => [l.projectId, l]));

  return {
    brokerToolsReady,
    items: items.map((item) => ({
      ...item,
      ...marketingAssetsForProject(
        item.projectId,
        item.projectSlug,
        deckByProject,
        cardByProject,
        linkByProject
      ),
    })),
  };
}

export async function listBrokerProjects(
  brokerId: number,
  options?: { page?: number; pageSize?: number; q?: string }
): Promise<BrokerProjectsListResult> {
  if (!isDatabaseEnabled()) {
    return { items: [], total: 0, page: 1, pageSize: 30, brokerToolsReady: false };
  }

  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 30));
  const skip = (page - 1) * pageSize;
  const q = options?.q?.trim();

  const where = {
    status: 1,
    isArchive: false,
    ...(q ? { name: { contains: q } } : {}),
  };

  const [projects, total, tools] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        minPrice: true,
        location: { select: { name: true } },
      },
      skip,
      take: pageSize,
    }),
    prisma.project.count({ where }),
    getBrokerToolTables(),
  ]);

  const brokerToolsReady =
    tools.pitchDecks || tools.whatsappCards || tools.shortLinks;

  const ids = projects.map((p) => p.id);
  const [decks, cards, links] = await Promise.all([
    tools.pitchDecks
      ? prisma.brokerPitchDeck.findMany({
          where: { brokerId, projectId: { in: ids } },
          select: { id: true, projectId: true, filePath: true },
        })
      : Promise.resolve([]),
    tools.whatsappCards
      ? prisma.brokerWhatsAppCard.findMany({
          where: { brokerId, projectId: { in: ids } },
          select: { id: true, projectId: true, filePath: true },
        })
      : Promise.resolve([]),
    tools.shortLinks
      ? prisma.brokerShortLink.findMany({
          where: { brokerId, projectId: { in: ids } },
          select: { id: true, projectId: true, shortCode: true, clicks: true },
        })
      : Promise.resolve([]),
  ]);

  const deckByProject = new Map(decks.map((d) => [d.projectId, d]));
  const cardByProject = new Map(cards.map((c) => [c.projectId, c]));
  const linkByProject = new Map(links.map((l) => [l.projectId, l]));

  return {
    items: mapBrokerProjectRows(
      projects,
      deckByProject,
      cardByProject,
      linkByProject
    ),
    total,
    page,
    pageSize,
    brokerToolsReady,
  };
}

export async function listBrokerPitchDecks(brokerId: number) {
  if (!isDatabaseEnabled()) return [];
  const tools = await getBrokerToolTables();
  if (!tools.pitchDecks) return [];
  const rows = await prisma.brokerPitchDeck.findMany({
    where: { brokerId },
    orderBy: { createdAt: "desc" },
  });
  const projects = await projectMap(rows.map((r) => r.projectId));
  return rows.map((r) => {
    const p = projects.get(r.projectId);
    return {
      id: r.id,
      projectId: r.projectId,
      projectName: p?.name ?? `Project #${r.projectId}`,
      projectSlug: p?.slug ?? "",
      fileUrl: filePublicUrl(r.filePath),
      createdAt: r.createdAt.toISOString(),
    };
  });
}

export async function listBrokerWhatsappCards(brokerId: number) {
  if (!isDatabaseEnabled()) return [];
  const tools = await getBrokerToolTables();
  if (!tools.whatsappCards) return [];
  const rows = await prisma.brokerWhatsAppCard.findMany({
    where: { brokerId },
    orderBy: { createdAt: "desc" },
  });
  const projects = await projectMap(rows.map((r) => r.projectId));
  return rows.map((r) => {
    const p = projects.get(r.projectId);
    return {
      id: r.id,
      projectId: r.projectId,
      projectName: p?.name ?? `Project #${r.projectId}`,
      projectSlug: p?.slug ?? "",
      fileUrl: filePublicUrl(r.filePath),
      createdAt: r.createdAt.toISOString(),
    };
  });
}

export async function loadBrokerAnalytics(brokerId: number) {
  if (!isDatabaseEnabled()) {
    return { pitchDecks: [], shortLinks: [], whatsappCards: [] };
  }

  const tools = await getBrokerToolTables();
  const [decks, links, cards] = await Promise.all([
    tools.pitchDecks
      ? prisma.brokerPitchDeck.findMany({ where: { brokerId }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
    tools.shortLinks
      ? prisma.brokerShortLink.findMany({ where: { brokerId }, orderBy: { clicks: "desc" } })
      : Promise.resolve([]),
    tools.whatsappCards
      ? prisma.brokerWhatsAppCard.findMany({ where: { brokerId }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
  ]);

  const projectIds = [
    ...new Set([
      ...decks.map((d) => d.projectId),
      ...links.map((l) => l.projectId),
      ...cards.map((c) => c.projectId),
    ]),
  ];
  const projects = await projectMap(projectIds);

  return {
    pitchDecks: decks.map((d) => {
      const p = projects.get(d.projectId);
      return {
        projectName: p?.name ?? `Project #${d.projectId}`,
        fileUrl: filePublicUrl(d.filePath),
        createdAt: d.createdAt.toISOString(),
      };
    }),
    shortLinks: links.map((l) => {
      const p = projects.get(l.projectId);
      const slug = p?.slug ?? "";
      const shortPath = slug ? brokerShortLinkPath(slug, l.shortCode) : "";
      return {
        projectName: p?.name ?? `Project #${l.projectId}`,
        shortPath,
        shortUrl: slug ? brokerShortLinkUrl(slug, l.shortCode) : l.shortCode,
        clicks: l.clicks,
        createdAt: l.createdAt.toISOString(),
      };
    }),
    whatsappCards: cards.map((c) => {
      const p = projects.get(c.projectId);
      return {
        projectName: p?.name ?? `Project #${c.projectId}`,
        fileUrl: filePublicUrl(c.filePath),
        createdAt: c.createdAt.toISOString(),
      };
    }),
  };
}
