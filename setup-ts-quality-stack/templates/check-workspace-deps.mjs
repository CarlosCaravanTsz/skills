#!/usr/bin/env node
/**
 * Fails when a workspace imports another workspace by package name without declaring it in its OWN
 * package.json. Knip cannot catch this: it accepts dependencies declared in an ancestor manifest, and a
 * hoisted node_modules makes the import resolve anyway.
 *
 * Reads dependency-cruiser JSON on stdin:
 *   depcruise apps packages -c .dependency-cruiser.cjs -T json | node scripts/check-workspace-deps.mjs
 */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const DEP_KEYS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]

/** @param {string} file */
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"))

/** Expand the root `workspaces` globs (supports "dir/*" and exact folders). */
const workspaceDirs = () => {
  const rootPkg = readJson(path.join(ROOT, "package.json"))
  const globs = Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : (rootPkg.workspaces?.packages ?? [])
  /** @type {string[]} */
  const dirs = []
  for (const glob of globs) {
    if (glob.endsWith("/*")) {
      const parent = glob.slice(0, -2)
      if (!existsSync(path.join(ROOT, parent))) continue
      for (const entry of readdirSync(path.join(ROOT, parent), { withFileTypes: true })) {
        if (entry.isDirectory()) dirs.push(`${parent}/${entry.name}`)
      }
    } else {
      dirs.push(glob.replace(/\/$/, ""))
    }
  }
  return dirs.filter((dir) => existsSync(path.join(ROOT, dir, "package.json")))
}

/** @type {Array<{ dir: string; name: string; declared: Set<string> }>} */
const workspaces = workspaceDirs().map((dir) => {
  const pkg = readJson(path.join(ROOT, dir, "package.json"))
  const declared = new Set(DEP_KEYS.flatMap((key) => Object.keys(pkg[key] ?? {})))
  return { dir, name: pkg.name, declared }
})

/** @param {string} file */
const owner = (file) => {
  const normalized = file.replaceAll("\\", "/")
  return workspaces.find((ws) => normalized.startsWith(`${ws.dir}/`))
}

/** @param {string} specifier */
const isRelative = (specifier) => specifier.startsWith(".") || specifier.startsWith("/")

const input = readFileSync(0, "utf8")
if (input.trim() === "") {
  console.error("check-workspace-deps: no dependency-cruiser JSON on stdin.")
  process.exit(2)
}
const { modules } = JSON.parse(input)

/** @type {Map<string, Set<string>>} */
const missing = new Map()

for (const mod of modules) {
  const from = owner(mod.source)
  if (!from) continue
  for (const dep of mod.dependencies ?? []) {
    if (dep.couldNotResolve || dep.coreModule || isRelative(dep.module)) continue
    const to = owner(dep.resolved)
    if (!to || to === from) continue
    // Compare by the TARGET's package name, so "@org/core/client" counts as "@org/core".
    if (!from.declared.has(to.name)) {
      const key = `${from.dir}/package.json`
      if (!missing.has(key)) missing.set(key, new Set())
      missing.get(key)?.add(`${to.name}  (imported in ${mod.source} as "${dep.module}")`)
    }
  }
}

if (missing.size === 0) {
  console.log(`check-workspace-deps: ${workspaces.length} workspaces, all cross-workspace imports declared.`)
  process.exit(0)
}

console.error("\n✗ Workspace imports missing from the importing workspace's package.json:\n")
for (const [manifest, deps] of missing) {
  console.error(`  ${manifest}`)
  for (const dep of deps) console.error(`    - ${dep}`)
}
console.error('\n  Add each one as "<name>": "workspace:*" in that package.json.\n')
process.exit(1)
