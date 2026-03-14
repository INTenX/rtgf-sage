#!/usr/bin/env node
// prune-hypothesis — auto-prune stale hypothesis sessions from CHRONICLE
//
// A hypothesis session is "stale" if:
//   - flow_state is still "hypothesis"
//   - created date is older than --age-days (default: 30)
//   - quality_score is null or < 0 (never curated)
//   - summary is empty (never reviewed)
//
// What "prune" does:
//   - git mv hypothesis/ → archive/  (preserves git history)
//   - Updates flow_state: hypothesis → archived in frontmatter
//   - Writes a prune-log entry
//
// Usage:
//   node prune-hypothesis.js [--target /path/to/knowledge] [--age-days 30] [--dry-run]
//
// Run via cron:
//   0 4 * * 0 node ~/rtgf-ai-stack/chronicle/tools/cli/prune-hypothesis.js --target ~/intenx-knowledge >> ~/.chronicle-lancedb/prune.log 2>&1

'use strict'

const fs   = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
let TARGET   = path.join(process.env.HOME, 'intenx-knowledge')
let AGE_DAYS = 30
let DRY_RUN  = false

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--target')   { TARGET   = args[++i]; continue }
  if (args[i] === '--age-days') { AGE_DAYS = parseInt(args[++i], 10); continue }
  if (args[i] === '--dry-run')  { DRY_RUN  = true; continue }
}

const HYPOTHESIS_DIR = path.join(TARGET, 'rcm', 'flows', 'hypothesis')
const ARCHIVE_DIR    = path.join(TARGET, 'rcm', 'flows', 'archive')
const LOG_FILE       = path.join(process.env.HOME, '.chronicle-lancedb', 'prune.log')

const now     = Date.now()
const ageCutoff = now - AGE_DAYS * 24 * 60 * 60 * 1000

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return {}
  const fm = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (kv) fm[kv[1]] = kv[2].replace(/^'|'$/g, '').replace(/^"|"$/g, '').trim()
  }
  return fm
}

function setFrontmatterField(content, field, value) {
  return content.replace(
    new RegExp(`^(${field}:).*$`, 'm'),
    `$1 '${value}'`
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log(`=== prune-hypothesis: ${new Date().toISOString()} ===`)
console.log(`Target: ${TARGET}`)
console.log(`Age threshold: ${AGE_DAYS} days`)
if (DRY_RUN) console.log('DRY RUN — no changes')

if (!fs.existsSync(HYPOTHESIS_DIR)) {
  console.log(`Hypothesis dir not found: ${HYPOTHESIS_DIR}`)
  process.exit(0)
}

fs.mkdirSync(ARCHIVE_DIR, { recursive: true })
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true })

const files = fs.readdirSync(HYPOTHESIS_DIR).filter(f => f.endsWith('.md'))
console.log(`Found ${files.length} hypothesis sessions`)

let pruned = 0
let skipped = 0
const pruneLog = []

for (const file of files) {
  const srcPath = path.join(HYPOTHESIS_DIR, file)
  const content = fs.readFileSync(srcPath, 'utf8')
  const fm = parseFrontmatter(content)

  // Parse created date
  const created = new Date(fm.created || 0).getTime()
  if (!created || created > ageCutoff) {
    skipped++
    continue
  }

  // Skip if it has been curated (has summary or positive quality score)
  const hasSummary = fm.summary && fm.summary.trim() && fm.summary !== "''"
  const qualityScore = parseFloat(fm.quality_score)
  if (hasSummary || (!isNaN(qualityScore) && qualityScore >= 0)) {
    skipped++
    continue
  }

  const ageDays = Math.round((now - created) / (24 * 60 * 60 * 1000))
  console.log(`  [prune] ${file} (${ageDays}d old, no curation)`)

  if (!DRY_RUN) {
    // Update flow_state in frontmatter
    const updated = setFrontmatterField(
      setFrontmatterField(content, 'flow_state', 'archived'),
      'updated', new Date().toISOString()
    )

    const dstPath = path.join(ARCHIVE_DIR, file)

    // Use git mv if in a git repo, else plain fs.rename
    try {
      execSync(`git -C "${TARGET}" mv "${srcPath}" "${dstPath}"`, { stdio: 'pipe' })
    } catch {
      fs.renameSync(srcPath, dstPath)
    }

    // Write updated frontmatter to destination
    fs.writeFileSync(dstPath, updated, 'utf8')

    pruneLog.push({
      file,
      pruned_at: new Date().toISOString(),
      age_days: ageDays,
      reason: 'stale-hypothesis',
    })
  }

  pruned++
}

console.log(`Pruned: ${pruned}  Skipped: ${skipped}`)

if (!DRY_RUN && pruneLog.length > 0) {
  // Commit the prune
  try {
    execSync(
      `git -C "${TARGET}" commit -am "chore(chronicle): auto-prune ${pruneLog.length} stale hypothesis sessions older than ${AGE_DAYS}d"`,
      { stdio: 'pipe' }
    )
    console.log('Git commit: done')
  } catch (err) {
    console.warn('Git commit failed (may have nothing to commit):', err.message)
  }

  // Append to prune log
  const logEntry = `[${new Date().toISOString()}] pruned=${pruneLog.length} age_days=${AGE_DAYS}\n`
  fs.appendFileSync(LOG_FILE, logEntry)
}

console.log(`=== done ===`)
