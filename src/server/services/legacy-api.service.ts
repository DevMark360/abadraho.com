import { mockProjects } from "@/data/mock-projects";
import type { ProjectDetail } from "@/types/project-detail";

/** Demo detail when `USE_DATABASE` is off — no legacy HTTP */
export function getMockDetail(slug: string): ProjectDetail | null {
  const base = mockProjects.find((p) => p.slug === slug);
  if (!base) return null;
  return {
    ...base,
    details: "Demo project description.",
    units: [
      {
        id: 1,
        title: "2 Bed",
        price: base.minPrice,
        downPayment: base.minPrice ? base.minPrice * 0.2 : null,
        monthlyInstallment: base.minPrice ? Math.round(base.minPrice / 36) : null,
        size: 1200,
        grossArea: 1200,
        netArea: 1100,
        roomBreakdown: [],
      },
    ],
    ratingAverage: 4.2,
    ratingCount: 8,
    installmentPlanLabel: base.handoverLabel,
    similarProjects: mockProjects.filter((p) => p.slug !== slug).slice(0, 3),
    amenities: [],
    utilities: [],
    galleryImages: base.imageUrl ? [base.imageUrl] : [],
    documents: [],
    videos: [],
    projectVideoUrl: null,
    projectVideoEmbed: null,
    areaNames: base.area,
    projectTypeName: null,
    builderNames: base.builderName ? [base.builderName] : [],
    tags: [],
    marketedBy: null,
    projectInfo: null,
    metaTitle: null,
    metaDescription: null,
    metaKeywords: null,
    discountPrice: null,
  };
}
