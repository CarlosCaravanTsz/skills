# Coding Standards

Judgement and architectural standards for this TypeScript + Effect + Oxlint/Oxfmt repository. Mechanical rules (formatting, import sorting, unused exports, file-size budget, module boundaries, type-aware lint, a11y, forward-only migrations) are enforced by tooling and intentionally omitted here.

**Where a rule lives.** Put each convention on the highest rung that can hold it: a type or API that makes the mistake impossible to write, then a lint/boundary rule, and only then a sentence in this file. If an item below can be automated, move it to tooling and delete it here. Keep one paved path per concern: when two ways to do the same thing exist, delete one.

## 1. Modularity & Deep Modules

- Design **deep modules** (`codebase-design` vocabulary): keep each package's public interface small and hide implementation complexity in internal modules.
- Apply the **deletion test**: avoid pass-through wrappers, shallow `utils`/`helpers` dumps, and giant re-export barrels. Expose focused entry points rather than forwarding an entire subtree blindly.
- When splitting a file to stay within the 5.5k-token budget, extract a cohesive workflow, parser, state machine, or UI section behind a narrow seam instead of slicing arbitrarily.
- **Define behaviour once, derive the interfaces.** A rule lives in one place (`packages/core`) with its input, output and failures as schemas/types. HTTP routes, UI actions, CLI commands and agent tools are thin adapters that decode, delegate and encode; they never re-implement the rule.
- **Optimize for deletion.** Each unit owns its configuration, env contract, storage and tests, so deleting its folder deletes all of it and the compiler names every caller. If a unit could not be rewritten from its contracts and tests in about a week, find the hidden dependency or shared state that makes it dangerous and cut it.
- **Design it twice** for consequential seams: sketch two materially different interfaces and compare caller burden, hidden knowledge and what each one lets you delete (see the `uncomplect` and `codebase-design` skills).

## 2. Type-System Discipline (TS 7 + Effect 4)

- **Make impossible states unrepresentable.** Model variants with discriminated unions (`Schema.TaggedStruct` / `Data.TaggedError` using `_tag`; `Result`, not the removed `Either`) rather than boolean + optional-field bags. Handle variants exhaustively with `Match.valueTags` / `Match.exhaustive` or exhaustive `switch`.
- **Constructive modeling & simplest total type.** Prefer shapes where invalid values cannot be constructed (`Array.NonEmptyReadonlyArray`, `start + duration` instead of commented invariants). Keep plain `ReadonlyArray<T>` while operations stay total; strengthen types only when a loose type forces `!`, a cast, or a "should never happen" throw.
- **Brand domain primitives at boundaries.** Use `Schema.brand` / `effect/Brand` for domain IDs and constrained scalars (never hand-rolled `__brand` intersections or `as` casts).
- **Parse once at the boundary with `effect/Schema`.** Validate all external input (`unknown` — HTTP payloads, DB rows, env vars, files, JSON) via `Schema.decodeUnknown*` and derive TypeScript types directly from the schema (`typeof S.Type`, `Pick`, `Omit`). Never maintain a duplicate interface and hand-written type guard that can drift. Trust decoded domain types internally.
- **No `as` casts to silence the compiler.** Follow the narrowing hierarchy: discriminant switch → `in` → `typeof`/`instanceof` → `effect/Schema` or a verifying type guard → `satisfies`. A type guard must verify every field it claims.
- **Use object arguments** when a function takes two or more parameters of the same or non-obvious types (skip in tight hot loops or low-level parsers).

## 3. Effect 4 Discipline

- **Pure core (`R = never`).** `packages/core` holds pure business logic with zero IO, services, layers, config, or implicit clocks. Pass time, configuration, and loaded aggregates explicitly.
- **Effect at effectful boundaries only.** Write pure decisions as plain functions over tagged values; do not wrap pure rules in `Effect.gen` to look sophisticated. Database, network, filesystem, clock, configuration and provider work go behind named services.
- **Retries and transactions.** Retry only typed transient failures, and only when the operation is proven idempotent. Keep provider/network calls outside authoritative database transactions.
- **Explicit lifecycle only when time is essential.** Use an explicit state machine when modes change which events are legal, or when work needs cancellation, retries, resumability or child work. Keep guards pure and synchronous, keep effects in invoked actors/services, and normalize persisted state before it gains authority. Parsing, validation and one-shot migrations stay plain functions.
- **Typed errors vs. defects.** Expected domain and API failures belong in the typed error channel (`Data.TaggedError` / `Schema.TaggedError`). Reserve `Effect.die` and untyped throws strictly for unrecoverable invariants or programmer bugs.
- **No `Effect.runPromise` / `Effect.runSync` inside libraries or services.** Execute effects only at top-level runtime edges (HTTP handlers, worker entrypoints, UI API client edge, tests).
- **Config at startup.** Decode each app's configuration once at startup with `effect/Config` against its `.env.example` contract; secrets are `Config.Redacted`, browser-visible keys are declared separately.
- **Scoped resources & structured telemetry.** Manage resource lifecycles with `Effect.acquireRelease` and scoped `Layer`s. Emit backend/worker logs through `Effect.log*` with structured annotations rather than `console.*`.

## 4. Web / UI Discipline (if applicable)

- **Contract-first data flow.** Route business reads and mutations through the typed API contract rather than bypassing auth/audit middleware with ad-hoc endpoints or direct DB calls from UI components.
- **Crisp Server/Client seams.** Push `"use client"` as low in the component tree as practical; keep server-only code out of client bundles.
- **Explicit UI states & design tokens.** Handle loading, empty, and error states explicitly on every data-driven screen. Use semantic design tokens rather than hardcoded hex colors or static inline `style` objects.

## 5. Testing & Verification Discipline

- **Test through the interface.** Assert observable behavior and contracts rather than private internals. Do not mock what you own: test pure domain logic directly and run integration tests against real infrastructure layers.
- **Property-based testing for pure invariants.** Use `fast-check` and/or Effect 4 `effect/Arbitrary` for algebraic and state-machine invariants (idempotence, order invariance, round-trips, precedence rules) in pure core modules.
- **Real schema invariants.** Keep database security and structural guarantees verified against the real migrated schema.

## 6. Database & Security Discipline (Project-specific — customize per repo)

- **Parameterized SQL only.** Never build queries with string concatenation or raw interpolation.
- **Forward-only migrations.** Never edit or delete migrations already merged to the default branch; add a new migration instead.
- **Least privilege & no PII in logs.** Enforce role-level DB permissions and RLS where supported; log domain IDs and structured error tags, never credentials, tokens, or PII.
