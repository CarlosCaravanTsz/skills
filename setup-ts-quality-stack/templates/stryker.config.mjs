// @ts-check
// Lives INSIDE the pure package (packages/core/stryker.config.mjs) and runs from there
// (`test:mutate` script of that workspace), so it is deleted together with the package.
//
// Why each non-default option exists:
// - packageManager "npm": Stryker's schema has no "bun"; it only affects Stryker's own messages.
// - checkers []: the TypeScript checker needs the JS compiler API, which TS 7 (native) does not ship.
// - ignorePatterns "tsconfig.json": Stryker's TSConfigPreprocessor imports `typescript` and calls
//   ts.parseConfigFileTextToJson, which TS 7 lacks (it would crash before running a test). The mutation
//   run is tsconfig-independent by design: core is erasable TS (no JSX, decorators or `paths`), and
//   @org/core resolves through package.json#exports to the mutated src/ inside the sandbox.
// - Default tempDirName keeps the sandbox inside this package, so the default symlink of this
//   package's node_modules (isolated linker) is the one the sandbox uses.
export default {
  packageManager: "npm",
  plugins: ["@stryker-mutator/vitest-runner"],
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.mutation.config.ts",
    related: true,
  },
  checkers: [],
  mutate: ["src/**/*.ts"],
  ignorePatterns: ["tsconfig.json", "reports", "coverage", ".turbo"],
  reporters: ["progress", "clear-text", "html"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  thresholds: { high: 80, low: 60, break: null },
  incremental: true,
  incrementalFile: "reports/mutation/stryker-incremental.json",
  concurrency: 4,
}
