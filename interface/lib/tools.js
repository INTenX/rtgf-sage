'use strict'

const { execSync, spawn } = require('child_process')
const path = require('path')

const STACK_ROOT = path.join(__dirname, '../..')

// Run wsl-audit with the given subcommand, return output string
function wslAudit(subcommand = 'risks') {
  try {
    return execSync(`wsl-audit ${subcommand}`, {
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        TERM: 'dumb',  // suppress ANSI colors
        PATH: `${process.env.HOME}/.local/bin:${process.env.PATH || '/usr/local/bin:/usr/bin:/bin'}`
      }
    })
  } catch (err) {
    // wsl-audit exits non-zero when warnings found — capture output anyway
    return err.stdout || err.message
  }
}

// Trigger an Ollama model pull via the API
async function pullModel(modelName) {
  const { default: fetch } = await import('node-fetch').catch(() => ({ default: globalThis.fetch }))
  const ollamaBase = process.env.OLLAMA_API_BASE ?? 'http://172.27.96.1:11434'
  const res = await fetch(`${ollamaBase}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName, stream: false }),
    signal: AbortSignal.timeout(5000)  // don't wait for full download
  })
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`)
  return `Pull started for ${modelName} — check Ollama for progress.`
}

// List models currently loaded in Ollama
async function ollamaModels() {
  const { default: fetch } = await import('node-fetch').catch(() => ({ default: globalThis.fetch }))
  const ollamaBase = process.env.OLLAMA_API_BASE ?? 'http://172.27.96.1:11434'
  const res = await fetch(`${ollamaBase}/api/tags`, {
    signal: AbortSignal.timeout(5000)
  })
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`)
  const data = await res.json()
  return data.models?.map(m => `• ${m.name}  (${(m.size / 1e9).toFixed(1)}GB)`) ?? []
}

// Run CHRONICLE import for a given session file or all pending
function loreImport(target = '') {
  try {
    const cmd = target
      ? `ctx-import --source ${target} --platform claude-code`
      : 'ctx-import --auto'
    return execSync(cmd, {
      encoding: 'utf8',
      timeout: 60000,
      cwd: path.join(STACK_ROOT, 'chronicle')
    })
  } catch (err) {
    return err.stdout || err.message
  }
}

// Summarise yesterday's WARD audit log
// Returns a formatted string for Telegram
function wardDigest(date = null) {
  const fs = require('fs')
  const os = require('os')

  const target = date ?? (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  })()

  const logPath = `${os.homedir()}/.claude/audit/${target}.jsonl`

  let total = 0, blocked = 0, warned = 0
  const blockCounts = {}
  const warnCounts = {}

  try {
    const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const obj = JSON.parse(line)
        if (obj.event !== 'pre_tool_use') continue
        total++
        if (obj.blocked) {
          blocked++
          const id = obj.block_id ?? 'unknown'
          blockCounts[id] = (blockCounts[id] ?? 0) + 1
        } else if (obj.severity === 'warn') {
          warned++
          const id = obj.block_id ?? 'warn'
          warnCounts[id] = (warnCounts[id] ?? 0) + 1
        }
      } catch { /* skip malformed lines */ }
    }
  } catch {
    return `No WARD audit log found for ${target}.`
  }

  const lines = [`*WARD Audit — ${target}*`, `Tool calls: ${total}`]

  if (blocked === 0 && warned === 0) {
    lines.push('✅ Clean — no blocks or warnings')
  } else {
    if (blocked > 0) {
      lines.push(`🚫 Blocked: ${blocked}`)
      for (const [id, n] of Object.entries(blockCounts)) {
        lines.push(`  • ${id}: ${n}`)
      }
    }
    if (warned > 0) {
      lines.push(`⚠️ Warned: ${warned}`)
      for (const [id, n] of Object.entries(warnCounts)) {
        lines.push(`  • ${id}: ${n}`)
      }
    }
  }

  return lines.join('\n')
}

module.exports = { wslAudit, pullModel, ollamaModels, loreImport, wardDigest }
