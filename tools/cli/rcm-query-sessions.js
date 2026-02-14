#!/usr/bin/env node

/**
 * rcm-query-sessions - Query cross-WSL session index
 *
 * For Control Center to search/discover sessions across all WSL instances
 *
 * Usage:
 *   node rcm-query-sessions.js --search "kicad automation"
 *   node rcm-query-sessions.js --tags "business-strategy,tfaas"
 *   node rcm-query-sessions.js --repo intenx-knowledge
 *   node rcm-query-sessions.js --state codified
 *   node rcm-query-sessions.js --recent 10
 */

import fs from 'fs/promises';
import { program } from 'commander';

program
  .option('-i, --index <path>', 'Session index path', '/home/cbasta/sage-exports/session-index.json')
  .option('-s, --search <query>', 'Search in titles')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .option('-r, --repo <name>', 'Filter by repository')
  .option('-w, --wsl <name>', 'Filter by WSL instance')
  .option('--state <state>', 'Filter by flow state (hypothesis, codified, validated, promoted)')
  .option('--platform <platform>', 'Filter by platform (claude-code, chatgpt, gemini)')
  .option('--recent <n>', 'Show N most recent sessions', parseInt)
  .option('--format <format>', 'Output format (table, json, list)', 'table')
  .parse();

const options = program.opts();

async function querySessions() {
  try {
    // Load index
    const indexData = await fs.readFile(options.index, 'utf-8');
    const index = JSON.parse(indexData);

    let sessions = index.sessions;

    // Apply filters
    if (options.search) {
      const query = options.search.toLowerCase();
      sessions = sessions.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    if (options.tags) {
      const tags = options.tags.split(',').map(t => t.trim().toLowerCase());
      sessions = sessions.filter(s =>
        tags.some(tag => s.tags.some(t => t.toLowerCase().includes(tag)))
      );
    }

    if (options.repo) {
      sessions = sessions.filter(s => s.repository === options.repo);
    }

    if (options.wsl) {
      sessions = sessions.filter(s => s.wsl_instance === options.wsl);
    }

    if (options.state) {
      sessions = sessions.filter(s => s.flow_state === options.state);
    }

    if (options.platform) {
      sessions = sessions.filter(s => s.platform === options.platform);
    }

    if (options.recent) {
      sessions = sessions.slice(0, options.recent);
    }

    // Output
    if (options.format === 'json') {
      console.log(JSON.stringify(sessions, null, 2));
    } else if (options.format === 'list') {
      sessions.forEach(s => {
        console.log(`${s.short_id} | ${s.title}`);
        console.log(`   ${s.repository} | ${s.flow_state} | ${s.created_at.substring(0, 10)}`);
        if (s.tags.length > 0) {
          console.log(`   Tags: ${s.tags.join(', ')}`);
        }
        console.log();
      });
    } else {
      // Table format
      console.log('\n📋 Session Query Results');
      console.log('========================\n');
      console.log(`Found ${sessions.length} sessions\n`);

      sessions.forEach((s, i) => {
        console.log(`[${i + 1}] ${s.title}`);
        console.log(`    ID: ${s.short_id}`);
        console.log(`    Repo: ${s.repository} | State: ${s.flow_state}`);
        console.log(`    Platform: ${s.platform} | WSL: ${s.wsl_instance}`);
        console.log(`    Created: ${s.created_at.substring(0, 10)} | Messages: ${s.message_count}`);
        if (s.tags.length > 0) {
          console.log(`    Tags: ${s.tags.join(', ')}`);
        }
        if (s.working_directory) {
          console.log(`    Dir: ${s.working_directory}`);
        }
        console.log(`    Path: ${s.canonical_path}`);
        console.log();
      });

      if (sessions.length === 0) {
        console.log('No sessions found matching query.\n');
      }
    }

  } catch (err) {
    console.error('❌ Query failed:', err.message);
    console.error('\nMake sure session index exists:');
    console.error('  node rcm-export-index.js');
    process.exit(1);
  }
}

querySessions();
