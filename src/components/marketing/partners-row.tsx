import Image from "next/image";
import { SectionHeadline } from "@/components/marketing/section-headline";
import { Marquee } from "@/components/ui/marquee";

function PartnerLogo({ src }: { src: string }) {
  return (
    <div className="flex h-24 w-44 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:h-28 sm:w-52">
      <div className="relative h-full w-full opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0">
        <Image src={src} alt="" fill className="object-contain" unoptimized />
      </div>
    </div>
  );
}

export function PartnersRow({
  logos,
  subtitle = "Projects from established Karachi builders on AbadRaho.",
}: {
  logos: string[];
  subtitle?: string;
}) {
  return (
    <section className="border-t border-zinc-200 bg-zinc-50 py-10 md:py-12">
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
          {logos.map((src) => (
            <PartnerLogo key={src} src={src} />
          ))}
        </div>
      ) : (
        <Marquee gap="2rem" fadeEdges durationSeconds={logos.length * 4}>
          {logos.map((src) => (
            <PartnerLogo key={src} src={src} />
          ))}
        </Marquee>
      )}
    </section>
  );
}
