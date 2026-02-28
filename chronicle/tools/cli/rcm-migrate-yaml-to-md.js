#!/usr/bin/env node

/**
 * rcm-migrate-yaml-to-md — One-time migration: YAML sessions → Markdown
 *
 * Converts existing .yaml session files in a knowledge repo to .md with
 * YAML frontmatter + markdown message body. Uses git mv to preserve history.
 *
 * Usage:
 *   node rcm-migrate-yaml-to-md.js --target ~/intenx-knowledge
 *   node rcm-migrate-yaml-to-md.js --target ~/intenx-knowledge --dry-run
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';
import { program } from 'commander';

/**
 * Slugify title for display only (not used in filenames here)
 */
function shortTimestamp(isoString) {
  if (!isoString) return '';
  return String(isoString).replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

/**
 * Convert a canonical YAML object to markdown with YAML frontmatter
 */
function yamlObjToMarkdown(canonical) {
  const { session, messages = [] } = canonical;

  const frontmatter = {
    id: session.id,
    title: session.metadata?.title || 'Untitled',
    platform: session.source?.platform,
    platform_session_id: session.source?.session_id,
    created: session.created_at,
    updated: session.updated_at,
    flow_state: session.flow_state?.current || 'hypothesis',
    quality_score: session.flow_state?.quality_score ?? null,
    tags: session.metadata?.tags || [],
    summary: session.metadata?.summary || '',
    working_directory: session.metadata?.working_directory || '',
    git_branch: session.metadata?.git_context?.branch || '',
    git_repo: session.metadata?.git_context?.repo || '',
    message_count: messages.length,
  };

  const fm = yaml.dump(frontmatter, { lineWidth: -1, noRefs: true });

  const lines = [`# ${frontmatter.title}`, ''];

  for (const msg of messages) {
    const ts = shortTimestamp(msg.timestamp);

    if (msg.role === 'assistant') {
      const model = msg.model && msg.model !== 'unknown' ? ` · ${msg.model}` : '';
      lines.push(`## Assistant · ${ts}${model}`, '');
    } else {
      lines.push(`## User · ${ts}`, '');
    }

    if (msg.content) {
      lines.push(msg.content, '');
    }

    if (msg.tool_uses?.length > 0) {
      const toolNames = msg.tool_uses.map(t => `\`${t.tool_name}\``).join(', ');
      lines.push(`**Tools:** ${toolNames}`, '');
    }

    lines.push('---', '');
  }

  return `---\n${fm}---\n\n${lines.join('\n')}`;
}

/**
 * Find all .yaml session files in canonical archive + flow state dirs
 */
function findYamlFiles(repoRoot) {
  const results = [];
  const searchDirs = [
    path.join(repoRoot, 'rcm', 'archive', 'canonical'),
    path.join(repoRoot, 'rcm', 'flows', 'hypothesis'),
    path.join(repoRoot, 'rcm', 'flows', 'codified'),
    path.join(repoRoot, 'rcm', 'flows', 'validated'),
    path.join(repoRoot, 'rcm', 'flows', 'promoted'),
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    walkDir(dir, results);
  }

  return results;
}

function walkDir(dir, results) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, results);
    } else if ((entry.isFile() || entry.isSymbolicLink()) && entry.name.endsWith('.yaml')) {
      results.push(fullPath);
    }
  }
}

/**
 * Migrate a single .yaml file to .md using git mv
 */
