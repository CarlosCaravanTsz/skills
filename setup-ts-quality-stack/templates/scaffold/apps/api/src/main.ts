// Runtime edge: the only place that runs effects for this app.
import { Effect } from "effect"

import { handle } from "./app"
import { ApiConfig } from "./config"

const program = Effect.gen(function* () {
  const { port } = yield* ApiConfig
  const server = Bun.serve({ port, fetch: handle })
  yield* Effect.log("api listening", { port: server.port })
})

Effect.runFork(program)
