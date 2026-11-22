# Coding Standards

Judgement and architectural standards for this TypeScript + Effect + Oxlint/Oxfmt repository. Mechanical rules (formatting, import sorting, unused exports, file-size budget, module boundaries, type-aware lint, a11y, forward-only migrations) are enforced by tooling and intentionally omitted here.

## 1. Modularity & Deep Modules

- Design **deep modules** (`codebase-design` vocabulary): keep each package's public interface small and hide implementation complexity in internal modules.
- Apply the **deletion test**: avoid pass-through wrappers, shallow `utils`/`helpers` dumps, and giant re-export barrels. Expose focused entry points rather than forwarding an entire subtree blindly.
- When splitting a file to stay within the 5.5k-token budget, extract a cohesive workflow, parser, state machine, or UI section behind a narrow seam instead of slicing arbitrarily.

## 2. Type-System Discipline (TS 7 + Effect 4)

- **Make impossible states unrepresentable.** Model variants with discriminated unions (`Schema.TaggedStruct` / `Data.TaggedError` using `_tag`) rather than boolean + optional-field bags. Handle variants exhaustively with `Match.valueTags` / `Match.exhaustive` or exhaustive `switch`.
- **Constructive modeling & simplest total type.** Prefer shapes where invalid values cannot be constructed (`Array.NonEmptyReadonlyArray`, `start + duration` instead of commented invariants). Keep plain `ReadonlyArray<T>` while operations stay total; strengthen types only when a loose type forces `!`, a cast, or a "should never happen" throw.
- **Brand domain primitives at boundaries.** Use `Schema.brand` / `effect/Brand` for domain IDs and constrained scalars (never hand-rolled `__brand` intersections or `as` casts).
- **Parse once at the boundary with `effect/Schema`.** Validate all external input (`unknown` — HTTP payloads, DB rows, env vars, files, JSON) via `Schema.decodeUnknown*` and derive TypeScript types directly from the schema (`typeof S.Type`, `Pick`, `Omit`). Never maintain a duplicate interface and hand-written type guard that can drift. Trust decoded domain types internally.
- **No `as` casts to silence the compiler.** Follow the narrowing hierarchy: discriminant switch → `in` → `typeof`/`instanceof` → `effect/Schema` or a verifying type guard → `satisfies`. A type guard must verify every field it claims.
- **Use object arguments** when a function takes two or more parameters of the same or non-obvious types (skip in tight hot loops or low-level parsers).

## 3. Effect 4 Discipline

- **Pure domain (`R = never`).** Domain packages hold pure business logic with zero IO, services, layers, or implicit clocks. Pass time, configuration, and loaded aggregates explicitly.
- **Typed errors vs. defects.** Expected domain and API failures belong in the typed error channel (`Data.TaggedError` / `Schema.TaggedError`). Reserve `Effect.die` and untyped throws strictly for unrecoverable invariants or programmer bugs.
- **No `Effect.runPromise` / `Effect.runSync` inside libraries or services.** Execute effects only at top-level runtime edges (HTTP handlers, worker entrypoints, UI API client edge, tests).
- **Scoped resources & structured telemetry.** Manage resource lifecycles with `Effect.acquireRelease` and scoped `Layer`s. Emit backend/worker logs through `Effect.log*` with structured annotations rather than `console.*`.

## 4. Web / UI Discipline (if applicable)

- **Contract-first data flow.** Route business reads and mutations through the typed API contract rather than bypassing auth/audit middleware with ad-hoc endpoints or direct DB calls from UI components.
- **Crisp Server/Client seams.** Push `"use client"` as low in the component tree as practical; keep server-only code out of client bundles.
- **Explicit UI states & design tokens.** Handle loading, empty, and error states explicitly on every data-driven screen. Use semantic design tokens rather than hardcoded hex colors or static inline `style` objects.

## 5. Testing & Verification Discipline

- **Test through the interface.** Assert observable behavior and contracts rather than private internals. Do not mock what you own: test pure domain logic directly and run integration tests against real infrastructure layers.
- **Property-based testing for pure invariants.** Use `fast-check` and/or Effect 4 `effect/Arbitrary` for algebraic and state-machine invariants (idempotence, order invariance, round-trips, precedence rules) in pure domain modules.
- **Real schema invariants.** Keep database security and structural guarantees verified against the real migrated schema.

## 6. Database & Security Discipline (Project-specific — customize per repo)

- **Parameterized SQL only.** Never build queries with string concatenation or raw interpolation.
- **Forward-only migrations.** Never edit or delete migrations already merged to the default branch; add a new migration instead.
- **Least privilege & no PII in logs.** Enforce role-level DB permissions and RLS where supported; log domain IDs and structured error tags, never credentials, tokens, or PII.
