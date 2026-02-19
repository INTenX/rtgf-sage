#!/usr/bin/env node

/**
 * rcm-sync - Auto-Import Daemon
 *
 * Watches Claude Code session directory and automatically imports sessions
 * when they are created or modified. Enables zero-toil archival.
 *
 * Usage:
 *   rcm-sync --watch ~/.claude/projects/ --target ~/knowledge/ --daemon
 *   rcm-sync --watch ~/.claude/projects/ --target ~/knowledge/ --once
 */

import { program } from 'commander';
import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { convertAndSave } from '../adapters/claude-code.js';
import { createFlowLink, gitAdd, gitCommit, initGitIfNeeded, isGitRepo } from '../lib/git-operations.js';

/**
 * Track recently processed files to avoid duplicates
 */
const processedFiles = new Map();
const COOLDOWN_MS = 5000; // Don't reprocess same file within 5 seconds

/**
 * Import a session file
 */
async function importSession(sourcePath, targetRoot, options = {}) {
  const {
    platform = 'claude-code',
    flowState = 'hypothesis',
    tags = [],
    autoCommit = true,
  } = options;

  const sessionId = path.basename(sourcePath, '.jsonl');

  // Check cooldown
  const lastProcessed = processedFiles.get(sourcePath);
  if (lastProcessed && Date.now() - lastProcessed < COOLDOWN_MS) {
    return { skipped: true, reason: 'cooldown' };
  }

  try {
    console.log(`📥 Importing: ${sessionId}`);

    // Determine output directory (by year/month)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const canonicalDir = path.join(targetRoot, 'rcm', 'archive', 'canonical', String(year), month);

    // Ensure directory exists
    if (!fs.existsSync(canonicalDir)) {
      fs.mkdirSync(canonicalDir, { recursive: true });
    }

    // Convert to canonical
    const result = convertAndSave(sourcePath, canonicalDir, {
      flowState,
      tags,
    });

    console.log(`   ✅ ${result.title}`);
    console.log(`   📄 ${result.canonicalPath}`);

    // Link to flow state
    const linkResult = createFlowLink(targetRoot, result.canonicalPath, flowState);
    console.log(`   🔗 flows/${flowState}/${path.basename(result.canonicalPath)}`);

    // Git commit if enabled
    if (autoCommit && isGitRepo(targetRoot)) {
      gitAdd(targetRoot, 'rcm/');
      const commitMsg = `Auto-import ${platform} session ${sessionId.substring(0, 8)}`;
      gitCommit(targetRoot, 'import', commitMsg);
      console.log(`   📝 Committed`);
    }

    console.log('');

    // Mark as processed
    processedFiles.set(sourcePath, Date.now());

    return {
      success: true,
      sessionId: result.sessionId,
      title: result.title,
      path: result.canonicalPath,
    };
  } catch (err) {
    console.error(`   ❌ Import failed: ${err.message}`);
    console.error('');
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Watch directory for new/modified sessions
 */
async function watchDirectory(watchPath, targetRoot, options = {}) {
  const {
    platform = 'claude-code',
    pattern = '**/*.jsonl',
    flowState = 'hypothesis',
    tags = [],
    autoCommit = true,
  } = options;

  console.log('🔍 RCM Auto-Sync Daemon');
  console.log(`   Watching: ${watchPath}`);
  console.log(`   Target: ${targetRoot}`);
  console.log(`   Pattern: ${pattern}`);
  console.log(`   Flow State: ${flowState}`);
  console.log('');
  console.log('👀 Watching for session changes...');
  console.log('   (Press Ctrl+C to stop)');
  console.log('');

  // Initialize git if needed
  if (!isGitRepo(targetRoot)) {
    console.log('⚠️  Target is not a git repository. Initializing...');
    initGitIfNeeded(targetRoot);
    console.log('');
  }

  // Create watcher
  const watcher = chokidar.watch(path.join(watchPath, pattern), {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  // Handle new/modified files
  watcher.on('add', async (filePath) => {
    await importSession(filePath, targetRoot, {
      platform,
      flowState,
      tags,
      autoCommit,
    });
  });

  watcher.on('change', async (filePath) => {
    await importSession(filePath, targetRoot, {
      platform,
      flowState,
      tags,
      autoCommit,
    });
  });

  watcher.on('error', (err) => {
    console.error(`❌ Watcher error: ${err.message}`);
  });

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('');
    console.log('👋 Stopping auto-sync daemon...');
    watcher.close();
    process.exit(0);
  });

  return watcher;
}

/**
 * Import once (all existing files)
 */
async function importOnce(watchPath, targetRoot, options = {}) {
  const {
    platform = 'claude-code',
    pattern = '**/*.jsonl',
    flowState = 'hypothesis',
    tags = [],
    autoCommit = true,
  } = options;

  console.log('🚀 RCM Batch Import');
  console.log(`   Source: ${watchPath}`);
  console.log(`   Target: ${targetRoot}`);
  console.log(`   Pattern: ${pattern}`);
  console.log('');

  // Find all matching files
  const glob = await import('fast-glob');
  const files = await glob.default(path.join(watchPath, pattern));

  console.log(`📁 Found ${files.length} session(s)`);
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const result = await importSession(file, targetRoot, {
      platform,
      flowState,
      tags,
      autoCommit: false, // Commit once at the end
    });

    if (result.success) {
      successCount++;
    } else if (!result.skipped) {
      failCount++;
    }
  }

  // Single commit for batch import
  if (autoCommit && successCount > 0 && isGitRepo(targetRoot)) {
    console.log('📝 Creating batch commit...');
    gitAdd(targetRoot, 'rcm/');
    const commitMsg = `Batch import ${successCount} sessions`;
    gitCommit(targetRoot, 'import', commitMsg);
    console.log('');
  }

  console.log('✅ Batch import complete!');
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
}

// CLI setup
program
  .name('rcm-sync')
  .description('RCM auto-sync daemon - watch and import sessions automatically')
  .version('0.1.0')
  .requiredOption('-w, --watch <path>', 'Directory to watch for sessions')
  .requiredOption('-t, --target <path>', 'Target RCM root directory')
  .option('-p, --platform <name>', 'Platform name', 'claude-code')
  .option('--pattern <glob>', 'File pattern to watch', '**/*.jsonl')
  .option('-f, --flow-state <state>', 'Initial flow state', 'hypothesis')
  .option('--tags <tags>', 'Comma-separated tags', (val) => val.split(',').map(t => t.trim()))
  .option('--no-commit', 'Disable auto-commit')
  .option('--daemon', 'Run as daemon (watch continuously)')
  .option('--once', 'Import once and exit (batch mode)');

program.parse();

const options = program.opts();

// Run daemon or batch import
if (options.daemon) {
  watchDirectory(options.watch, options.target, {
    platform: options.platform,
    pattern: options.pattern,
    flowState: options.flowState,
    tags: options.tags || [],
    autoCommit: options.commit,
  });
} else if (options.once) {
  importOnce(options.watch, options.target, {
    platform: options.platform,
    pattern: options.pattern,
    flowState: options.flowState,
    tags: options.tags || [],
    autoCommit: options.commit,
  }).then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error(`❌ Batch import failed: ${err.message}`);
    process.exit(1);
  });
} else {
  console.error('❌ Must specify either --daemon or --once');
  program.help();
  process.exit(1);
}
