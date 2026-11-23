/**
 * @org/core: pure business rules. No IO, services, clocks or randomness (fenced by oxlint + depcruise).
 *
 * Entry point: allocate an amount across weighted parts without losing or inventing a cent.
 * Behaviour is defined once here (schema + function); apps/api and apps/web are thin adapters.
 */
import { Schema } from "effect"

import { largestRemainder } from "./lib/largest-remainder"

export const Cents = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))
export const Weight = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))

/** Decode untrusted input with this schema at the boundary; inside, trust the type. */
export const Allocation = Schema.Struct({
  totalCents: Cents,
  weights: Schema.NonEmptyArray(Weight),
})
export type Allocation = typeof Allocation.Type

/** Parts always sum to `totalCents`, keep the order of `weights`, and differ from the exact share by < 1. */
export const allocate = ({ totalCents, weights }: Allocation): ReadonlyArray<number> =>
  largestRemainder(totalCents, weights)
