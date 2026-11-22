---
name: setup-ts-quality-stack
description: Wire the TypeScript-first quality stack (oxfmt, oxlint type-aware, dependency-cruiser with SWC for TS 7, knip, 5.5k-token file-size guard, zero-dep git hooks, property-based & Stryker mutation testing, and judgement-only CODING_STANDARDS.md) into a repo. User-invoked.
disable-model-invocation: true
---

# Setup TypeScript Quality Stack

Install and verify a three-layer automated quality pipeline for TypeScript + Effect + `oxlint`/`oxfmt` repositories (with optional Next.js), leaving `CODING_STANDARDS.md` strictly for judgement and architectural rules.

For deep-module vocabulary (`module`, `interface`, `depth`, `seam`, `adapter`), consult `codebase-design`.

## 1. Inspect the repository

Determine these facts from the codebase before writing any file:

- **Package manager & lockfile**: `bun.lock` → `bun`, `pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, else `npm`.
- **Topology**: workspace monorepo (`packages/*` + `apps/*`) vs. single-app deep-modules (`src/packages/<name>/`).
- **Stack features**: Effect present? Next.js/React present? Tailwind CSS v4 stylesheet path? SQL migrations directory (e.g. `supabase/migrations`, `drizzle`)? Pure domain package path for Stryker & `no-restricted-imports`?
- **Vendor / generated paths**: copied UI libraries (e.g. `components/ui`, `components/reui`), build output dirs, public worker bundles.

**Done when:** package manager, topology, stack features, and ignore paths are known.

## 2. Install devDependencies

Install with the detected package manager:

- Core: `oxfmt`, `oxlint`, `oxlint-tsgolint` (if not already present), `dependency-cruiser`, `@swc/core`, `knip`.
- Advanced testing (when unit tests use Vitest): `fast-check`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`.

> **TS 7 (`tsgo`) requirement:** TypeScript 7 lacks the JS compiler API `dependency-cruiser` expects. Always install `@swc/core` and set `parser: "swc"` + `tsPreCompilationDeps: false` in `.dependency-cruiser.cjs`.

**Done when:** all required devDependencies are listed in root `package.json`.

## 3. Configure formatting, linting, boundaries, and dead code

Copy and adapt from [`templates/`](./templates/):

1. **`.oxfmtrc.json`** from [`templates/oxfmtrc.json`](./templates/oxfmtrc.json) — set `sortImports.internalPattern` (e.g. `["@org/", "@/"]`) and `sortTailwindcss` (omit if no Tailwind).
2. **`.oxlintrc.json`** from [`templates/oxlintrc.json`](./templates/oxlintrc.json) — remove `react`, `jsx-a11y`, `nextjs` plugins/rules if the repo has no React/Next.js; adapt the pure-domain `no-restricted-imports` override path; add vendor paths to `ignorePatterns`.
3. **`.dependency-cruiser.cjs`** — pick [`templates/dependency-cruiser.workspaces.cjs`](./templates/dependency-cruiser.workspaces.cjs) for workspace monorepos or [`templates/dependency-cruiser.src-packages.cjs`](./templates/dependency-cruiser.src-packages.cjs) for single-app repos. Keep `viaOnly: { dependencyTypesNot: ["type-only"] }` on `no-circular` so runtime cycles fail while type-only cycles are allowed.
4. **`knip.json`** from [`templates/knip.json`](./templates/knip.json) — list `@swc/core` in root `ignoreDependencies` and any system binaries in `ignoreBinaries`. Remove any redundant hints Knip reports.

**Done when:** all four config files exist and match the repo's real paths.

## 4. Add the 5.5k-token file-size guard and git hooks

1. Copy [`templates/check-file-size.mjs`](./templates/check-file-size.mjs) to `scripts/check-file-size.mjs` and mark executable (`chmod +x`). Update `IGNORED_PREFIXES` for vendor/generated dirs.
2. Run `node scripts/check-file-size.mjs`. If legacy files exceed 22,000 bytes (~5,500 tokens), record their exact current byte counts in `scripts/file-size-allowlist.json` as a ratchet (cannot grow by even 1 byte).
3. Copy [`templates/pre-commit`](./templates/pre-commit) and [`templates/pre-push`](./templates/pre-push) to `.githooks/`, mark executable (`chmod +x`), adapt the package runner, lockfile name, and migrations path.
4. Wire scripts in root `package.json`:
   - `prepare`: `git config core.hooksPath .githooks || true`
   - `fmt`, `fmt:check`, `lint`, `lint:boundaries`, `lint:size`, `lint:deadcode`, `typecheck`, `test:unit`, `test:mutate`
   - `check:fast`: `fmt:check && lint && typecheck && lint:boundaries && lint:size && lint:deadcode && test:unit`
   - `check`: `check:fast && test:integracion` (when integration tests exist)
5. Run `prepare` so `.githooks/` is active locally.

**Done when:** hooks are executable, `git config core.hooksPath` is `.githooks`, and `package.json` exposes `check:fast`.

## 5. Configure advanced testing and CI

1. Copy [`templates/stryker.config.mjs`](./templates/stryker.config.mjs) to `stryker.config.mjs`, pointing `mutate` exclusively at pure domain files and keeping `checkers: []` (for TS 7 compatibility). Copy [`templates/vitest.mutation.config.ts`](./templates/vitest.mutation.config.ts) so `vitest.related` only sees pure domain tests (no system binaries or databases). Add `reports/` and `.stryker-tmp/` to `.gitignore`.
2. Add at least one property-based test (`*.prop.test.ts`) exercising algebraic or state-machine invariants in the pure domain package using `fast-check` and/or Effect 4's `effect/Arbitrary`.
3. If the repo uses Postgres/Supabase, add real-schema invariant tests (RLS enabled, least-privilege role grants, no floating-point money columns).
4. Wire `check:fast` into the PR CI workflow, and add a non-blocking scheduled/manual mutation workflow (`.github/workflows/mutation.yml`).

**Done when:** `check:fast` runs in CI and mutation testing runs via `test:mutate` without blocking PRs.

## 6. Write `CODING_STANDARDS.md` and wire context pointers

1. Copy [`templates/CODING_STANDARDS.md`](./templates/CODING_STANDARDS.md) to `CODING_STANDARDS.md` at repo root and fill in the repo-specific Database & Security section. Keep zero mechanical rules in this file.
2. Add concise pointers in `AGENTS.md` (or `CLAUDE.md`) to `CODING_STANDARDS.md` and the quality stack doc.

**Done when:** `CODING_STANDARDS.md` exists with judgement-only rules and `AGENTS.md` links to it.

## 7. Prove every check bites

A gate you have never seen fail is not a gate. Before finishing:

1. Run `fmt` once, fix clean lint/dead-code findings, and observe `check:fast` **pass** completely.
2. Prove `lint:boundaries` **fails** on a forbidden cross-layer or deep import (and note module count > 1 to confirm SWC parsed TS files), then revert and observe pass.
3. Prove `lint:size` **fails** with deep-module guidance on an oversized scratch file, then delete it and observe pass.
4. Run a targeted Stryker smoke test (`stryker run --mutate <one-pure-file>`) to verify mutants run and are killed under Vitest + Node.

**Done when:** `check:fast` passes cleanly after every temporary test is reverted, and each gate was observed failing on a real violation.
