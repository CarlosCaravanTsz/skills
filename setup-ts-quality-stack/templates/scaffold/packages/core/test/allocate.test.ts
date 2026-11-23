// Tests import the package by NAME, like any consumer (fenced by depcruise `tests-through-entrypoints`).
import { describe, expect, it } from "vitest"

import { allocate } from "@org/core"

describe("allocate", () => {
  it("gives the leftover cent to the earliest part on ties", () => {
    expect(allocate({ totalCents: 100, weights: [1, 1, 1] })).toEqual([34, 33, 33])
  })

  it("follows the weights", () => {
    expect(allocate({ totalCents: 10, weights: [1, 3] })).toEqual([3, 7])
  })

  it("gives the leftover cent to the largest remainder", () => {
    expect(allocate({ totalCents: 10, weights: [1, 2] })).toEqual([3, 7])
  })

  it("splits evenly when every weight is zero", () => {
    expect(allocate({ totalCents: 5, weights: [0, 0] })).toEqual([3, 2])
  })
})
