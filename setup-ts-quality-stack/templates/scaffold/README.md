# <project>

Bun + Turborepo monorepo. TypeScript 7, Effect 4, oxlint/oxfmt, dependency-cruiser, knip, Vitest, Stryker.

## Layout

```
apps/       deployable units (web: Next.js, api: Bun HTTP). Each owns its package.json, tsconfig, .env.example.
packages/   shared deep modules. Public API = package.json#exports. See packages/README.md.
```

Deleting a workspace folder deletes everything it owns; `typecheck`, `lint:boundaries` and `knip` then name
every remaining usage.

## Commands

| Command | What it does |
| --- | --- |
| `bun install` | Install (isolated linker; versions pinned in the root `catalog`). |
| `bun run dev` | Run every app in watch mode. |
| `bun run check:fast` | The gate CI and pre-push run: format, lint, boundaries, size, dead code, typecheck, unit tests. |
| `bun run check` | `check:fast` plus integration tests (`*.int.test.ts`). |
| `bun run test:mutate` | Stryker mutation testing on the pure packages (non-blocking in CI). |

## Paved path (one way to do each thing)

- Package manager: Bun, one committed `bun.lock`, `bun install --frozen-lockfile` in CI.
- Versions: exact, declared once in the root `catalog`, referenced as `"catalog:"` by each workspace.
- Format: oxfmt. Lint: oxlint (type-aware). Boundaries: dependency-cruiser. Dead code: knip.
- Tests: Vitest only (`bun test` is disabled on purpose). Unit `*.test.ts`, properties `*.prop.test.ts`,
  integration `*.int.test.ts`.
- Env: each app's `.env.example` is its contract; config is decoded at startup with `effect/Config`.

Judgement rules that tooling cannot enforce live in [CODING_STANDARDS.md](./CODING_STANDARDS.md).
