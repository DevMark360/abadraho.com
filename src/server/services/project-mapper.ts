import {
  resolveListingImageUrl,
  summarizeListingUnits,
} from "@/lib/project-list-card";
import {
  resolveProjectDocuments,
  resolveProjectImageUrls,
  youtubeEmbedUrl,
} from "@/lib/project-media";
import type { ProjectListItem } from "@/types/project";
import type {
  ProjectDetail,
  ProjectUnit,
  ProjectVideoItem,
  UnitRoomRow,
} from "@/types/project-detail";
import { bulletsFromInfo, type ProjectInfoBlock } from "@/lib/project-info";
import {
  formatInstallmentPlanBadge,
  formatPaymentPlanLabel,
} from "@/lib/project-display";
import { normalizePakistanCoords } from "@/lib/map-karachi";
import { unitPlanImageUrl } from "@/lib/unit-media";
import type { Prisma } from "@prisma/client";

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    location: true;
    progress: true;
    projectType: true;
    projectTags: { include: { tag: true } };
    units: {
      include: {
        unitType: true;
        roomTypeUnits: { include: { roomType: true } };
      };
    };
    owners: { include: { builder: true } };
    reviews: true;
    projectAmenities: { include: { amenity: true } };
    projectUtilities: { include: { utility: true } };
  };
}>;

export type ProjectDetailExtras = {
  areaNames?: string | null;
  projectInfo?: ProjectInfoBlock | null;
  marketedBy?: string | null;
  metaKeywords?: string | null;
};

function dec(v: { toNumber?: () => number } | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "object" && "toNumber" in v) return Number(v);
  return Number(v);
}

function formatDimensions(
  wF: number | null,
  wI: number | null,
  lF: number | null,
  lI: number | null
): string | null {
  if (wF == null && lF == null) return null;
  const w =
    wF != null
      ? `${wF}${wI ? `′${wI}"` : "′"}`
      : null;
  const l =
    lF != null
      ? `${lF}${lI ? `′${lI}"` : "′"}`
      : null;
  if (w && l) return `${w} × ${l}`;
  return w ?? l;
}

export function mapRoomTypeUnit(
  r: ProjectWithRelations["units"][0]["roomTypeUnits"][0]
): UnitRoomRow {
  return {
    roomTypeName: r.roomType.name,
    icon: r.roomType.icon,
    count: r.extras,
    dimensions: formatDimensions(
      r.widthFeet,
      r.widthInches,
      r.lengthFeet,
      r.lengthInches
    ),
    coveredArea: dec(r.coveredArea),
  };
}

type UnitRow = ProjectWithRelations["units"][0] & {
  floorPlanImg?: string | null;
  paymentPlanImg?: string | null;
  loanAmount?: unknown;
  totalUnitAmount?: unknown;
};

export function mapDbUnit(u: UnitRow, projectId?: number): ProjectUnit {
  const rooms = (u.roomTypeUnits ?? [])
    .filter((r) => !r.isArchive && r.isDisplayOnListing)
    .map(mapRoomTypeUnit);

  return {
    id: u.id,
    title: u.title,
    price: dec(u.price),
    downPayment: dec(u.downPayment),
    monthlyInstallment: dec(u.monthlyInstallment),
    grossArea: dec(u.grossArea) ?? dec(u.size),
    netArea: dec(u.netArea),
    size: dec(u.grossArea) ?? dec(u.size),
    unitType: u.unitType?.title ?? null,
    unitTypeId: u.unitTypeId,
    roomBreakdown: rooms,
    floorPlanUrl: unitPlanImageUrl(projectId ?? u.projectId, u.id, u.floorPlanImg),
    paymentPlanUrl: unitPlanImageUrl(projectId ?? u.projectId, u.id, u.paymentPlanImg),
    loanAmount: dec(u.loanAmount as Parameters<typeof dec>[0]),
    totalUnitAmount: dec(u.totalUnitAmount as Parameters<typeof dec>[0]),
  };
}

function mapProjectCoords(latitude: unknown, longitude: unknown) {
  const coords = normalizePakistanCoords(
    latitude != null ? Number(latitude) : null,
    longitude != null ? Number(longitude) : null
  );
  return {
    latitude: coords?.lat ?? null,
    longitude: coords?.lng ?? null,
  };
}

