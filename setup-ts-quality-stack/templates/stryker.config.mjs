// @ts-check
export default {
  packageManager: "npm",
  plugins: ["@stryker-mutator/vitest-runner"],
  testRunner: "vitest",
  vitest: {
    // A dedicated config that only collects the pure domain tests, so `related`
    // never pulls in tests needing system binaries or a database.
    configFile: "vitest.mutation.config.ts",
    related: true,
  },
  checkers: [],
  mutate: ["packages/domain/src/**/*.ts", "!packages/domain/src/index.ts"],
  ignorePatterns: [".claude", ".agents", ".git", "apps/web/.next", "supabase", "reports"],
  reporters: ["progress", "clear-text", "html"],
  htmlReporter: {
    fileName: "reports/mutation/domain.html",
  },
  thresholds: {
    high: 80,
    low: 60,
    break: null,
  },
  incremental: true,
  incrementalFile: "reports/mutation/stryker-incremental.json",
  tempDirName: ".stryker-tmp",
  concurrency: 4,
}
