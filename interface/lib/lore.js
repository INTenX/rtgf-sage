'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ARCHIVE_ROOT = () => process.env.LORE_ARCHIVE
  ?? path.join(__dirname, '../../lore/ctx/archive/canonical')

// Simple keyword search over LORE canonical YAML archive.
// Searches session titles, summaries, and tags.
// Returns up to maxResults matching sessions as plain text summaries.
//
// Upgraded automatically when ctx-search CLI is available (P4).
function searchLore(query, maxResults = 3) {
  const archiveRoot = ARCHIVE_ROOT()

  // Prefer ctx-search CLI if available (P4 — not built yet)
  try {
    const result = execSync(
      `ctx-search --query ${JSON.stringify(query)} --limit ${maxResults} --format text`,
      { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'] }
    )
    return result.trim()
  } catch {
    // Fall through to grep-based search
  }

  if (!fs.existsSync(archiveRoot)) {
    return null
  }

  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2)
  if (!keywords.length) return null

  // Walk year/month dirs for YAML files
  const results = []
  try {
    const yearDirs = fs.readdirSync(archiveRoot)
    for (const year of yearDirs) {
      const yearPath = path.join(archiveRoot, year)
      if (!fs.statSync(yearPath).isDirectory()) continue
      const monthDirs = fs.readdirSync(yearPath)
      for (const month of monthDirs) {
        const monthPath = path.join(yearPath, month)
        if (!fs.statSync(monthPath).isDirectory()) continue
        const files = fs.readdirSync(monthPath).filter(f => f.endsWith('.yaml'))
        for (const file of files) {
          if (results.length >= maxResults * 3) break
          const content = fs.readFileSync(path.join(monthPath, file), 'utf8').toLowerCase()
          const matchCount = keywords.filter(k => content.includes(k)).length
          if (matchCount > 0) {
            results.push({ file, content: content.slice(0, 2000), matchCount })
          }
        }
      }
    }
  } catch {
    return null
  }

  if (!results.length) return null

  // Sort by match count, take top N
  results.sort((a, b) => b.matchCount - a.matchCount)
  const top = results.slice(0, maxResults)

  return top.map(r => {
    // Extract title and summary from YAML text
    const titleMatch = r.content.match(/title:\s*["']?(.+?)["']?\n/)
    const summaryMatch = r.content.match(/summary:\s*["']?(.+?)["']?\n/)
    const title = titleMatch ? titleMatch[1].trim() : r.file.replace('.yaml', '')
    const summary = summaryMatch ? summaryMatch[1].trim() : '(no summary)'
    return `• ${title}: ${summary}`
  }).join('\n')
}

module.exports = { searchLore }
