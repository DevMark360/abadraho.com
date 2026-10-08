import type { ProjectListItem } from "@/types/project";
import type { ProjectInfoBlock } from "@/lib/project-info";

export interface UnitRoomRow {
  roomTypeName: string;
  icon: string | null;
  count: string | null;
  dimensions: string | null;
  coveredArea: number | null;
}

export interface ProjectUnit {
  id: number;
  title?: string | null;
  name?: string | null;
  price: number | null;
  downPayment: number | null;
  monthlyInstallment: number | null;
  /** Unit's own installment length in months (admin unit form); falls back to the project's. */
  installmentMonths?: number | null;
  /** @deprecated Use grossArea — kept for legacy consumers */
  size: number | null;
  grossArea: number | null;
  netArea: number | null;
  unitType?: string | null;
  unitTypeId?: number | null;
  roomBreakdown: UnitRoomRow[];
  floorPlanUrl?: string | null;
  paymentPlanUrl?: string | null;
  loanAmount?: number | null;
  totalUnitAmount?: number | null;
}

export interface ProjectDocumentLink {
  filename: string;
  downloadPath: string;
  label: string;
}

export interface ProjectVideoItem {
  id: number;
  title: string;
  url: string;
  embedUrl: string | null;
  description: string | null;
}

export interface ProjectDetail extends ProjectListItem {
  paymentPlan?: string | null;
  details: string | null;
  units: ProjectUnit[];
  ratingAverage: number;
  ratingCount: number;
  installmentPlanLabel: string | null;
  similarProjects: ProjectListItem[];
  amenities: string[];
  utilities: string[];
  galleryImages: string[];
  documents: ProjectDocumentLink[];
  videos: ProjectVideoItem[];
  projectVideoUrl: string | null;
  projectVideoEmbed: string | null;
  /** All linked areas (junction table) */
  areaNames: string | null;
  projectTypeName: string | null;
  builderNames: string[];
  tags: string[];
  marketedBy: string | null;
  projectInfo: ProjectInfoBlock | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  discountPrice: number | null;
}
