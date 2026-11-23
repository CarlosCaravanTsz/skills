// Configuration is decoded once, at startup. Secrets stay Redacted (never logged in clear text).
import { Config } from "effect"

export const ApiConfig = Config.all({
  port: Config.Port("PORT").pipe(Config.withDefault(3000)),
  apiToken: Config.Redacted("API_TOKEN"),
})
