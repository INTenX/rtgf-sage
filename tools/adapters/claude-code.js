#!/usr/bin/env node

/**
 * Claude Code JSONL → Canonical YAML Converter
 *
 * Converts Claude Code session transcripts (.jsonl) to RCM canonical format.
 * Handles 5 entry types: user, assistant, progress, system, file-history-snapshot
 * Preserves thinking, tool use, parent-child relationships, and usage metrics.
 *
 * Standard fidelity: full conversation + thinking + tool use + usage (~10-50KB)
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';

/**
 * Parse Claude Code JSONL file
 */
function parseClaudeCodeJSONL(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.trim());

  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (err) {
      console.warn(`Skipping invalid JSON line: ${line.substring(0, 100)}...`);
      return null;
    }
  }).filter(Boolean);
}

/**
 * Generate session title from entries
 */
function generateTitle(entries) {
  // Check for custom-title entry
  const customTitle = entries.find(e => e.type === 'custom-title');
  if (customTitle && customTitle.customTitle) {
    return customTitle.customTitle;
  }

  // Check for summary entry
  const summary = entries.find(e => e.type === 'summary');
  if (summary && summary.summary) {
    return summary.summary;
  }

  // Extract from first user message
  const firstUserMsg = entries.find(e => e.type === 'user');
  if (firstUserMsg && firstUserMsg.message && firstUserMsg.message.content) {
    const content = typeof firstUserMsg.message.content === 'string'
      ? firstUserMsg.message.content
      : firstUserMsg.message.content.role ? firstUserMsg.message.content.content : '';

    if (content) {
      const title = content.split('\n')[0].substring(0, 60).trim();
      return title || 'Untitled Session';
    }
  }

  return 'Untitled Session';
}

/**
 * Generate slug from title
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Convert Claude Code entry to canonical message
 */
function convertMessage(entry) {
  const message = {
    id: entry.uuid || uuidv4(),
    parent_id: entry.parentUuid || null,
    timestamp: entry.timestamp || new Date().toISOString(),
    role: entry.type === 'user' ? 'user' :
          entry.type === 'assistant' ? 'assistant' :
          entry.type === 'system' ? 'system' : 'assistant',
  };

  // Handle user messages
  if (entry.type === 'user' && entry.message) {
    const content = entry.message.content;
    if (typeof content === 'string') {
      message.content = content;
    } else if (content && content.role === 'user') {
      message.content = content.content || '';
    } else {
      message.content = '';
    }
  }

  // Handle assistant messages
  if (entry.type === 'assistant' && entry.message) {
    message.model = entry.message.model || 'unknown';

    // Parse content array
    const contentArray = entry.message.content || [];
    let textContent = [];
    let thinkingContent = null;
    const toolUses = [];

    for (const block of contentArray) {
      if (block.type === 'text') {
        textContent.push(block.text);
      } else if (block.type === 'thinking') {
        thinkingContent = block.thinking;
      } else if (block.type === 'tool_use') {
        toolUses.push({
          tool_name: block.name,
          tool_input: block.input,
          tool_output: null,
        });
      }
    }

    message.content = textContent.length > 0 ? textContent.join('\n\n') : null;

    if (thinkingContent) {
      message.thinking = thinkingContent;
    }

    if (toolUses.length > 0) {
      message.tool_uses = toolUses;
    }

    // Preserve usage metrics
    if (entry.message.usage) {
      const usage = entry.message.usage;
      message.usage = {
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cache_read_tokens: usage.cache_read_input_tokens || 0,
        cache_write_tokens: usage.cache_creation_input_tokens || 0,
      };
    }
  }

  return message;
}

/**
 * Extract git context from session metadata
 */
function extractGitContext(entries) {
  // Look for system messages or metadata with git info
  const gitInfo = {
    branch: '',
    repo: '',
    commit_hash: ''
  };

  // Try to find git context in session entries
  const systemEntries = entries.filter(e => e.type === 'system');
  for (const entry of systemEntries) {
    if (entry.text && entry.text.includes('git')) {
      // Basic parsing - could be enhanced
      const branchMatch = entry.text.match(/branch:\s*(\S+)/i);
      if (branchMatch) gitInfo.branch = branchMatch[1];
    }
  }

  return gitInfo;
}

/**
 * Convert Claude Code session to canonical format
 */
export function convertClaudeCodeToCanonical(jsonlPath, options = {}) {
  const entries = parseClaudeCodeJSONL(jsonlPath);

  if (entries.length === 0) {
    throw new Error('No valid entries found in JSONL file');
  }

  // Extract platform session ID from filename
  const platformSessionId = path.basename(jsonlPath, '.jsonl');

  // Generate session metadata
  const title = generateTitle(entries);
  const firstEntry = entries[0];
  const lastEntry = entries[entries.length - 1];

  // Convert all messages
  const messages = entries
    .filter(e => ['user', 'assistant', 'system'].includes(e.type))
    .map(convertMessage);

  // Extract participants (unique models + user)
  const participants = ['user'];
  const models = [...new Set(
    entries
      .filter(e => e.type === 'assistant' && e.model)
      .map(e => e.model)
  )];
  participants.push(...models);

  // Auto-generate tags from title (basic keyword extraction)
  const tags = options.tags || [];

  // Build canonical session
  const canonical = {
    session: {
      id: uuidv4(),
      canonical_version: '1.0',
      created_at: firstEntry.ts || new Date().toISOString(),
      updated_at: lastEntry.ts || new Date().toISOString(),

      source: {
        platform: 'claude-code',
        platform_version: options.platformVersion || 'unknown',
        session_id: platformSessionId,
      },

      metadata: {
        title: title,
        summary: options.summary || '',
        tags: tags,
        participants: participants,
        working_directory: options.workingDirectory || '',
        git_context: extractGitContext(entries),
      },

      flow_state: {
        current: options.flowState || 'hypothesis',
        quality_score: null,
      },
    },

    messages: messages,

    fidelity: {
      level: 'standard',
      preserved_fields: ['thinking', 'tool_uses', 'usage_metrics', 'parent_id'],
    },
  };

  return canonical;
}

/**
 * Convert and save to YAML file
 */
export function convertAndSave(jsonlPath, outputPath, options = {}) {
  const canonical = convertClaudeCodeToCanonical(jsonlPath, options);

  // Generate output filename if directory provided
  let finalOutputPath = outputPath;
  if (fs.statSync(outputPath).isDirectory()) {
    const date = new Date(canonical.session.created_at).toISOString().split('T')[0];
    const slug = slugify(canonical.session.metadata.title);
    const shortId = canonical.session.source.session_id.substring(0, 8);
    const filename = `${date}_${slug}_${shortId}.yaml`;
    finalOutputPath = path.join(outputPath, filename);
  }

  // Write YAML
  const yamlContent = yaml.dump(canonical, {
    indent: 2,
    lineWidth: -1, // No line wrapping
    noRefs: true,
  });

  fs.writeFileSync(finalOutputPath, yamlContent, 'utf-8');

  return {
    canonicalPath: finalOutputPath,
    sessionId: canonical.session.id,
    title: canonical.session.metadata.title,
  };
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: claude-code.js <input.jsonl> <output.yaml|output-dir/>');
    process.exit(1);
  }

  const [inputPath, outputPath] = args;

  try {
    const result = convertAndSave(inputPath, outputPath);
    console.log(`✅ Converted: ${result.title}`);
    console.log(`   Session ID: ${result.sessionId}`);
    console.log(`   Output: ${result.canonicalPath}`);
  } catch (err) {
    console.error(`❌ Conversion failed: ${err.message}`);
    process.exit(1);
  }
}
