#!/usr/bin/env node
/**
 * ChatGPT → CHRONICLE import
 *
 * Reads OpenAI conversations.json export and writes .md session files
 * compatible with ctx-search indexing.
 *
 * How to export from ChatGPT:
 *   Settings → Data controls → Export data → conversations.json
 *
 * Usage:
 *   node chatgpt-import.js <conversations.json> <knowledge-repo-dir>
 *
 * Example:
 *   node chatgpt-import.js ~/Downloads/conversations.json ~/intenx-knowledge/
 */

import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { createHash } from 'crypto'
import { execSync } from 'child_process'

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

function fromUnix(secs) {
  if (!secs) return new Date().toISOString()
  return new Date(secs * 1000).toISOString()
}

// ── ChatGPT tree → linear messages ──────────────────────────────────────────
// ChatGPT stores messages as a tree (for branching). We follow the primary
// (first-child) path to get the linear conversation.

function flattenTree(mapping) {
  if (!mapping || Object.keys(mapping).length === 0) return []

  const messages = []
  const visited = new Set()

  // Find root: node with no parent
  let rootId = null
  for (const [id, node] of Object.entries(mapping)) {
    if (!node.parent) { rootId = id; break }
  }
  if (!rootId) rootId = Object.keys(mapping)[0]

  function traverse(id) {
    if (!id || visited.has(id)) return
    visited.add(id)
    const node = mapping[id]
    if (!node) return

    const msg = node.message
    if (msg && msg.author?.role && msg.author.role !== 'system') {
      const parts = msg.content?.parts ?? []
      const text = parts.filter(p => typeof p === 'string').join('\n\n').trim()
      if (text) {
        messages.push({
          role: msg.author.role,
          content: text,
          timestamp: fromUnix(msg.create_time),
          model: msg.metadata?.model_slug ?? null,
        })
      }
    }

    // Follow first child only (primary conversation path)
    const children = node.children ?? []
    if (children.length > 0) traverse(children[0])
  }

  traverse(rootId)
  return messages
}

// ── Markdown output (matches claude-code.js format for ctx-search) ────────────

function toMarkdown(conv) {
  const created = fromUnix(conv.create_time)
  const updated = fromUnix(conv.update_time)
  const messages = flattenTree(conv.mapping ?? {})

  const firstUser = messages.find(m => m.role === 'user')
  const title = conv.title || firstUser?.content?.split('\n')[0].slice(0, 80) || 'Untitled ChatGPT Session'
  const model = messages.find(m => m.model)?.model ?? 'unknown'

  const frontmatter = {
    id: conv.id,
    title,
    platform: 'chatgpt',
    platform_session_id: conv.id,
    created: created,
    updated: updated,
    flow_state: 'hypothesis',
    quality_score: null,
    tags: [],
    summary: '',
    model,
    message_count: messages.length,
    client: 'intenx',
    access_level: 'internal',
    data_classification: 'normal',
  }

  const fm = yaml.dump(frontmatter, { lineWidth: -1, noRefs: true })
  const lines = [`# ${title}`, '']

  for (const msg of messages) {
    const ts = msg.timestamp.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
    if (msg.role === 'assistant') {
      const modelSuffix = msg.model ? ` · ${msg.model}` : ''
      lines.push(`## Assistant · ${ts}${modelSuffix}`, '')
    } else {
      lines.push(`## User · ${ts}`, '')
    }
    lines.push(msg.content, '', '---', '')
  }

  return `---\n${fm}---\n\n${lines.join('\n')}`
}

// ── Main ─────────────────────────────────────────────────────────────────────

const [sourcePath, targetDir] = process.argv.slice(2)

if (!sourcePath || !targetDir) {
  console.error('Usage: chatgpt-import.js <conversations.json> <knowledge-repo-dir>')
  console.error('')
  console.error('Export from ChatGPT: Settings → Data controls → Export data → conversations.json')
  process.exit(1)
}

if (!fs.existsSync(sourcePath)) {
  console.error(`Source not found: ${sourcePath}`)
  process.exit(1)
}

if (!fs.existsSync(targetDir)) {
  console.error(`Target repo not found: ${targetDir}`)
  process.exit(1)
}

let data
try {
  data = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'))
} catch (err) {
  console.error(`Failed to parse ${sourcePath}: ${err.message}`)
  process.exit(1)
}

const conversations = Array.isArray(data) ? data : data.conversations ?? []
console.log(`Found ${conversations.length} conversations`)

let imported = 0, skipped = 0, failed = 0

for (const conv of conversations) {
  try {
    const created = fromUnix(conv.create_time)
    const [year, month] = created.slice(0, 7).split('-')

    const canonicalDir = path.join(targetDir, 'rcm', 'archive', 'canonical', year, month)
    fs.mkdirSync(canonicalDir, { recursive: true })

    const shortId = (conv.id ?? createHash('md5').update(JSON.stringify(conv)).digest('hex')).slice(0, 8)
    const title = conv.title || 'untitled'
    const slug = slugify(title)
    const filename = `${created.slice(0, 10)}_${slug}_${shortId}.md`
    const canonicalPath = path.join(canonicalDir, filename)

    if (fs.existsSync(canonicalPath)) { skipped++; continue }

    fs.writeFileSync(canonicalPath, toMarkdown(conv), 'utf-8')

    // Symlink into hypothesis flow (ctx-search indexes here)
    const flowDir = path.join(targetDir, 'rcm', 'flows', 'hypothesis')
    fs.mkdirSync(flowDir, { recursive: true })
    const linkPath = path.join(flowDir, filename)
    if (!fs.existsSync(linkPath)) {
      fs.symlinkSync(path.resolve(canonicalPath), linkPath)
    }

    imported++
    process.stdout.write(`✓ ${title.slice(0, 70)}\n`)
  } catch (err) {
    console.error(`✗ ${conv.id ?? 'unknown'}: ${err.message}`)
    failed++
  }
}

console.log(`\nDone: ${imported} imported, ${skipped} already existed, ${failed} failed`)

if (imported > 0) {
  try {
    execSync('git add rcm/', { cwd: targetDir, stdio: 'ignore' })
    execSync(`git commit -m "chore(chronicle): Import ${imported} ChatGPT conversations"`, { cwd: targetDir, stdio: 'inherit' })
    console.log('✓ Committed')
  } catch {
    console.warn('⚠ Git commit skipped (nothing staged or not a repo)')
  }
}
