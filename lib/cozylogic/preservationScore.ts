export type PreservationReview = {
  expectedInventory: string[];
  preservedInventory: string[];
  inventedMajorObjects: number;
  architectureChanges: number;
};

export function scorePreservationReview(review: PreservationReview) {
  const expected = [...new Set(review.expectedInventory.map((item) => item.trim()).filter(Boolean))];
  const preserved = new Set(
    review.preservedInventory.map((item) => item.trim()).filter(Boolean)
  );
  const preservedCount = expected.filter((item) => preserved.has(item)).length;
  const retention = expected.length === 0 ? 0 : preservedCount / expected.length;
  const inventedMajorObjects = Math.max(0, Math.floor(review.inventedMajorObjects || 0));
  const architectureChanges = Math.max(0, Math.floor(review.architectureChanges || 0));

  return {
    expectedCount: expected.length,
    preservedCount,
    missingInventory: expected.filter((item) => !preserved.has(item)),
    retention,
    retentionPercent: Math.round(retention * 10_000) / 100,
    inventedMajorObjects,
    architectureChanges,
    passes:
      expected.length > 0 &&
      retention === 1 &&
      inventedMajorObjects === 0 &&
      architectureChanges === 0,
  };
}
