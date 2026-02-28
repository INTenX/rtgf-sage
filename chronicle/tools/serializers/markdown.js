#!/usr/bin/env node

/**
 * Canonical YAML → Markdown Serializer
 *
 * Converts RCM canonical sessions to AI-native Markdown format.
 * Output is optimized for:
 * - AnythingLLM/RAG ingestion
 * - Human reading
 * - LLM context window efficiency
 *
 * Includes YAML frontmatter for metadata preservation.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import matter from 'gray-matter';

/**
 * Parse canonical YAML session
 */
function parseCanonicalSession(yamlPath) {
  const content = fs.readFileSync(yamlPath, 'utf-8');
  return yaml.load(content);
}

/**
 * Format timestamp for human reading
 */
function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

/**
 * Format message role for display
 */
function formatRole(role, model = null) {
  switch (role) {
    case 'user':
      return '👤 **User**';
    case 'assistant':
      return model ? `🤖 **Assistant** (${model})` : '🤖 **Assistant**';
    case 'system':
      return '⚙️ **System**';
    case 'tool':
      return '🔧 **Tool**';
    default:
      return `**${role}**`;
  }
}

/**
 * Convert message content to markdown
 */
function renderMessage(message, index, total) {
  const parts = [];

  // Message header
  const role = formatRole(message.role, message.model);
  const timestamp = formatTimestamp(message.timestamp);
  parts.push(`### Message ${index + 1}/${total}`);
  parts.push(`${role} • ${timestamp}`);
  parts.push('');

  // Thinking block (collapsible)
  if (message.thinking) {
    parts.push('<details>');
    parts.push('<summary>💭 Extended Thinking</summary>');
    parts.push('');
    parts.push('```thinking');
    parts.push(message.thinking.trim());
    parts.push('```');
    parts.push('</details>');
    parts.push('');
  }

  // Main content
  if (message.content) {
    parts.push(message.content.trim());
    parts.push('');
  }

  // Tool uses
  if (message.tool_uses && message.tool_uses.length > 0) {
    parts.push('#### 🔧 Tool Uses');
    parts.push('');

    message.tool_uses.forEach((tool, i) => {
      parts.push(`**${i + 1}. ${tool.tool_name}**`);
      parts.push('');
      parts.push('```json');
      parts.push(JSON.stringify(tool.tool_input, null, 2));
      parts.push('```');
      parts.push('');

      if (tool.tool_output) {
        parts.push('<details>');
        parts.push('<summary>Output</summary>');
        parts.push('');
        parts.push('```');
        parts.push(tool.tool_output);
        parts.push('```');
        parts.push('</details>');
        parts.push('');
      }
    });
  }

  // Usage metrics (compact)
  if (message.usage) {
    const { input_tokens, output_tokens, cache_read_tokens, cache_write_tokens } = message.usage;
    const total = input_tokens + output_tokens;
    const cached = cache_read_tokens || 0;

    parts.push(`<sub>Tokens: ${total.toLocaleString()} (in: ${input_tokens.toLocaleString()}, out: ${output_tokens.toLocaleString()}` +
      (cached > 0 ? `, cached: ${cached.toLocaleString()}` : '') + ')</sub>');
    parts.push('');
  }

  parts.push('---');
  parts.push('');

  return parts.join('\n');
}

/**
 * Convert canonical session to Markdown
 */
export function convertCanonicalToMarkdown(canonicalSession, options = {}) {
  const { session, messages, fidelity } = canonicalSession;

  // Build frontmatter (metadata)
  const frontmatter = {
    session_id: session.id,
    canonical_version: session.canonical_version,
    platform: session.source.platform,
    platform_session_id: session.source.session_id,
    created_at: session.created_at,
    updated_at: session.updated_at,
    title: session.metadata.title,
    tags: session.metadata.tags || [],
    participants: session.metadata.participants || [],
    flow_state: session.flow_state.current,
    quality_score: session.flow_state.quality_score,
    working_directory: session.metadata.working_directory || '',
    fidelity: fidelity.level,
  };

  // Build markdown body
  const body = [];

  // Title
  body.push(`# ${session.metadata.title}`);
  body.push('');

  // Summary (if exists)
  if (session.metadata.summary) {
    body.push('## Summary');
    body.push('');
    body.push(session.metadata.summary);
    body.push('');
  }

  // Session info
  body.push('## Session Information');
  body.push('');
  body.push(`- **Platform:** ${session.source.platform}`);
  body.push(`- **Created:** ${formatTimestamp(session.created_at)}`);
  body.push(`- **Messages:** ${messages.length}`);
  body.push(`- **Participants:** ${session.metadata.participants.join(', ')}`);

  if (session.metadata.tags && session.metadata.tags.length > 0) {
    body.push(`- **Tags:** ${session.metadata.tags.map(t => `\`${t}\``).join(', ')}`);
  }

  if (session.metadata.working_directory) {
    body.push(`- **Working Directory:** \`${session.metadata.working_directory}\``);
  }

  if (session.metadata.git_context && session.metadata.git_context.branch) {
    body.push(`- **Git Branch:** \`${session.metadata.git_context.branch}\``);
  }

  body.push('');

  // Conversation
  body.push('## Conversation');
  body.push('');

  messages.forEach((msg, i) => {
    body.push(renderMessage(msg, i, messages.length));
  });

  // Footer
  body.push('---');
  body.push('');
  body.push('*This session was archived using RCM (Runtime Context Management)*');
  body.push(`*Session ID: \`${session.id}\` | Flow State: \`${session.flow_state.current}\` | Fidelity: \`${fidelity.level}\`*`);

  // Combine with frontmatter using gray-matter
  const markdown = matter.stringify(body.join('\n'), frontmatter);

  return markdown;
}

/**
 * Convert and save YAML to Markdown
 */
export function convertAndSave(yamlPath, outputPath, options = {}) {
  const canonical = parseCanonicalSession(yamlPath);

  // Generate output filename if directory provided
  let finalOutputPath = outputPath;
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
    const yamlFilename = path.basename(yamlPath, '.yaml');
    const mdFilename = `${yamlFilename}.md`;
    finalOutputPath = path.join(outputPath, mdFilename);
  } else if (!outputPath.endsWith('.md')) {
    finalOutputPath = `${outputPath}.md`;
  }

  // Convert
  const markdown = convertCanonicalToMarkdown(canonical, options);

  // Write
  fs.writeFileSync(finalOutputPath, markdown, 'utf-8');

  return {
    markdownPath: finalOutputPath,
    title: canonical.session.metadata.title,
    sessionId: canonical.session.id,
  };
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: markdown.js <input.yaml> <output.md|output-dir/>');
    process.exit(1);
  }

  const [inputPath, outputPath] = args;

  try {
    const result = convertAndSave(inputPath, outputPath);
    console.log(`✅ Exported to Markdown: ${result.title}`);
    console.log(`   Session ID: ${result.sessionId}`);
    console.log(`   Output: ${result.markdownPath}`);
  } catch (err) {
    console.error(`❌ Export failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}
