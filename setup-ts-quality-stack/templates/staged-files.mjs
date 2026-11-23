#!/usr/bin/env node
/**
 * Pre-commit checks on the STAGED content (the index), not the working tree, so a partially staged
 * file is judged by what will actually be committed. Paths are NUL-delimited end to end (POSIX `sh`
 * cannot hold NULs and `grep -z` is not portable), so unusual filenames are safe.
 *
 *   1. Block generated and local-only files (.env / .env.* except .env.example, build output, reports).
 *   2. Block a lockfile staged without any package.json change (override: ALLOW_LOCKFILE_ONLY=1).
 *   3. Token budget (scripts/check-file-size.mjs) on the staged blobs.
 *   4. `oxfmt --check` on the staged blobs, with the repo's .oxfmtrc.json.
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

const ROOT = process.cwd()
const LOCKFILES = ["bun.lock", "bun.lockb", "pnpm-lock.yaml", "yarn.lock", "package-lock.json"]
const FORMATTABLE = /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|css|html)$/
const FORBIDDEN = [
  /(^|\/)\.next\//,
  /(^|\/)\.turbo\//,
  /(^|\/)dist\//,
  /(^|\/)coverage\//,
  /(^|\/)reports\//,
  /(^|\/)\.stryker-tmp\//,
  /\.tsbuildinfo$/,
  /(^|\/)signing_keys\.json$/,
]

/** @param {string} file */
const isLocalEnvFile = (file) => {
  const base = path.posix.basename(file)
  return /^\.env(\..+)?$/.test(base) && base !== ".env.example"
}

/** @param {string[]} args @param {import("node:child_process").SpawnSyncOptions} [options] */
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: "inherit", ...options })
  if (result.error) throw result.error
  return result.status ?? 1
}

const listed = spawnSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], {
  encoding: "utf8",
})
if (listed.status !== 0) {
  console.error(listed.stderr)
  process.exit(1)
}
const staged = listed.stdout.split("\0").filter(Boolean)
if (staged.length === 0) process.exit(0)

// 1. Generated / local-only files
const forbidden = staged.filter((file) => isLocalEnvFile(file) || FORBIDDEN.some((re) => re.test(file)))
if (forbidden.length > 0) {
  console.error("✗ Pre-commit blocked: generated or local-only files are staged:")
  for (const file of forbidden) console.error(`  - ${file}`)
  console.error("  Unstage them (git restore --staged <file>). Commit .env.example as the env contract instead.")
  process.exit(1)
}

// 2. Lockfile coherence
if (process.env.ALLOW_LOCKFILE_ONLY !== "1") {
  const lockfile = process.env.LOCKFILE ?? LOCKFILES.find((name) => existsSync(path.join(ROOT, name)))
  const hasLock = lockfile !== undefined && staged.includes(lockfile)
  const hasManifest = staged.some((file) => path.posix.basename(file) === "package.json")
  if (hasLock && !hasManifest) {
    console.error(`✗ Pre-commit blocked: ${lockfile} is staged without any package.json change.`)
    console.error("  Override if intentional: ALLOW_LOCKFILE_ONLY=1 git commit ...")
    process.exit(1)
  }
}

// 3 + 4. Materialize the staged blobs and check them
const snapshot = mkdtempSync(path.join(tmpdir(), "staged-"))
try {
  const checkout = spawnSync("git", ["checkout-index", `--prefix=${snapshot}/`, "-f", "-z", "--stdin"], {
    input: `${staged.join("\0")}\0`,
    stdio: ["pipe", "inherit", "inherit"],
  })
  if (checkout.status !== 0) process.exit(1)

  const sizeStatus = run(process.execPath, [path.join(ROOT, "scripts", "check-file-size.mjs"), ...staged], {
    env: { ...process.env, FILE_SIZE_CONTENT_ROOT: snapshot },
  })
  if (sizeStatus !== 0) process.exit(sizeStatus)

  const formattable = staged.filter((file) => FORMATTABLE.test(file))
  if (formattable.length > 0) {
    const oxfmt = path.join(ROOT, "node_modules", ".bin", "oxfmt")
    const config = path.join(ROOT, ".oxfmtrc.json")
    const fmtStatus = run(oxfmt, ["--check", "-c", config, "--no-error-on-unmatched-pattern", ...formattable], {
      cwd: snapshot,
    })
    if (fmtStatus !== 0) {
      console.error("✗ Staged content is not formatted. Run the `fmt` script, then re-stage.")
      process.exit(fmtStatus)
    }
  }
} finally {
  rmSync(snapshot, { recursive: true, force: true })
}
