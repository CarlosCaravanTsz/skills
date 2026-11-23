// @ts-check
// Workspace-monorepo boundaries for dependency-cruiser (TS 7 + SWC, Bun workspaces).
//
// Layout: apps/<name>/ (deployable) and packages/<name>/ (shared, flat). Each package is a DEEP MODULE:
//   - Public API = package.json#exports, whose targets are ROOT files of packages/<name>/src/*.{ts,tsx}
//     (several small entry points such as index.ts, client.ts, server.ts; no barrels).
//   - Anything in a src/ subfolder (src/lib/, src/internal/, ...) is private.
//   - Other workspaces import a package ONLY by its package name (@org/core, @org/core/client), never by path.
//   - Tests in packages/<name>/test/ use the package name too (self-reference), so they exercise `exports`.
//
// The file has two blocks:
//   1. INTERFACE rules: generic, never edited per repo.
//   2. LAYERING rules: which workspace may depend on which. Edit these for your repo.
//
// Dependency types used below were verified against dependency-cruiser's source
// (src/extract/resolve/determine-dependency-types.mjs):
//   relative specifier ("../../packages/core/src/x")  -> "local"
//   tsconfig `paths` alias                             -> "aliased-tsconfig" + "local"
//   "@org/core" with combinedDependencies: false       -> "undetermined"       (allowed)
//   "@org/core" with combinedDependencies: true        -> "aliased-workspace"  (allowed)
// Undeclared workspace dependencies are caught by scripts/check-workspace-deps.mjs (see lint:boundaries).

const WS = "^(apps|packages)/([^/]+)/" // captures $1 = apps|packages, $2 = workspace folder
const PACKAGE_INTERNALS = "^packages/[^/]+/src/[^/]+/"
const TEST_FILES = "(^|/)test/|\\.test\\.tsx?$"

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ---------------------------------------------------------------- 1. INTERFACE (do not edit)
    {
      name: "no-circular",
      comment: "No runtime dependency cycles anywhere (type-only cycles are allowed).",
      severity: "error",
      from: {},
      to: {
        circular: true,
        dependencyTypesNot: ["type-only"],
        viaOnly: { dependencyTypesNot: ["type-only"] },
      },
    },
    {
      name: "not-to-unresolvable",
      comment:
        "Every import must resolve. Importing a subpath a package does not list in package.json#exports fails here.",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "no-undeclared-npm-dependency",
      comment: "npm packages must be declared in the importing workspace's package.json.",
      severity: "error",
      from: {},
      to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
    },
    {
      name: "workspace-imports-by-package-name",
      comment:
        "Reach another workspace only through its package name (@org/core), never by relative path or tsconfig alias.",
      severity: "error",
      from: { path: WS },
      to: {
        path: "^(apps|packages)/",
        pathNot: "^$1/$2/",
        dependencyTypes: ["local"],
        dependencyTypesNot: ["aliased-workspace"],
      },
    },
    {
      name: "entrypoint-boundary",
      comment:
        "A package's src/ subfolders are private. Outsiders see only the root entry points listed in its exports.",
      severity: "error",
      from: { path: WS },
      to: { path: PACKAGE_INTERNALS, pathNot: "^$1/$2/" },
    },
    {
      name: "tests-through-entrypoints",
      comment:
        "Package tests import their own package by name (@org/<pkg>), like any consumer. No relative imports into src/.",
      severity: "error",
      from: { path: "^packages/([^/]+)/test/" },
      to: {
        path: "^packages/$1/src/",
        dependencyTypes: ["local"],
        dependencyTypesNot: ["aliased-workspace"],
      },
    },
    {
      name: "tests-are-private",
      comment: "Production code never imports tests or test fixtures.",
      severity: "error",
      from: { pathNot: TEST_FILES },
      to: { path: TEST_FILES },
    },
    {
      name: "test-fixtures-stay-in-workspace",
      comment: "A workspace's tests may use their own fixtures, never another workspace's.",
      severity: "error",
      from: { path: `${WS}test/` },
      to: { path: "^(apps|packages)/[^/]+/test/", pathNot: "^$1/$2/test/" },
    },

    // ---------------------------------------------------------------- 2. LAYERING (edit per repo)
    // More elaborate example (domain / contract / server / worker): references/layering-examples.md
    {
      name: "core-is-a-pure-leaf",
      comment: "packages/core depends on no other workspace.",
      severity: "error",
      from: { path: "^packages/core/" },
      to: { path: "^(apps|packages)/", pathNot: "^packages/core/" },
    },
    {
      name: "ui-depends-only-on-core",
      comment: "packages/ui may depend on packages/core and nothing else in the repo.",
      severity: "error",
      from: { path: "^packages/ui/" },
      to: { path: "^(apps|packages)/", pathNot: "^packages/(ui|core)/" },
    },
    {
      name: "packages-never-import-apps",
      comment: "Shared code never depends on a deployable.",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "apps-are-independent",
      comment: "Apps never import each other. Share through a package instead.",
      severity: "error",
      from: { path: "^apps/([^/]+)/" },
      to: { path: "^apps/", pathNot: "^apps/$1/" },
    },
  ],
  options: {
    // TS 7 (native) has no JS compiler API: parse with SWC and do not read tsconfig through `typescript`.
    parser: "swc",
    tsPreCompilationDeps: false,
    // Read each workspace's OWN package.json, so phantom dependencies are not masked by the root manifest.
    combinedDependencies: false,
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(\\.next|\\.turbo|dist|coverage|reports|\\.stryker-tmp)/|\\.d\\.ts$" },
    builtInModules: { add: ["bun", "bun:test", "bun:sqlite", "bun:ffi", "bun:jsc"] },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "bun", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
    },
    cache: { folder: "node_modules/.cache/dependency-cruiser", strategy: "content" },
  },
}
