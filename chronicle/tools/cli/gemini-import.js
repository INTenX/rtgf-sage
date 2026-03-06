#!/usr/bin/env node
/**
 * Gemini → CHRONICLE import
 *
 * Reads a Google Takeout Gemini export and writes .md session files
 * compatible with ctx-search indexing.
 *
 * How to export from Gemini:
 *   1. Go to https://takeout.google.com
 *   2. Deselect all → select "Gemini Apps Activity"
 *   3. Export → download ZIP → extract
 *   4. Find: "Takeout/Gemini Apps Activity/Gemini Apps Activity.json"
 *      (or multiple JSON files in that folder)
 *
 * Usage:
 *   node gemini-import.js <gemini-export.json> <knowledge-repo-dir>
 *   node gemini-import.js <gemini-export-dir/> <knowledge-repo-dir>
 *
 * Example:
 *   node gemini-import.js ~/Downloads/Gemini\ Apps\ Activity.json ~/intenx-knowledge/
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

function normalizeTs(ts) {
  if (!ts) return new Date().toISOString()
  if (typeof ts === 'number') return new Date(ts * 1000).toISOString()
  if (typeof ts === 'string') {
    // Already ISO
    if (ts.includes('T')) return ts
    return new Date(ts).toISOString()
  }
  return new Date().toISOString()
}

// ── Extract text from Gemini message structures ───────────────────────────────

function extractUserText(userQuery) {
  if (!userQuery) return null
  if (typeof userQuery === 'string') return userQuery
  return userQuery.text || userQuery.prompt || null
}

function extractAssistantText(response) {
  if (!response) return null
  if (typeof response === 'string') return response
  if (response.text) return response.text
  if (response.content) return response.content
  // Structured candidate format
  if (response.candidates?.length > 0) {
    const parts = response.candidates[0].content?.parts ?? []
    return parts.filter(p => p.text).map(p => p.text).join('\n\n') || null
  }
  return null
}

// ── Conversation → messages ───────────────────────────────────────────────────

function extractMessages(conv) {
  const messages = []
  const turns = conv.turns ?? conv.messages ?? []

  for (const turn of turns) {
    const ts = normalizeTs(turn.timestamp || turn.createTime || turn.create_time)

    const userText = extractUserText(turn.userQuery || turn.user_query || turn.input)
    if (userText) {
      messages.push({ role: 'user', content: userText, timestamp: ts })
    }

    const assistantText = extractAssistantText(turn.geminiResponse || turn.response || turn.output)
    if (assistantText) {
      messages.push({ role: 'assistant', content: assistantText, timestamp: ts })
    }
  }

  return messages
}

// ── Markdown output (matches claude-code.js format for ctx-search) ─────────────

function toMarkdown(conv, model) {
  const created = normalizeTs(conv.createTime || conv.create_time || conv.timestamp)
  const updated = normalizeTs(conv.updateTime || conv.update_time || created)
  const messages = extractMessages(conv)

  const firstUser = messages.find(m => m.role === 'user')
  const title = conv.title || firstUser?.content?.split('\n')[0].slice(0, 80) || 'Untitled Gemini Session'

  const frontmatter = {
    id: conv.conversationId || conv.id,
    title,
    platform: 'gemini',
    platform_session_id: conv.conversationId || conv.id,
    created: created,
    updated: updated,
    flow_state: 'hypothesis',
    quality_score: null,
    tags: [],
    summary: '',
    model: model || conv.model || 'gemini',
    message_count: messages.length,
    client: 'intenx',
    access_level: 'internal',
    data_classification: 'normal',
  }

  const fm = yaml.dump(frontmatter, { lineWidth: -1, noRefs: true })
  const lines = [`# ${title}`, '']

  for (const msg of messages) {
    const ts = msg.timestamp.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
    const roleLabel = msg.role === 'assistant' ? `Assistant (Gemini) · ${ts}` : `User · ${ts}`
    lines.push(`## ${roleLabel}`, '', msg.content, '', '---', '')
  }

  return `---\n${fm}---\n\n${lines.join('\n')}`
}

// ── Load source (file or directory) ──────────────────────────────────────────

function loadConversations(sourcePath) {
  const stat = fs.statSync(sourcePath)

  if (stat.isDirectory()) {
    // Load all JSON files in directory
    const files = fs.readdirSync(sourcePath).filter(f => f.endsWith('.json'))
    const all = []
    for (const f of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(sourcePath, f), 'utf-8'))
        const convs = Array.isArray(data) ? data : data.conversations ?? [data]
        all.push(...convs)
      } catch (err) {
        console.warn(`⚠ Skipping ${f}: ${err.message}`)
      }
    }
    return all
  }

  const data = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'))
  return Array.isArray(data) ? data : data.conversations ?? [data]
}

// ── Main ─────────────────────────────────────────────────────────────────────

const [sourcePath, targetDir] = process.argv.slice(2)

if (!sourcePath || !targetDir) {
  console.error('Usage: gemini-import.js <gemini-export.json|dir> <knowledge-repo-dir>')
  console.error('')
  console.error('Export from Gemini: takeout.google.com → Gemini Apps Activity')
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

let conversations
try {
  conversations = loadConversations(sourcePath)
} catch (err) {
  console.error(`Failed to load ${sourcePath}: ${err.message}`)
  process.exit(1)
}

console.log(`Found ${conversations.length} conversations`)

let imported = 0, skipped = 0, failed = 0

for (const conv of conversations) {
  try {
    const created = normalizeTs(conv.createTime || conv.create_time || conv.timestamp)
    const [year, month] = created.slice(0, 7).split('-')

    const canonicalDir = path.join(targetDir, 'rcm', 'archive', 'canonical', year, month)
    fs.mkdirSync(canonicalDir, { recursive: true })

    const convId = conv.conversationId || conv.id || createHash('md5').update(JSON.stringify(conv)).digest('hex')
    const shortId = convId.slice(0, 8)
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
    console.error(`✗ ${conv.conversationId ?? conv.id ?? 'unknown'}: ${err.message}`)
    failed++
  }
}

console.log(`\nDone: ${imported} imported, ${skipped} already existed, ${failed} failed`)

if (imported > 0) {
  try {
    execSync('git add rcm/', { cwd: targetDir, stdio: 'ignore' })
    execSync(`git commit -m "chore(chronicle): Import ${imported} Gemini conversations"`, { cwd: targetDir, stdio: 'inherit' })
    console.log('✓ Committed')
  } catch {
    console.warn('⚠ Git commit skipped (nothing staged or not a repo)')
  }
}
