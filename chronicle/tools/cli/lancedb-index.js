#!/usr/bin/env node
/**
 * lancedb-index — Build or update the CHRONICLE LanceDB semantic index
 *
 * Reads promoted + validated sessions from all knowledge repos,
 * generates embeddings using a local ONNX model (all-MiniLM-L6-v2),
 * and stores them in a LanceDB table at ~/.chronicle-lancedb/.
 *
 * Usage:
 *   node lancedb-index.js                  # index promoted + validated
 *   node lancedb-index.js --all            # index all flow states
 *   node lancedb-index.js --repo sensit    # single repo
 *   node lancedb-index.js --rebuild        # drop and rebuild from scratch
 *   node lancedb-index.js --query "KiCad footprint"   # search (test mode)
 *   node lancedb-index.js --query "..." --limit 5
 */

import { connect } from '@lancedb/lancedb';
import { pipeline } from '@xenova/transformers';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import matter from 'gray-matter';
import fg from 'fast-glob';
import { program } from 'commander';

// ── Config ──────────────────────────────────────────────────────────────────

const LANCE_DB_PATH = path.join(os.homedir(), '.chronicle-lancedb');
const TABLE_NAME    = 'sessions';
const MODEL_ID      = 'Xenova/all-MiniLM-L6-v2'; // ~25MB, downloads on first run
const EMBED_DIM     = 384;
const BATCH_SIZE    = 16;

const KNOWLEDGE_REPOS = [
  { name: 'intenx',     path: `${os.homedir()}/intenx-knowledge` },
  { name: 'sensit',     path: `${os.homedir()}/sensit-knowledge` },
  { name: 'makanui',    path: `${os.homedir()}/makanui-knowledge` },
  { name: 'ratio11',    path: `${os.homedir()}/ratio11-knowledge` },
  { name: 'beaglebone', path: `${os.homedir()}/beaglebone-knowledge` },
  { name: 'test',       path: `${os.homedir()}/test-knowledge` },
];

const FLOW_STATES = ['hypothesis', 'codified', 'validated', 'promoted'];

// ── CLI ─────────────────────────────────────────────────────────────────────

program
  .name('lancedb-index')
  .description('Build CHRONICLE LanceDB semantic index')
  .option('--all',              'Index all flow states (default: promoted + validated only)')
  .option('--repo <name>',      'Filter to a single knowledge repo')
  .option('--rebuild',          'Drop existing table and rebuild from scratch')
  .option('-q, --query <text>', 'Search mode: run a semantic query against the index')
  .option('-n, --limit <n>',    'Max results for query mode (default: 10)', parseInt)
  .parse();

const opts = program.opts();

// ── Embedder ─────────────────────────────────────────────────────────────────

let _embedder = null;
async function getEmbedder() {
  if (!_embedder) {
    process.stderr.write(`Loading embedding model ${MODEL_ID}...\n`);
    _embedder = await pipeline('feature-extraction', MODEL_ID, { progress_callback: null });
    process.stderr.write('Model ready.\n');
  }
  return _embedder;
}

async function embed(texts) {
  const embedder = await getEmbedder();
  const output = await embedder(texts, { pooling: 'mean', normalize: true });
  // output.tolist() returns array of float arrays
  return output.tolist();
}

// ── Session loader ────────────────────────────────────────────────────────────

