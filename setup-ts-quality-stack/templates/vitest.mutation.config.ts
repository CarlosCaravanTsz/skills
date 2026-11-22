import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["packages/domain/test/**/*.test.ts"],
    exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
  },
})
