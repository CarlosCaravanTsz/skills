// Thin HTTP adapter: decode at the boundary, delegate to @org/core, encode the result.
import { Result, Schema } from "effect"

import { allocate, Allocation } from "@org/core"

const decodeAllocation = Schema.decodeUnknownResult(Allocation)

export const handle = async (request: Request): Promise<Response> => {
  const url = new URL(request.url)
  if (request.method !== "POST" || url.pathname !== "/allocate") {
    return Response.json({ error: "NotFound" }, { status: 404 })
  }
  const body: unknown = await request.json().catch(() => null)
  const decoded = decodeAllocation(body)
  if (Result.isFailure(decoded)) {
    return Response.json({ error: "InvalidAllocation" }, { status: 400 })
  }
  return Response.json({ parts: allocate(decoded.success) })
}