async function loadSessions(repoFilter, allStates) {
  const sessions = [];
  const states = allStates
    ? FLOW_STATES
    : ['validated', 'promoted'];

  for (const repo of KNOWLEDGE_REPOS) {
    if (repoFilter && repo.name !== repoFilter) continue;

    const base = path.join(repo.path, 'rcm', 'flows');

    for (const state of states) {
      const dir = path.join(base, state);
      let files;
      try {
        files = await fg('*.md', { cwd: dir, absolute: true });
      } catch {
        continue;
      }

      for (const file of files) {
        try {
          const raw = await fs.readFile(file, 'utf8');
          const { data: fm, content } = matter(raw);

          // Build text to embed: title + tags + summary + first 1500 chars of content
          const text = [
            fm.title || '',
            Array.isArray(fm.tags) ? fm.tags.join(' ') : '',
            fm.summary || '',
            content.slice(0, 1500),
          ].filter(Boolean).join('\n').slice(0, 2000);

          sessions.push({
            id:            fm.id || path.basename(file, '.md'),
            title:         fm.title || path.basename(file, '.md'),
            summary:       fm.summary || '',
            tags:          Array.isArray(fm.tags) ? fm.tags.join(',') : '',
            flow_state:    fm.flow_state || state,
            platform:      fm.platform || '',
            date:          fm.created || fm.date || '',
            repo:          repo.name,
            file_path:     file,
            message_count: fm.message_count || 0,
            embed_text:    text,
          });
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  return sessions;
}

// ── Index builder ─────────────────────────────────────────────────────────────

async function buildIndex(sessions) {
  const db = await connect(LANCE_DB_PATH);

  if (opts.rebuild) {
    try {
      await db.dropTable(TABLE_NAME);
      process.stderr.write('Dropped existing table.\n');
    } catch { /* table didn't exist */ }
  }

  // Check existing IDs to skip already-indexed sessions
  let existingIds = new Set();
  try {
    const table = await db.openTable(TABLE_NAME);
    const existing = await table.query().select(['id']).toArray();
    existingIds = new Set(existing.map(r => r.id));
  } catch { /* table doesn't exist yet */ }

  const toIndex = sessions.filter(s => !existingIds.has(s.id));

  if (toIndex.length === 0) {
    process.stderr.write('All sessions already indexed.\n');
    return await db.openTable(TABLE_NAME);
  }

  process.stderr.write(`Indexing ${toIndex.length} sessions (${existingIds.size} already indexed)...\n`);

  // Process in batches
  const rows = [];
  for (let i = 0; i < toIndex.length; i += BATCH_SIZE) {
    const batch = toIndex.slice(i, i + BATCH_SIZE);
    const texts = batch.map(s => s.embed_text);
    const vectors = await embed(texts);

    for (let j = 0; j < batch.length; j++) {
      const { embed_text, ...meta } = batch[j];
      rows.push({ ...meta, vector: vectors[j] });
    }

    process.stderr.write(`  ${Math.min(i + BATCH_SIZE, toIndex.length)}/${toIndex.length}\r`);
  }
  process.stderr.write('\n');

  // Write to LanceDB
  let table;
  if (existingIds.size === 0) {
    table = await db.createTable(TABLE_NAME, rows);
  } else {
    table = await db.openTable(TABLE_NAME);
    await table.add(rows);
  }

  // Create vector index for fast ANN search if large enough
  if (rows.length + existingIds.size >= 100) {
    try {
      await table.createIndex('vector', { config: { type: 'ivf_pq' } });
    } catch { /* index may already exist */ }
  }

  return table;
}

// ── Query mode ────────────────────────────────────────────────────────────────

async function search(queryText, limit = 10) {
  const db = await connect(LANCE_DB_PATH);
  let table;
  try {
    table = await db.openTable(TABLE_NAME);
  } catch {
    console.error('Index not built yet. Run: node lancedb-index.js');
    process.exit(1);
  }

  const [vector] = await embed([queryText]);
  const results = await table.search(vector).limit(limit).toArray();

  console.log(`\nSemantic search: "${queryText}"\n${'─'.repeat(60)}`);
  for (const r of results) {
    const score = r._distance !== undefined ? ` (dist: ${r._distance.toFixed(3)})` : '';
    console.log(`\n[${r.flow_state}] ${r.title}${score}`);
    console.log(`  repo:     ${r.repo}`);
    console.log(`  date:     ${r.date}`);
    console.log(`  tags:     ${r.tags || '(none)'}`);
    if (r.summary) console.log(`  summary:  ${r.summary.slice(0, 120)}`);
    console.log(`  file:     ${r.file_path}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

if (opts.query) {
  await search(opts.query, opts.limit || 10);
} else {
  const sessions = await loadSessions(opts.repo, opts.all);
  process.stderr.write(`Found ${sessions.length} sessions to consider.\n`);
  await buildIndex(sessions);
  process.stderr.write('Index complete.\n');

  const db = await connect(LANCE_DB_PATH);
  const table = await db.openTable(TABLE_NAME);
  const count = await table.countRows();
  console.log(`LanceDB index at ${LANCE_DB_PATH}: ${count} sessions indexed.`);
}
