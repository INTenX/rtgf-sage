#!/usr/bin/env node

/**
 * rcm-export-index - Export session index for cross-WSL visibility
 *
 * Creates a JSON index of all sessions across knowledge repos
 * for Control Center to query/search
 *
 * Usage:
 *   node rcm-export-index.js --output /mnt/c/sage-exports/session-index.json
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { program } from 'commander';
import fg from 'fast-glob';
import { execSync } from 'child_process';

program
  .option('-o, --output <path>', 'Output path for index JSON', '/home/cbasta/sage-exports/session-index.json')
  .option('-r, --repos <paths...>', 'Knowledge repo paths', [
    '/home/cbasta/intenx-knowledge',
    '/home/cbasta/sensit-knowledge',
    '/home/cbasta/makanui-knowledge',
    '/home/cbasta/test-knowledge'
  ])
  .option('-w, --wsl <name>', 'WSL instance name', 'ColeWork')
  .option('--no-pull', 'Skip git pull before indexing')
  .parse();

const options = program.opts();

async function exportIndex() {
  console.log('🔍 LORE Session Index Export');
  console.log('=============================\n');

  // Pull repos first (unless --no-pull)
  if (options.pull !== false) {
    console.log('📥 Pulling latest from GitHub...\n');
    for (const repoPath of options.repos) {
      try {
        const repoName = path.basename(repoPath);
        const gitDir = path.join(repoPath, '.git');

        // Check if repo exists and is a git repo
        try {
          await fs.access(gitDir);
        } catch {
          console.log(`   ⚠️  ${repoName}: Not a git repo, skipping pull`);
          continue;
        }

        // Pull
        execSync('git pull', { cwd: repoPath, stdio: 'pipe' });
        console.log(`   ✓ ${repoName}: Pulled latest`);
      } catch (err) {
        const repoName = path.basename(repoPath);
        console.log(`   ⚠️  ${repoName}: Pull failed (${err.message}), continuing with local version`);
      }
    }
    console.log();
  }

  const index = {
    generated_at: new Date().toISOString(),
    wsl_instance: options.wsl,
    repositories: [],
    sessions: [],
    summary: {
      total_sessions: 0,
      by_repo: {},
      by_state: {
        hypothesis: 0,
        codified: 0,
        validated: 0,
        promoted: 0
      },
      by_platform: {}
    }
  };

  for (const repoPath of options.repos) {
    try {
      const repoName = path.basename(repoPath);
      console.log(`📦 Indexing ${repoName}...`);

      // Find all canonical YAML files
      const sessionFiles = await fg('rcm/archive/canonical/**/*.yaml', {
        cwd: repoPath,
        absolute: true
      });

      console.log(`   Found ${sessionFiles.length} sessions`);

      const repoSessions = [];

      for (const sessionFile of sessionFiles) {
        try {
          const content = await fs.readFile(sessionFile, 'utf-8');
          const session = yaml.load(content);

          // Determine flow state by checking which directory has symlink
          let flowState = 'hypothesis';
          const sessionFilename = path.basename(sessionFile);

          for (const state of ['promoted', 'validated', 'codified', 'hypothesis']) {
            const flowPath = path.join(repoPath, 'rcm', 'flows', state, sessionFilename);
            try {
              await fs.access(flowPath);
              flowState = state;
              break;
            } catch {
              // Not in this state
            }
          }

          const sessionIndex = {
            id: session.session.id,
            short_id: session.session.id.substring(0, 8),
            title: session.session.metadata.title,
            created_at: session.session.created_at,
            updated_at: session.session.updated_at,
            platform: session.session.source.platform,
            platform_session_id: session.session.source.session_id,
            tags: session.session.metadata.tags || [],
            flow_state: flowState,
            quality_score: session.session.flow_state.quality_score,
            message_count: session.messages.length,
            repository: repoName,
            wsl_instance: options.wsl,
            canonical_path: sessionFile,
            working_directory: session.session.metadata.working_directory
          };

          repoSessions.push(sessionIndex);

          // Update summary
          index.summary.total_sessions++;
          index.summary.by_state[flowState]++;
          index.summary.by_platform[sessionIndex.platform] =
            (index.summary.by_platform[sessionIndex.platform] || 0) + 1;

        } catch (err) {
          console.error(`   ⚠️  Error indexing ${path.basename(sessionFile)}: ${err.message}`);
        }
      }

      index.repositories.push({
        name: repoName,
        path: repoPath,
        session_count: repoSessions.length
      });

      index.sessions.push(...repoSessions);
      index.summary.by_repo[repoName] = repoSessions.length;

    } catch (err) {
      console.error(`   ⚠️  Error accessing ${repoPath}: ${err.message}`);
    }
  }

  // Sort sessions by date (newest first)
  index.sessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Write index
  const outputDir = path.dirname(options.output);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(options.output, JSON.stringify(index, null, 2));

  console.log('\n✅ Index exported!');
  console.log(`   Output: ${options.output}`);
  console.log(`   Total sessions: ${index.summary.total_sessions}`);
  console.log(`   By repo:`);
  for (const [repo, count] of Object.entries(index.summary.by_repo)) {
    console.log(`     - ${repo}: ${count}`);
  }
  console.log(`   By state:`);
  for (const [state, count] of Object.entries(index.summary.by_state)) {
    console.log(`     - ${state}: ${count}`);
  }
  console.log(`   By platform:`);
  for (const [platform, count] of Object.entries(index.summary.by_platform)) {
    console.log(`     - ${platform}: ${count}`);
  }
}

exportIndex().catch(err => {
  console.error('❌ Export failed:', err.message);
  process.exit(1);
});
