// @ts-check
// Single-app deep-module enforcement for dependency-cruiser (TS 7 + SWC).
//
// Each immediate directory under PACKAGES_ROOT is a DEEP MODULE:
//   - Root files (index.ts, client.ts, server.ts) are public entry points.
//   - Any subfolder (lib/, tests/) is private.
//   - Tests under <pkg>/tests/ exercise packages strictly through entry points.

const PACKAGES_ROOT = "src/packages"
const R = PACKAGES_ROOT
const PACKAGE_INTERNALS = `^${R}/[^/]+/[^/]+/`

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "entrypoint-boundary-from-app",
      comment: "App code may import a package's root entry points, never its subfolders.",
      severity: "error",
      from: { pathNot: `^${R}/` },
      to: { path: PACKAGE_INTERNALS },
    },
    {
      name: "entrypoint-boundary-across-packages",
      comment: "Packages reach other packages only through their root entry points.",
      severity: "error",
      from: { path: `^${R}/([^/]+)/`, pathNot: `^${R}/[^/]+/tests/` },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/`,
      },
    },
    {
      name: "tests-through-entrypoints",
      comment: "Tests exercise packages through entry points (own tests/ fixtures allowed).",
      severity: "error",
      from: { path: `^${R}/([^/]+)/tests/` },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/tests/`,
      },
    },
    {
      name: "tests-folder-is-private",
      comment: "Non-test code may never import tests/ fixtures.",
      severity: "error",
      from: { pathNot: `^${R}/[^/]+/tests/` },
      to: { path: `^${R}/[^/]+/tests/` },
    },
    {
      name: "no-circular",
      comment: "No runtime dependency cycles (type-only cycles allowed).",
      severity: "error",
      from: {},
      to: {
        circular: true,
        dependencyTypesNot: ["type-only"],
        viaOnly: {
          dependencyTypesNot: ["type-only"],
        },
      },
    },
  ],
  options: {
    parser: "swc",
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: false,
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
  },
}
