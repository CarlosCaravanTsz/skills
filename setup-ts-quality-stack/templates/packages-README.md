# Packages: deep modules

Each folder here is one package: a lot of behaviour behind a small interface. Packages are flat (a package
never contains another package); their internals may nest freely.

```
packages/<name>/
  package.json   "exports" lists the public entry points, explicitly (no "./*")
  src/index.ts   entry point  -> import "@org/<name>"
  src/client.ts  entry point  -> import "@org/<name>/client"  (several small entry points, no barrel)
  src/lib/       private implementation, free to import itself
  test/          tests + fixtures; they import "@org/<name>", like any consumer
```

Rules (all enforced by `bun run lint:boundaries`, dependency-cruiser + scripts/check-workspace-deps.mjs):

1. **Import another workspace only by package name** (`@org/core`), never by relative path or tsconfig alias,
   and declare it as `"@org/core": "workspace:*"` in the importing workspace's own package.json.
2. **Only exported entry points are public.** A subpath missing from `exports` does not resolve, and
   anything under `src/<subfolder>/` is private.
3. **Tests go through the entry points**, including the package's own tests. No reaching into `src/`.
4. **No runtime cycles.** Layering (which package may use which) is at the bottom of `.dependency-cruiser.cjs`.

Do not add barrel files that re-export a whole subtree. Add a focused entry point (a root file in `src/` plus
an `exports` key) instead. To start a package, copy `core/`'s shape: `src/index.ts` delegating to `src/lib/`,
plus `test/*.test.ts` and `test/*.prop.test.ts` that import only `@org/<name>`.
