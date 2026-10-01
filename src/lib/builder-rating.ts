export type BuilderRatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

export const EMPTY_BUILDER_RATING_DISTRIBUTION: BuilderRatingDistribution = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

export function normalizeBuilderRatingDistribution(
  value: Partial<BuilderRatingDistribution> | null | undefined
): BuilderRatingDistribution {
  return {
    1: value?.[1] ?? 0,
    2: value?.[2] ?? 0,
    3: value?.[3] ?? 0,
    4: value?.[4] ?? 0,
    5: value?.[5] ?? 0,
  };
}
