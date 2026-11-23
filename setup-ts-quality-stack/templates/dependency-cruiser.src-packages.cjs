// @ts-check
// Single-app deep-module enforcement for dependency-cruiser (TS 7 + SWC).
//
// Each immediate directory under PACKAGES_ROOT is a DEEP MODULE:
//   - Root files (index.ts, client.ts, server.ts) are public entry points.
//   - Any subfolder (lib/, tests/) is private.
//   - Tests under <pkg>/tests/ exercise packages strictly through entry points.
//   - Packages are flat: one tier under PACKAGES_ROOT; internals may nest freely.
// Only PACKAGES_ROOT should ever need editing. Layering (which package may use which) goes in the
// commented stub at the end of `forbidden`; examples in references/layering-examples.md.

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
      name: "not-to-unresolvable",
      comment: "Every import must resolve.",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "no-undeclared-npm-dependency",
      comment: "npm packages must be declared in package.json.",
      severity: "error",
      from: {},
      to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
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

    // --- LAYERING (optional, edit per repo) -------------------------------------------------
    // {
    //   name: "ui-may-not-depend-on-billing",
    //   severity: "error",
    //   from: { path: `^${R}/ui/` },
    //   to: { path: `^${R}/billing/` },
    // },
  ],
  options: {
    // TS 7 (native) has no JS compiler API: parse with SWC, never read tsconfig through `typescript`.
    parser: "swc",
    tsPreCompilationDeps: false,
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(\\.next|dist|coverage|reports|\\.stryker-tmp)/|\\.d\\.ts$" },
    builtInModules: { add: ["bun", "bun:test", "bun:sqlite", "bun:ffi", "bun:jsc"] },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
    },
  },
}
