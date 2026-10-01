import { Building2, MapPin, Sparkles } from "lucide-react";
import { trustStats } from "@/config/trust-signals";
import { HomeKpiCard } from "@/components/marketing/home-ui";

export type HomeStats = {
  totalProjects: number;
  featuredCount: number;
  popularAreaProjects: number;
};

export function HomeKpiSection({ stats }: { stats: HomeStats }) {
  const builderStat = trustStats.find((s) => s.label === "Builder partners");

  return (
    <section className="border-b border-zinc-200 bg-white py-8 md:py-10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <HomeKpiCard
          label="Live listings"
          value={stats.totalProjects > 0 ? stats.totalProjects : "—"}
          hint="Active off-plan projects"
          icon={Building2}
          accent="blue"
        />
        <HomeKpiCard
          label="Featured picks"
          value={stats.featuredCount > 0 ? stats.featuredCount : "—"}
          hint="Curated for buyers"
          icon={Sparkles}
          accent="red"
        />
        <HomeKpiCard
          label="Hot-area inventory"
          value={stats.popularAreaProjects > 0 ? stats.popularAreaProjects : "—"}
          hint="Across top Karachi zones"
          icon={MapPin}
          accent="emerald"
        />
        <HomeKpiCard
          label="Builder partners"
          value={builderStat?.value ?? "50+"}
          hint={builderStat?.label}
          icon={Building2}
          accent="zinc"
        />
      </div>
    </section>
  );
}
