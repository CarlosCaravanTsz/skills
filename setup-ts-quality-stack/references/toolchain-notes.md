# Toolchain notes (verified against source, Nov 2026)

Pinned set used by the scaffold: Bun 1.4.5, Node 24 (CI, Node-hosted tooling), TypeScript 7.0.2, Effect 4.1.5,
Vitest 5.1.1, fast-check 4.11.0, Stryker 10.1.1, oxlint 1.95.0, oxfmt 0.80.0, dependency-cruiser 18.9.0,
knip 6.48.0, Turborepo 2.11.13, Next 16.4.6, React 19.3.1. Bump them together and rerun the acceptance
checks in SKILL.md step 9.

## TypeScript 7 (native)

- The stable package ships the native compiler as `tsc`. `tsgo` was only the `@typescript/native-preview` name.
- There is no JS compiler API. Anything that does `import("typescript")` and calls the old API breaks:
  - dependency-cruiser: use `parser: "swc"`, `tsPreCompilationDeps: false`, and do not set `options.tsConfig`.
  - Stryker: `checkers: []`, and `"tsconfig.json"` in `ignorePatterns` (its TSConfigPreprocessor calls
    `ts.parseConfigFileTextToJson`).
- `types` defaults to `[]`: every workspace tsconfig must list the globals it uses (`["bun"]`, `["node"]`).
- `module: "preserve"` implies bundler resolution; `verbatimModuleSyntax` implies `isolatedModules`.

## dependency-cruiser

- How an edge is typed (`src/extract/resolve/determine-dependency-types.mjs`): a relative specifier is
  `local`; a tsconfig `paths` alias is `aliased-tsconfig` + `local`; a bare workspace name that resolves outside
  node_modules is `undetermined` with `combinedDependencies: false`, `aliased-workspace` with `true`.
  `workspace-imports-by-package-name` relies on exactly this.
- `aliased-workspace` needs the root manifest's `workspaces` as an ARRAY: `merge-manifests.mjs` concatenates
  it, so the object form (`{ packages, catalog }`) breaks detection. Put Bun's `catalog` at the top level.
- `$1`/`$2` in `to.path(Not)` come from groups in `from.path`. Every group referenced must always match:
  an optional alternation like `^(packages/([^/]+)/|apps/)` leaves `$2` empty for `apps/`.

## Bun

- `[install] exact = true` affects versions written by `bun add`. `linker = "isolated"` gives each workspace
  only what it declares, so every workspace declares its own devDependencies (`"vitest": "catalog:"`).
- Text `bun.lock` is the default since Bun 1.2. Retrofit repos may still have `bun.lockb`; detect both.

## Turborepo

- Internal packages export TS source and have no build. A `transit` task (`dependsOn: ["^transit"]`, no
  script anywhere) makes `typecheck`, `test:unit` and `build` re-run when a dependency's source changes.
- The lockfile and root package.json are already in the global hash; do not list them in `globalDependencies`.
- A workspace `turbo.json` uses `extends: ["//"]`. Its arrays REPLACE the root ones unless they start with
  `"$TURBO_EXTENDS$"`.

## Effect 4 (stable 4.1.x)

- `Either` is gone: use `Result`. Secrets: `Config.Redacted("KEY")` (PascalCase constructors:
  `Config.String`, `Config.Port`, ...). `Config.redacted` was v3 / the effect-smol beta.
- Pure modules allowed in `packages/core` are listed in the oxlint override; IO subpaths (`effect/http`,
  `effect/sql`, `effect/process`, ...) and `@effect/*` platform packages are blocked there.

## Stryker under the isolated linker

- Config lives in the package (`packages/core/stryker.config.mjs`) and runs from there, so the sandbox links
  that package's own `node_modules`.
- If the test runner cannot resolve the package's self-reference (`@org/core` from its own tests) inside the
  sandbox, do NOT add a hand-written alias to `src/`. Generate `resolve.alias` in `vitest.mutation.config.ts`
  from the package's own `exports` map, so `exports` stays the single source of truth.

## knip

- It accepts dependencies declared in an ancestor manifest, so it cannot prove each workspace declares its
  own workspace dependencies. `scripts/check-workspace-deps.mjs` does that.
- `includeEntryExports` + `includeSubpathExports` report unused exports of private packages' entry points.

## oxlint

- `options.typeAware: true` in `.oxlintrc.json` (oxlint ≥1.9x) plus `--type-aware` in the script. Without
  it, type-aware rules (`no-floating-promises`, `switch-exhaustiveness-check`, ...) are silently skipped.
