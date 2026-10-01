export interface ProjectInfoBlock {
  mainHeading: string | null;
  subHeading: string | null;
  bullets: string[];
}

export function bulletsFromInfo(info: {
  bullet1?: string | null;
  bullet2?: string | null;
  bullet3?: string | null;
  bullet4?: string | null;
  bullet5?: string | null;
  bullet6?: string | null;
} | null): string[] {
  if (!info) return [];
  return [
    info.bullet1,
    info.bullet2,
    info.bullet3,
    info.bullet4,
    info.bullet5,
    info.bullet6,
  ].filter((b): b is string => Boolean(b?.trim()));
}
