/**
 * Largest-remainder apportionment. Private to @org/core: reachable only through src/index.ts.
 * All-zero weights split evenly, so "divide by zero" is defined out of existence instead of thrown.
 */
export const largestRemainder = (
  total: number,
  weights: readonly [number, ...number[]],
): ReadonlyArray<number> => {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  const effective = weightSum === 0 ? weights.map(() => 1) : weights
  const effectiveSum = weightSum === 0 ? weights.length : weightSum

  const exact = effective.map((weight) => (total * weight) / effectiveSum)
  const floors = exact.map((share) => Math.floor(share))
  const remainder = total - floors.reduce((sum, part) => sum + part, 0)

  const bonus = new Set(
    exact
      .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
      .toSorted((a, b) => b.fraction - a.fraction || a.index - b.index)
      .slice(0, remainder)
      .map(({ index }) => index),
  )
  return floors.map((part, index) => (bonus.has(index) ? part + 1 : part))
}
