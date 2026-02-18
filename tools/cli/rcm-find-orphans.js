#!/usr/bin/env node

/**
 * rcm-find-orphans - Find Claude Code sessions not yet imported to LORE
 *
 * Scans ~/.claude/projects/ and compares against imported sessions
 * to identify orphaned sessions that need importing
 *
 * Usage:
 *   node rcm-find-orphans.js --target /home/cbasta/intenx-knowledge
 *   node rcm-find-orphans.js --target /home/cbasta/sensit-knowledge --import
 */

import fs from 'fs/promises';
import path from 'path';
import { program } from 'commander';
import fg from 'fast-glob';
import os from 'os';
import { execSync } from 'child_process';

program
  .requiredOption('-t, --target <path>', 'Target knowledge repo to check')
  .option('-s, --source <path>', 'Claude projects directory', path.join(os.homedir(), '.claude', 'projects'))
  .option('-i, --import', 'Auto-import orphaned sessions')
  .option('--platform <platform>', 'Platform type', 'claude-code')
  .parse();

const options = program.opts();

async function findOrphans() {
  console.log('🔍 LORE Orphan Session Finder');
  console.log('==============================\n');

  const repoName = path.basename(options.target);
  console.log(`Repository: ${repoName}`);
  console.log(`Source: ${options.source}`);
  console.log();

  // Find all Claude Code sessions
  const allSessions = await fg('**/*.jsonl', {
    cwd: options.source,
    absolute: true,
    ignore: ['**/subagents/**']  // Ignore subagent sessions
  });

  console.log(`Found ${allSessions.length} total sessions in ${options.source}`);

  // Find all imported sessions (check raw archive for original filenames)
  const rawArchive = path.join(options.target, 'rcm', 'archive', 'raw', 'claude-code');
  let importedSessions = [];

  try {
    importedSessions = await fg('*.jsonl', {
      cwd: rawArchive,
      absolute: false
    });
  } catch (err) {
    console.log('⚠️  No raw archive found (repo empty or not initialized)');
  }

  console.log(`Already imported: ${importedSessions.length} sessions`);
  console.log();

  // Find orphans (sessions not in raw archive)
  const orphans = [];
  for (const sessionPath of allSessions) {
    const filename = path.basename(sessionPath);
    if (!importedSessions.includes(filename)) {
      orphans.push(sessionPath);
    }
  }

  if (orphans.length === 0) {
    console.log('✅ No orphaned sessions found! All sessions are imported.');
    return;
  }

  console.log(`🔴 Found ${orphans.length} orphaned sessions:\n`);

  // Show orphans
  for (const orphan of orphans) {
    const filename = path.basename(orphan);
    const dir = path.basename(path.dirname(orphan));
    console.log(`  📄 ${filename}`);
    console.log(`     Project: ${dir}`);
  }

  console.log();

  // Auto-import if requested
  if (options.import) {
    console.log('🚀 Auto-importing orphaned sessions...\n');

    let successCount = 0;
    let failCount = 0;

    for (const orphan of orphans) {
      try {
        console.log(`Importing ${path.basename(orphan)}...`);

        const scriptPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'rcm-import.js');

        execSync(`node "${scriptPath}" --source "${orphan}" --platform ${options.platform} --target "${options.target}"`, {
          stdio: 'pipe'
        });

        successCount++;
        console.log('  ✅ Success');
      } catch (err) {
        failCount++;
        console.log(`  ❌ Failed: ${err.message}`);
      }
    }

    console.log();
    console.log('📊 Import Summary:');
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log(`  📦 Total: ${orphans.length}`);

  } else {
    console.log('💡 To import these sessions, run:');
    console.log();
    console.log(`  node tools/cli/rcm-find-orphans.js \\`);
    console.log(`    --target ${options.target} \\`);
    console.log(`    --import`);
    console.log();
    console.log('Or import manually:');
    console.log();
    console.log(`  for session in ${options.source}/**/*.jsonl; do`);
    console.log(`    node tools/cli/rcm-import.js \\`);
    console.log(`      --source "$session" \\`);
    console.log(`      --platform ${options.platform} \\`);
    console.log(`      --target ${options.target}`);
    console.log(`  done`);
  }
}

findOrphans().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
