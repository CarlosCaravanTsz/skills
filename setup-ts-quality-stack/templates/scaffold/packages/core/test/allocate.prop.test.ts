// Property-based invariants for the public behaviour (fast-check).
import fc from "fast-check"
import { expect, it } from "vitest"

import { allocate } from "@org/core"

const weights = fc
  .tuple(fc.nat({ max: 1_000 }), fc.array(fc.nat({ max: 1_000 }), { maxLength: 20 }))
  .map(([head, tail]): readonly [number, ...number[]] => [head, ...tail])

it("never loses or invents a cent", () => {
  fc.assert(
    fc.property(fc.nat({ max: 10_000_000 }), weights, (totalCents, ws) => {
      const parts = allocate({ totalCents, weights: ws })
      expect(parts).toHaveLength(ws.length)
      expect(parts.reduce((sum, part) => sum + part, 0)).toBe(totalCents)
    }),
  )
})

it("keeps every part within one cent of its exact share", () => {
  fc.assert(
    fc.property(fc.nat({ max: 10_000_000 }), weights, (totalCents, ws) => {
      const weightSum = ws.reduce((sum, w) => sum + w, 0)
      const parts = allocate({ totalCents, weights: ws })
      parts.forEach((part, index) => {
        const exact = weightSum === 0 ? totalCents / ws.length : (totalCents * (ws[index] ?? 0)) / weightSum
        expect(Math.abs(part - exact)).toBeLessThan(1)
      })
    }),
  )
})
