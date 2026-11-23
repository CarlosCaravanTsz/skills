---
name: setup-ts-quality-stack
description: Scaffold a new Bun + Turborepo TypeScript monorepo (apps/web, apps/api, packages/core, packages/ui) or retrofit an existing repo with the TypeScript-first quality stack. Includes oxfmt, type-aware oxlint, dependency-cruiser deep-module boundaries (package.json#exports as public API, SWC for TS 7), knip, a 5.5k-token file-size guard, staged-content git hooks, Vitest property and Stryker mutation testing, Turbo caching, CI, and a judgement-only CODING_STANDARDS.md. User-invoked.
disable-model-invocation: true
---

# Setup TypeScript Quality Stack

Leave the repo with a pipeline where every mechanical rule is enforced by a tool, and `CODING_STANDARDS.md` holds
only judgement. Target stack: Bun, Turborepo, TypeScript 7, Effect 4, oxlint/oxfmt, Vitest (optionally Next.js).

**Guiding rule (from `uncomplect`):** put each convention on the highest rung that can hold it: a **type/API**
that makes the mistake unwritable, then a **resolver/lint/boundary rule**, then a **written rule**. Keep one
paved path per concern. For deep-module vocabulary (module, interface, depth, seam, adapter), consult
`codebase-design`. Tool quirks and the pinned versions are in
[references/toolchain-notes.md](./references/toolchain-notes.md). Read it before changing any pin.

## 1. Inspect the repository and pick a mode

- **Greenfield**: no `package.json` and no source yet. Scaffold (step 2), then continue from step 4.
- **Retrofit**: an existing project. Skip step 2. Install (step 3) and **merge, never overwrite** (step 4).

For retrofit, determine:

- **Package manager & lockfile**: `bun.lock` or `bun.lockb` → bun, `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn,
  else npm. Break ties with `package.json#packageManager` and existing CI. Use the detected runner everywhere
  below (`bun run` / `pnpm run` / ...). Pass the lockfile name to the hooks (`LOCKFILE`, `RUN`).
- **Topology**: workspace monorepo (`apps/*` + `packages/*`, derived from the real workspace manifests, so keep
  any existing nesting) vs. single app with `src/packages/<name>/`.
- **Stack features**: Effect, Next.js/React, Tailwind v4 stylesheet path, SQL migrations dir, the pure package
  that gets the `core` purity rules and Stryker.
- **Vendor / generated paths**: copied UI libraries, build output, public worker bundles.
- **Existing configs**: `.dependency-cruiser.*` / `dependency-cruiser.config.*`, `.oxlintrc.json`,
  `.oxfmtrc.json`, `knip.json`, hooks, CI workflows, `package.json` scripts.

**Done when:** mode, package manager, topology, features, ignore paths and existing configs are known.

## 2. Greenfield: scaffold the monorepo

Copy [`templates/scaffold/`](./templates/scaffold/) to the repo root, **including dotfiles** (`.github/`,
`.gitignore`, `.node-version`, `.env.example`). Replace the `@org` scope everywhere (package names, imports,
oxfmt `internalPattern`, oxlint `@org/**`, `transpilePackages`). Then copy into the repo:

| Template | Destination |
| --- | --- |
| `oxfmtrc.json`, `oxlintrc.json` | `.oxfmtrc.json`, `.oxlintrc.json` |
| `dependency-cruiser.workspaces.cjs` | `.dependency-cruiser.cjs` |
| `knip.json` | `knip.json` |
| `check-file-size.mjs`, `check-workspace-deps.mjs`, `staged-files.mjs` | `scripts/` |
| `pre-commit`, `pre-push` | `.githooks/` (delete the migrations block from `pre-commit` if there is no DB) |
| `stryker.config.mjs`, `vitest.mutation.config.ts` | `packages/core/` |
| `packages-README.md` | `packages/README.md` |
| `CODING_STANDARDS.md` | `CODING_STANDARDS.md` |

What the scaffold gives you, so you don't re-derive it:

- **Pins**: `packageManager: "bun@x.y.z"`, exact versions in a **top-level `catalog`** (not inside
  `workspaces`, which must stay an array for dependency-cruiser), and each workspace declares its own deps as
  `"catalog:"` / `"workspace:*"`. This matters because `bunfig.toml` uses `linker = "isolated"`, so nothing is
  hoisted.
- **`bunfig.toml`**: `exact = true`, isolated linker, and `[test] root` pointed at a missing folder so `bun test`
  cannot run the Vitest suites.
- **`tsconfig.base.json`**: strict TS 7 rules. Each workspace sets `include`, `lib`, JSX and an **explicit
  `types`**. `exactOptionalPropertyTypes` may be turned off only in `apps/web` / `packages/ui`.
- **`turbo.json`**: a `transit` node, so `typecheck`, `test:unit` and `build` re-run when a source-only
  (just-in-time) package changes. `apps/web/turbo.json` extends the root to add `.next` outputs and `NEXT_PUBLIC_*` env.
- **Internal packages are just-in-time**: `exports` points at `.ts` source. `apps/api` runs on Bun, and
  `apps/web` lists them in `transpilePackages`.
- **Copy-me deep module**: `packages/core` (`src/index.ts` delegates to `src/lib/`; `test/*.test.ts` and
  `test/*.prop.test.ts` import only `@org/core`), with a real consumer in `apps/api` (decodes at the boundary
  with `effect/Schema`, config with `effect/Config` + `Config.Redacted`).

Run `bun install`, commit `bun.lock`, then go to step 4 (skip the retrofit-only parts).

**Done when:** `bun install` succeeds and `bun run typecheck` passes on the untouched scaffold.

## 3. Retrofit: install devDependencies

With the detected package manager, at the root: `oxfmt`, `oxlint`, `oxlint-tsgolint`, `dependency-cruiser`,
`@swc/core`, `knip` (+ `turbo` for workspace repos). In the pure package (or the root of a single-app repo):
`vitest`, `fast-check`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`. Under an isolated linker,
declare test tooling in **each** workspace that uses it.

**Done when:** every dependency is declared where it is used.

## 4. Configure formatting, linting, boundaries and dead code

Adapt from [`templates/`](./templates/). In retrofit, **merge** into existing files: keep their format, merge
rules by `name`, keep the repo's stricter settings, and report every conflict and effective change to the user.

1. **`.oxfmtrc.json`**: set `sortImports.internalPattern`; drop `sortTailwindcss` if there is no Tailwind.
2. **`.oxlintrc.json`**: keep `options.typeAware: true` and run `oxlint --type-aware`. Drop the
   `react`/`jsx-a11y`/`nextjs` plugins without React. Point the purity override at the real pure package. Add
   vendor paths to `ignorePatterns`.
3. **`.dependency-cruiser.cjs`**: use `dependency-cruiser.workspaces.cjs` for monorepos, or
   `dependency-cruiser.src-packages.cjs` (set `PACKAGES_ROOT`) for single-app repos.
   - Block 1 (interface rules) is generic: do not edit it.
   - Edit only block 2 (layering). Examples are in [references/layering-examples.md](./references/layering-examples.md).
   - Keep `parser: "swc"`, `tsPreCompilationDeps: false`, `combinedDependencies: false` and no `tsConfig` option.
     If an existing config has a different parser, switch it and tell the user (TS 7 has no compiler API).
4. **`knip.json`**: real workspaces, explicit `entry` for apps without a framework plugin,
   `includeEntryExports` / `includeSubpathExports` for private packages. Check that `turbo`,
   `oxlint-tsgolint` and `@swc/core` are not reported as unused.
5. **Scripts** (root `package.json`): `fmt`, `fmt:check`, `lint`, `lint:boundaries` (depcruise, then
   `-T json | node scripts/check-workspace-deps.mjs`), `lint:size`, `lint:deadcode`, `typecheck`, `test:unit`,
   `test:integration`, `test:mutate`.
   - `check:fast` = fmt:check → lint → lint:boundaries → lint:size → lint:deadcode → typecheck → test:unit.
   - `check` = check:fast + test:integration.
   - `prepare` = `git config core.hooksPath .githooks || true`.
   - Do not add tsconfig path aliases: workspaces import each other by package name only.

**Done when:** every config exists, matches the repo's real paths, and `check:fast` runs end to end.

## 5. Make every package a deep module

The public API of a package is its explicit `package.json#exports` (no `"./*"`). Every target is a root file of
`src/`, and there may be several small entry points (`index.ts`, `client.ts`, `server.ts`) instead of a barrel.
Everything in a `src/` subfolder is private. Packages are flat. Three mechanisms enforce this together:

- Another workspace may be imported **only by package name**: `workspace-imports-by-package-name` rejects
  relative paths and tsconfig aliases.
- `scripts/check-workspace-deps.mjs` requires each such import to be declared in the importer's **own**
  `package.json`. knip cannot do this, because it accepts ancestor manifests.
- The resolver honours `exports`, so a non-exported subpath fails `not-to-unresolvable`. `entrypoint-boundary`
  backs it up by path depth.

Package tests import their own package by name (`@org/core`), not `../src`. In retrofit, convert one existing
seam into this shape, or add a `packages/example/` only when the repo has no packages yet. Write
`packages/README.md` (≤40 lines, from `templates/packages-README.md`) at the real packages root.

**Done when:** each package exposes `exports`, its tests import it by name, and `lint:boundaries` passes.

## 6. File-size guard and git hooks

1. `scripts/check-file-size.mjs` (`chmod +x`): adapt `IGNORED_PREFIXES`. If legacy files exceed 22,000 bytes
   (~5,500 tokens), record their exact sizes in `scripts/file-size-allowlist.json` as a ratchet.
2. `.githooks/pre-commit` + `scripts/staged-files.mjs`: these check the **staged blobs** (NUL-delimited, read
   from the index):
   - blocked files: `.env` and `.env.*` except `.env.example`, build output, `(^|/).stryker-tmp/`;
   - a lockfile staged without any `package.json` change;
   - the token budget;
   - `oxfmt --check -c .oxfmtrc.json`.

   Keep or delete the forward-only migrations block in the shell hook.
3. `.githooks/pre-push`: runs `check:fast` with `RUN` (default `bun run`).
4. `chmod +x .githooks/* scripts/*.mjs`, then run `prepare`.

**Done when:** `git config core.hooksPath` is `.githooks` and both hooks are executable.

## 7. Advanced testing and CI

1. **Vitest is the only runner.** File suffixes: `*.test.ts` (unit), `*.prop.test.ts` (properties),
   `*.int.test.ts` (integration). Integration tests are excluded from `test:unit` and from mutation runs.
2. **Property tests**: at least one `*.prop.test.ts` with `fast-check` (or `effect/Arbitrary`) per pure package,
   on algebraic or state-machine invariants of the **public** behaviour.
3. **Stryker** lives in the pure package (`packages/core/stryker.config.mjs` + `vitest.mutation.config.ts`,
   `test:mutate` workspace script).
   - The config is `packageManager: "npm"` (the schema has no bun), `checkers: []`, and `"tsconfig.json"` in
     `ignorePatterns`. The mutation run is tsconfig-independent by design: read the header of the template.
   - In a retrofit with a hoisted `node_modules`, a root config is fine.
4. **Postgres/Supabase**: add real-schema invariant tests (RLS on, least-privilege grants, no float money).
5. **CI** (`templates/scaffold/.github/workflows/`): `ci.yml` does checkout → setup-bun (from `packageManager`)
   → setup-node (`.node-version`) → caches → `install --frozen-lockfile` → `check:fast` → `build`.
   `mutation.yml` runs on a schedule or manually, is non-blocking, and uses the same pins.

**Done when:** CI runs `check:fast` and `build`, and `test:mutate` runs without gating PRs.

## 8. Standards and context pointers

1. Copy `templates/CODING_STANDARDS.md` and fill in its project-specific Database & Security section.
   - Zero mechanical rules: anything automatable moves to tooling.
   - The template already carries the `uncomplect` judgement rules: behaviour defined once, pure core, deletability, retries, lifecycle.
2. In `CLAUDE.md` if it exists (else `AGENTS.md`, creating it), add one-line pointers:
   - `CODING_STANDARDS.md`;
   - `packages/README.md` ("Packages are deep modules: read it before adding or importing one");
   - the `uncomplect` / `codebase-design` skills for design reviews ("design it twice").

**Done when:** both files exist and the agent-instructions file links to them.

## 9. Prove every check bites (on a clean checkout)

A gate you have never seen fail is not a gate. Run each probe, watch it fail **with the named rule**, revert it,
and watch it pass. The skill is finished only when all of them have been observed.

1. **Install and build**: `install --frozen-lockfile`, then `check:fast` passes, then `build` passes for every app.
2. **Boundaries**: `lint:boundaries` reports more than one module per workspace (proves SWC parsed TS). Then:
   - `import … from "@org/core"` in `apps/api` **passes**; the same file imported by a relative path fails
     `workspace-imports-by-package-name`;
   - remove `@org/core` from `apps/api/package.json`: `check-workspace-deps` fails;
   - a test importing `../src/lib/…` fails `tests-through-entrypoints`;
   - importing an unexported subpath (`@org/core/lib/x`) fails `not-to-unresolvable`;
   - an `import type` into another package's `src/lib/` fails `entrypoint-boundary`;
   - a runtime cycle fails `no-circular`;
   - a layering breach (`packages/core` importing `@org/ui`) fails its layering rule.
3. **Size**: an oversized scratch file fails `lint:size` with the deep-module guidance. Delete it.
4. **Turbo cache**: run `typecheck`, `test:unit` and `build`, then edit only `packages/core/src`. The `apps/api`
   tasks must be cache **misses**.
5. **Stryker smoke**: from `packages/core`, run `stryker run --incremental false`.
   - `tsconfig.json` is absent from the sandbox.
   - A test importing `@org/core` kills a specific, named mutant of `core`.
6. **pre-commit**:
   - a partially staged file is judged by its staged content (stage a misformatted hunk while the working tree is clean);
   - a staged `.env` is blocked and `.env.example` is allowed;
   - `bun.lock` staged alone is blocked.

**Done when:** every probe above was observed failing for the right reason, every temporary change is reverted,
and `check:fast` passes cleanly.
