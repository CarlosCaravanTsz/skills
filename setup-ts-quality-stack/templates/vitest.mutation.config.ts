// Lives next to stryker.config.mjs inside the pure package (packages/core/).
// Only fast, pure unit + property tests: never integration tests, system binaries or databases.
// Reads nothing from tsconfig on purpose (see stryker.config.mjs).
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["**/*.int.test.ts", "**/node_modules/**"],
  },
})
