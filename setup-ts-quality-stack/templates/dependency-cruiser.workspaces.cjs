// @ts-check
// Workspace-monorepo deep-module & layering rules for dependency-cruiser (TS 7 + SWC).
// Adapt package names (domain, contract, server, web, worker) to your monorepo.

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "No runtime dependency cycles anywhere (type-only cycles allowed).",
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
    {
      name: "domain-is-pure-leaf",
      comment: "packages/domain must not depend on any other workspace package or app.",
      severity: "error",
      from: { path: "^packages/domain/" },
      to: { path: "^(packages/(?!domain/)|apps/)" },
    },
    {
      name: "contract-only-domain",
      comment: "packages/contract may depend only on packages/domain.",
      severity: "error",
      from: { path: "^packages/contract/" },
      to: {
        path: "^(packages/|apps/)",
        pathNot: "^packages/(domain|contract)/",
      },
    },
    {
      name: "server-never-imports-apps",
      comment: "packages/server must never import from apps/*.",
      severity: "error",
      from: { path: "^packages/server/" },
      to: { path: "^apps/" },
    },
    {
      name: "worker-never-imports-web",
      comment: "apps/worker must never import from apps/web.",
      severity: "error",
      from: { path: "^apps/worker/" },
      to: { path: "^apps/web/" },
    },
    {
      name: "web-server-only-in-api-route",
      comment: "Only apps/web/app/api/** may import packages/server; UI code uses packages/contract.",
      severity: "error",
      from: {
        path: "^apps/web/",
        pathNot: "^apps/web/app/api/",
      },
      to: {
        path: "^(packages/server/|apps/worker/)",
      },
    },
    {
      name: "no-cross-package-deep-imports",
      comment: "Import sibling packages only through their public entrypoint (src/index.ts).",
      severity: "error",
      from: { path: "^(packages/([^/]+)/|apps/)" },
      to: {
        path: "^packages/([^/]+)/src/(?!index\\.ts$)",
        pathNot: "^packages/$2/",
      },
    },
    {
      name: "tests-are-private",
      comment: "Production code must never import test files.",
      severity: "error",
      from: { pathNot: "(/test/|/tests/|\\.test\\.tsx?$)" },
      to: { path: "(/test/|/tests/|\\.test\\.tsx?$)" },
    },
  ],
  options: {
    parser: "swc",
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^apps/web/\\.next/|\\.d\\.ts$)" },
    tsConfig: { fileName: "tsconfig.base.json" },
    tsPreCompilationDeps: false,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "types", "default"],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
    },
    combinedDependencies: true,
  },
}
