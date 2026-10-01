import { businessConfig } from "@/config/business";

/** EEAT trust stats — shown on home, about, footer. */
export const trustStats = [
  { value: "15+", label: "Years experience" },
  { value: "Karachi", label: "Market focus" },
  { value: "50+", label: "Builder partners" },
] as const;

export const markPropertiesLabel = businessConfig.legalName;
