#!/usr/bin/env node
/**
 * Enforces a per-file token budget (#tokens = ceil(bytes / 4) <= 5500, i.e. 22,000 bytes)
 * so every first-party source and test file fits comfortably in an agent context window.
 *
 * Usage:
 *   node scripts/check-file-size.mjs                  # scan entire repo
 *   node scripts/check-file-size.mjs path/a path/b    # check specific files
 *   FILE_SIZE_CONTENT_ROOT=/tmp/x node scripts/check-file-size.mjs path/a
 *     # paths stay repo-relative (allowlist keys), bytes are read from /tmp/x/<path>;
 *     # used by the pre-commit hook to measure STAGED blobs, not the working tree.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

const MAX_TOKENS = 5500
const BYTES_PER_TOKEN = 4
const MAX_BYTES = MAX_TOKENS * BYTES_PER_TOKEN // 22_000 bytes

const CHECKED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"])

const IGNORED_PREFIXES = [
  "node_modules/",
  ".git/",
  ".next/",
  ".agents/",
  ".claude/",
  ".stryker-tmp/",
  "coverage/",
  "reports/",
  "supabase/",
  "drizzle/",
  "apps/web/components/ui/",
  "apps/web/public/",
]

const IGNORED_FILENAMES = new Set(["next-env.d.ts"])

// Generated directories ignored at any depth (e.g. apps/web/.next, packages/core/.stryker-tmp).
const IGNORED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "coverage",
  "reports",
  ".stryker-tmp",
])

const ROOT = process.cwd()
const CONTENT_ROOT = process.env.FILE_SIZE_CONTENT_ROOT ?? ROOT
const ALLOWLIST_PATH = path.join(ROOT, "scripts", "file-size-allowlist.json")

/** @returns {Record<string, number>} */
const loadAllowlist = () => {
  if (!existsSync(ALLOWLIST_PATH)) return {}
  return JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"))
}

/** @param {string} relPath */
const shouldIgnore = (relPath) => {
  const normalized = relPath.replaceAll("\\", "/").replace(/^\.\//, "")
  if (IGNORED_FILENAMES.has(path.basename(normalized))) return true
  if (normalized.split("/").slice(0, -1).some((part) => IGNORED_DIR_NAMES.has(part))) return true
  if (IGNORED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true
  return !CHECKED_EXTENSIONS.has(path.extname(normalized))
}

/** @param {string} dir @param {string[]} out */
const walk = (dir, out) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    const rel = path.relative(ROOT, abs).replaceAll("\\", "/")
    if (entry.isDirectory()) {
      if (IGNORED_DIR_NAMES.has(entry.name) || IGNORED_PREFIXES.some((p) => `${rel}/`.startsWith(p))) {
        continue
      }
      walk(abs, out)
    } else if (entry.isFile() && !shouldIgnore(rel)) {
      out.push(rel)
    }
  }
}

const cliPaths = process.argv.slice(2)
const targets = []

if (cliPaths.length > 0) {
  for (const raw of cliPaths) {
    const rel = path.relative(ROOT, path.resolve(ROOT, raw)).replaceAll("\\", "/")
    if (!shouldIgnore(rel) && existsSync(path.resolve(CONTENT_ROOT, rel))) {
      targets.push(rel)
    }
  }
} else {
  walk(ROOT, targets)
}

const allowlist = loadAllowlist()
/** @type {Array<{ file: string; bytes: number; tokens: number; cap: number; isRatchet: boolean }>} */
const violations = []
/** @type {Array<{ file: string; bytes: number }>} */
const staleAllowlist = []

for (const rel of targets.sort()) {
  const bytes = statSync(path.resolve(CONTENT_ROOT, rel)).size
  const tokens = Math.ceil(bytes / BYTES_PER_TOKEN)
  const allowlistedBytes = allowlist[rel]

  if (typeof allowlistedBytes === "number") {
    if (bytes > allowlistedBytes) {
      violations.push({ file: rel, bytes, tokens, cap: allowlistedBytes, isRatchet: true })
    } else if (bytes <= MAX_BYTES) {
      staleAllowlist.push({ file: rel, bytes })
    }
    continue
  }

  if (bytes > MAX_BYTES) {
    violations.push({ file: rel, bytes, tokens, cap: MAX_BYTES, isRatchet: false })
  }
}

if (staleAllowlist.length > 0 && cliPaths.length === 0) {
  console.log("Notice: these allowlisted files are now under the 5.5k token limit — remove them from scripts/file-size-allowlist.json:")
  for (const item of staleAllowlist) {
    console.log(`  - ${item.file} (${item.bytes} B / ~${Math.ceil(item.bytes / BYTES_PER_TOKEN)} tokens)`)
  }
}

if (violations.length === 0) {
  process.exit(0)
}

console.error(
  `\nFile size check failed (budget: ${MAX_TOKENS} tokens ≈ ${MAX_BYTES.toLocaleString()} bytes at ${BYTES_PER_TOKEN} B/token).\n`,
)

for (const v of violations) {
  const capTokens = Math.ceil(v.cap / BYTES_PER_TOKEN)
  const label = v.isRatchet ? `ratchet cap ${v.cap} B (~${capTokens} tokens)` : `max ${v.cap} B (${MAX_TOKENS} tokens)`
  console.error(`  ✗ ${v.file}: ${v.bytes} B (~${v.tokens} tokens) exceeds ${label}`)
}

const hasProdViolation = violations.some((v) => !/(^tests?\/|\/tests?\/|\.test\.tsx?$)/.test(v.file))
const hasTestViolation = violations.some((v) => /(^tests?\/|\/tests?\/|\.test\.tsx?$)/.test(v.file))

console.error(`
How to split large files using Deep Modules (see CODING_STANDARDS.md & codebase-design):`)

if (hasProdViolation) {
  console.error(`
  For production files:
  1. Keep the public interface small — do NOT split by dumping functions into shallow "utils"/"helpers" or a giant re-export barrel.
  2. Find a cohesive responsibility (a sub-domain workflow, parser, state machine, or self-contained UI section) and extract it behind a narrow, meaningful seam (its own module with a small interface).
  3. Hide internal pieces in package-private submodules (e.g. sibling internal modules or a subfolder) while callers keep importing only the public entrypoint.
  4. Apply the deletion test: every new module must hide real complexity, not just forward parameters to another module.`)
}

if (hasTestViolation) {
  console.error(`
  For test / fixture files:
  1. Split test suites by behavior, command, or domain scenario rather than keeping one monolith.
  2. Keep shared builders/fixtures minimal and focused per domain slice; avoid a single catch-all fixture dump.`)
}

console.error("")
process.exit(1)
