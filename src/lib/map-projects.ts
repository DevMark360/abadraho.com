import type { ProjectListItem } from "@/types/project";

/**
 * The only project fields the map reads. Map components accept this instead of full list items,
 * so callers can pass slim data (full items serialized into a page made the home HTML ~290KB).
 */
export type MapProject = Pick<
  ProjectListItem,
  "id" | "name" | "slug" | "area" | "imageUrl" | "minPrice" | "latitude" | "longitude"
>;
