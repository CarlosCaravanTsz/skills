import { describe, expect, it } from "vitest"

import { handle } from "../src/app"

const post = (body: unknown) =>
  handle(new Request("http://test/allocate", { method: "POST", body: JSON.stringify(body) }))

describe("POST /allocate", () => {
  it("delegates to @org/core", async () => {
    const response = await post({ totalCents: 100, weights: [1, 1, 1] })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ parts: [34, 33, 33] })
  })

  it("rejects invalid input at the boundary", async () => {
    const response = await post({ totalCents: -1, weights: [] })
    expect(response.status).toBe(400)
  })
})