export function mapDbProjectToListItem(
  p: ProjectWithRelations,
  units?: ProjectUnit[],
  areaNames?: string | null
): ProjectListItem {
  const mappedUnits = units ?? p.units.map((u) => mapDbUnit(u, p.id));
  const unitSummary = summarizeListingUnits(p.units);
  const prices = mappedUnits
    .map((u) => u.price)
    .filter((n): n is number => n != null && n > 0);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    area: areaNames ?? p.location?.name ?? null,
    address: p.address,
    imageUrl: resolveListingImageUrl(p.projectCoverImg, p.projectImgs),
    minPrice: unitSummary.minPrice ?? (prices.length
      ? Math.min(...prices)
      : p.minPrice != null
        ? dec(p.minPrice)
        : p.discountPrice != null
          ? dec(p.discountPrice)
          : null),
    maxPrice: unitSummary.maxPrice ?? (prices.length ? Math.max(...prices) : null),
    progressName: p.progress?.name ?? null,
    builderName: p.owners[0]?.builder?.fullName ?? null,
    handoverLabel: formatInstallmentPlanBadge(p.installmentLength),
    installmentMonths: p.installmentLength,
    views: p.views,
    hasDealBonus: false,
    ...mapProjectCoords(p.latitude, p.longitude),
    statusBadge: p.progress?.name ?? p.progressLabel ?? null,
    handoverQuarter: formatInstallmentPlanBadge(p.installmentLength),
    paymentPlan: formatPaymentPlanLabel(p.installmentLength),
    saleBadge: null,
    advised: false,
    builderLogoUrl: null,
    minMonthlyInstallment: unitSummary.minMonthlyInstallment,
    bedroomLabel: unitSummary.bedroomLabel,
    minAreaSqFt: unitSummary.minAreaSqFt,
    maxAreaSqFt: unitSummary.maxAreaSqFt,
  };
}

export function mapDbProjectToDetail(
  p: ProjectWithRelations,
  similarProjects: ProjectListItem[] = [],
  videos: ProjectVideoItem[] = [],
  extras: ProjectDetailExtras = {}
): ProjectDetail {
  const units = p.units.filter((u) => !u.isArchive).map((u) => mapDbUnit(u, p.id));
  const base = mapDbProjectToListItem(p, units, extras.areaNames);
  const ratingCount = p.reviews.length;
  const ratingAverage =
    ratingCount > 0
      ? p.reviews.reduce((s, r) => s + r.rating, 0) / ratingCount
      : 0;

  const galleryImages = resolveProjectImageUrls(p.projectCoverImg, p.projectImgs);

  return {
    ...base,
    paymentPlan: base.paymentPlan,
    details: p.details,
    units,
    ratingAverage,
    ratingCount,
    installmentPlanLabel: p.installmentLength
      ? `${p.installmentLength} months`
      : null,
    similarProjects,
    amenities: p.projectAmenities
      .filter((pa) => pa.isActive && !pa.amenity.isArchive)
      .map((pa) => pa.amenity.name),
    utilities: p.projectUtilities
      .filter((pu) => !pu.utility.isArchive)
      .map((pu) => pu.utility.name),
    galleryImages,
    documents: resolveProjectDocuments(p.id, p.projectDoc),
    videos,
    projectVideoUrl: p.projectVideo,
    projectVideoEmbed: youtubeEmbedUrl(p.projectVideo),
    areaNames: extras.areaNames ?? p.location?.name ?? null,
    projectTypeName: p.projectType?.title ?? null,
    builderNames: p.owners
      .map((o) => o.builder?.fullName)
      .filter((n): n is string => Boolean(n?.trim())),
    tags: p.projectTags
      .map((t) => t.tag?.name)
      .filter((n): n is string => Boolean(n?.trim())),
    marketedBy: extras.marketedBy ?? null,
    projectInfo: extras.projectInfo ?? null,
    metaTitle: p.metaTitle ?? null,
    metaDescription: p.metaDescription ?? null,
    metaKeywords: extras.metaKeywords ?? null,
    discountPrice: dec(p.discountPrice),
  };
}

export function projectInfoFromRaw(info: {
  main_heading?: string | null;
  sub_heading?: string | null;
  bullet_1?: string | null;
  bullet_2?: string | null;
  bullet_3?: string | null;
  bullet_4?: string | null;
  bullet_5?: string | null;
  bullet_6?: string | null;
} | null | undefined): ProjectInfoBlock | null {
  if (!info) return null;
  const bullets = bulletsFromInfo({
    bullet1: info.bullet_1,
    bullet2: info.bullet_2,
    bullet3: info.bullet_3,
    bullet4: info.bullet_4,
    bullet5: info.bullet_5,
    bullet6: info.bullet_6,
  });
  const mainHeading = info.main_heading?.trim() || null;
  const subHeading = info.sub_heading?.trim() || null;
  if (!mainHeading && !subHeading && !bullets.length) return null;
  return { mainHeading, subHeading, bullets };
}
