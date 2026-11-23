# Skills
Skills for a TypeScript-native-first Software Factory in the age of AI.

- **setup-ts-quality-stack**: scaffolds a new Bun + Turborepo monorepo (`apps/web`, `apps/api`, `packages/core`, `packages/ui`) or retrofits an existing repo with the automated quality stack for Effect-based projects:
  - formatting (oxfmt) and type-aware linting (oxlint);
  - deep-module boundaries with dependency-cruiser, where `package.json#exports` is the public API;
  - dead-code detection (knip) and a 5.5k-token file-size guard;
  - pre-commit hooks that check the staged content, and a pre-push hook;
  - property-based (fast-check) and mutation (Stryker) testing;
  - Turbo caching and CI.

  `CODING_STANDARDS.md` is reserved for judgement rules.
