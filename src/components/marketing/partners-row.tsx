import Image from "next/image";
import { SectionHeadline } from "@/components/marketing/section-headline";
import { Marquee } from "@/components/ui/marquee";
import type { PartnerLogo as PartnerLogoData } from "@/config/marketing";

function PartnerLogo({ src, name }: PartnerLogoData) {
  return (
    <div className="flex h-24 w-44 shrink-0 items-center justify-center rounded-clay border border-white/80 bg-clay-surface p-5 shadow-clay-sm transition-shadow hover:shadow-clay sm:h-28 sm:w-52">
      <div className="relative h-full w-full opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0">
        {/* width/height = intrinsic size (all logos are 834×834): reserves space, no layout shift */}
        <Image
          src={src}
          alt={`${name} logo`}
          width={834}
          height={834}
          className="absolute inset-0 h-full w-full object-contain"
          unoptimized
        />
      </div>
    </div>
  );
}

export function PartnersRow({
  logos,
  subtitle = "Projects from established Karachi builders on AbadRaho.",
}: {
  logos: PartnerLogoData[];
  subtitle?: string;
}) {
  return (
    <section className="py-8 md:py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeadline
          before="Our"
          highlight="partners"
          subtitle={subtitle}
          className="mb-8"
        />
      </div>
      {/* Fewer than 6 logos never fills the viewport, so there's no room to loop
          seamlessly — fall back to a static centered row. */}
      {logos.length < 6 ? (
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-8 px-4 sm:px-6 md:gap-10">
          {logos.map((logo) => (
            <PartnerLogo key={logo.src} {...logo} />
          ))}
        </div>
      ) : (
        <Marquee gap="2rem" fadeEdges durationSeconds={logos.length * 4}>
          {logos.map((logo) => (
            <PartnerLogo key={logo.src} {...logo} />
          ))}
        </Marquee>
      )}
    </section>
  );
}
