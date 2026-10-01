import type { ProjectListItem } from "@/types/project";
import type { ProjectUnit } from "@/types/project-detail";

export type CompareProjectPayload = ProjectListItem & {
  units: ProjectUnit[];
  /** True when the project has units, even if unit details are withheld (logged out). */
  hasUnits?: boolean;
};