function migrateFile(yamlPath, repoRoot, dryRun) {
  const mdPath = yamlPath.replace(/\.yaml$/, '.md');
  const relYaml = path.relative(repoRoot, yamlPath);
  const relMd = path.relative(repoRoot, mdPath);

  // Check if it's a symlink (flow state dirs use symlinks)
  const lstat = fs.lstatSync(yamlPath);
  if (lstat.isSymbolicLink()) {
    const target = fs.readlinkSync(yamlPath);
    const newTarget = target.replace(/\.yaml$/, '.md');
    const newLinkPath = yamlPath.replace(/\.yaml$/, '.md');

    if (dryRun) {
      console.log(`  [symlink] ${relYaml} → ${relMd} (target: ${newTarget})`);
      return;
    }

    // Re-create symlink with .md extension
    if (fs.existsSync(newLinkPath)) fs.unlinkSync(newLinkPath);
    fs.symlinkSync(newTarget, newLinkPath);
    fs.unlinkSync(yamlPath);

    // git: remove old, add new
    try {
      execSync(`git rm --cached "${relYaml}" 2>/dev/null || true`, { cwd: repoRoot });
      execSync(`git add "${relMd}"`, { cwd: repoRoot });
    } catch { /* non-fatal */ }

    console.log(`  ✓ symlink ${relYaml} → ${relMd}`);
    return;
  }

  // Regular file: convert content + git mv
  const content = fs.readFileSync(yamlPath, 'utf-8');
  let canonical;
  try {
    canonical = yaml.load(content);
  } catch (err) {
    console.warn(`  ⚠ Could not parse ${relYaml}: ${err.message} — skipping`);
    return;
  }

  if (!canonical?.session) {
    console.warn(`  ⚠ No session key in ${relYaml} — skipping`);
    return;
  }

  const markdown = yamlObjToMarkdown(canonical);

  if (dryRun) {
    console.log(`  [file] ${relYaml} → ${relMd} (${(content.length / 1024).toFixed(1)} KB → ${(markdown.length / 1024).toFixed(1)} KB)`);
    return;
  }

  // Write markdown
  fs.writeFileSync(mdPath, markdown, 'utf-8');

  // git mv
  try {
    execSync(`git mv "${relYaml}" "${relMd}"`, { cwd: repoRoot, stdio: 'pipe' });
  } catch {
    // If git mv fails (e.g. file not tracked), just remove old
    fs.unlinkSync(yamlPath);
  }

  console.log(`  ✓ ${relYaml} → ${relMd}`);
}

/**
 * Main
 */
async function main(options) {
  const repoRoot = path.resolve(options.target);

  if (!fs.existsSync(repoRoot)) {
    console.error(`❌ Target not found: ${repoRoot}`);
    process.exit(1);
  }

  console.log(`🔄 LORE YAML → Markdown Migration`);
  console.log(`   Repo: ${repoRoot}`);
  if (options.dryRun) console.log(`   DRY RUN — no files will be changed`);
  console.log('');

  const yamlFiles = findYamlFiles(repoRoot);

  if (yamlFiles.length === 0) {
    console.log('   No .yaml session files found. Nothing to migrate.');
    return;
  }

  console.log(`   Found ${yamlFiles.length} .yaml file(s)`);
  console.log('');

  let converted = 0;
  let skipped = 0;

  for (const yamlPath of yamlFiles) {
    try {
      migrateFile(yamlPath, repoRoot, options.dryRun);
      converted++;
    } catch (err) {
      console.warn(`  ⚠ Failed: ${path.relative(repoRoot, yamlPath)}: ${err.message}`);
      skipped++;
    }
  }

  console.log('');

  if (options.dryRun) {
    console.log(`✅ Dry run complete — ${converted} file(s) would be converted`);
    return;
  }

  // Commit
  if (!options.noCommit) {
    try {
      execSync('git add -A rcm/', { cwd: repoRoot, stdio: 'pipe' });
      execSync(
        `git commit -m "chore(lore): Migrate session files from YAML to Markdown format\n\nConverts ${converted} .yaml session files to .md with YAML frontmatter.\nPreserves all metadata and message content. Improves human readability\nand enables direct Khoj indexing without preprocessing."`,
        { cwd: repoRoot, stdio: 'inherit' }
      );
      console.log(`✅ Migration complete — ${converted} file(s) converted, committed`);
    } catch (err) {
      console.log(`✅ Migration complete — ${converted} file(s) converted (commit failed: ${err.message})`);
    }
  } else {
    console.log(`✅ Migration complete — ${converted} file(s) converted (no-commit)`);
  }

  if (skipped > 0) {
    console.log(`⚠  ${skipped} file(s) skipped due to errors`);
  }
}

program
  .name('rcm-migrate-yaml-to-md')
  .description('One-time migration: convert LORE session files from .yaml to .md')
  .requiredOption('-t, --target <path>', 'Knowledge repo root directory')
  .option('--dry-run', 'Show what would happen without making changes')
  .option('--no-commit', 'Skip git commit after migration')
  .parse();

main(program.opts()).catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
