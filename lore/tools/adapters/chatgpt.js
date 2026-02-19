#!/usr/bin/env node

/**
 * ChatGPT (OpenAI) → Canonical YAML Converter
 *
 * Converts ChatGPT official export format (conversations.json) to LORE canonical format.
 *
 * Input: OpenAI conversations.json export file
 * Output: Canonical YAML files in target directory
 *
 * Usage:
 *   node chatgpt.js /path/to/conversations.json /path/to/output/dir
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';

/**
 * Convert ChatGPT export to canonical format
 */
export async function convertChatGPT(sourcePath, targetDir, options = {}) {
  const fidelity = options.fidelity || 'standard';

  console.log(`Reading ChatGPT export: ${sourcePath}`);
  const rawData = await fs.readFile(sourcePath, 'utf-8');
  const chatgptData = JSON.parse(rawData);

  const sessions = [];

  for (const conversation of chatgptData) {
    try {
      const canonical = await convertConversation(conversation, fidelity);
      sessions.push(canonical);

      // Save canonical YAML
      const yearMonth = canonical.session.created_at.substring(0, 7); // "2026-02"
      const [year, month] = yearMonth.split('-');
      const outputDir = path.join(targetDir, 'rcm', 'archive', 'canonical', year, month);
      await fs.mkdir(outputDir, { recursive: true });

      const sessionShortId = canonical.session.id.substring(0, 8);
      const titleSlug = slugify(canonical.session.metadata.title);
      const filename = `${yearMonth}-${titleSlug}_${sessionShortId}.yaml`;
      const outputPath = path.join(outputDir, filename);

      await fs.writeFile(outputPath, yaml.dump(canonical, { lineWidth: -1, noRefs: true }));

      console.log(`✓ Converted: ${canonical.session.metadata.title} (${canonical.messages.length} messages)`);
    } catch (err) {
      console.error(`✗ Failed to convert conversation ${conversation.id}:`, err.message);
    }
  }

  console.log(`\n✓ Converted ${sessions.length} ChatGPT conversations`);
  return sessions;
}

/**
 * Convert single ChatGPT conversation to canonical format
 */
async function convertConversation(conversation, fidelity) {
  const sessionId = uuidv4();
  const createdAt = convertTimestamp(conversation.create_time);
  const updatedAt = convertTimestamp(conversation.update_time);

  // Extract messages from mapping (tree structure)
  const messages = flattenMessageTree(conversation.mapping);

  // Determine model from first assistant message
  const firstAssistant = messages.find(m => m.role === 'assistant');
  const model = firstAssistant?.model || extractModel(conversation) || 'unknown';

  const canonical = {
    session: {
      id: sessionId,
      canonical_version: '1.0',
      created_at: createdAt,
      updated_at: updatedAt,

      source: {
        platform: 'chatgpt',
        platform_version: model,
        session_id: conversation.id,
        export_method: 'official'
      },

      metadata: {
        title: conversation.title || generateTitle(messages),
        summary: null,
        tags: [],
        participants: ['user', 'assistant'],
        model: model,
        conversation_id: conversation.id
      },

      flow_state: {
        current: 'hypothesis',
        quality_score: null
      }
    },

    messages: messages.map(msg => convertMessage(msg, fidelity)),

    fidelity: {
      level: fidelity,
      preserved_fields: fidelity === 'full'
        ? ['usage_metrics', 'finish_details', 'model', 'weights']
        : ['usage_metrics', 'model']
    }
  };

  return canonical;
}

/**
 * Flatten ChatGPT's tree message structure to linear array
 */
function flattenMessageTree(mapping) {
  const messages = [];
  const visited = new Set();

  // Find root node (no parent)
  let rootId = null;
  for (const [id, node] of Object.entries(mapping)) {
    if (!node.parent || node.parent === null) {
      rootId = id;
      break;
    }
  }

  if (!rootId) {
    // Fallback: use first node
    rootId = Object.keys(mapping)[0];
  }

  // Traverse tree depth-first following first child
  function traverse(nodeId) {
    if (!nodeId || visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = mapping[nodeId];
    if (!node || !node.message) {
      // Empty node, check children
      if (node && node.children && node.children.length > 0) {
        traverse(node.children[0]);
      }
      return;
    }

    const message = node.message;

    // Skip system messages unless full fidelity
    if (message.author.role === 'system') {
      if (node.children && node.children.length > 0) {
        traverse(node.children[0]);
      }
      return;
    }

    // Extract content
    const content = extractContent(message);
    if (!content && message.author.role !== 'assistant') {
      // Skip empty messages unless assistant (might have tool calls)
      if (node.children && node.children.length > 0) {
        traverse(node.children[0]);
      }
      return;
    }

    messages.push({
      id: message.id,
      parent_id: node.parent,
      timestamp: convertTimestamp(message.create_time),
      role: message.author.role,
      content: content,
      model: message.metadata?.model_slug,
      usage: extractUsage(message),
      finish_details: message.metadata?.finish_details
    });

    // Follow first child (linear conversation path)
    if (node.children && node.children.length > 0) {
      traverse(node.children[0]);
    }
  }

  traverse(rootId);
  return messages;
}

/**
 * Convert ChatGPT message to canonical format
 */
function convertMessage(msg, fidelity) {
  const canonical = {
    id: uuidv4(),  // Generate new UUID for canonical
    parent_id: null,  // Linearized, so parent relationships simplified
    timestamp: msg.timestamp,
    role: msg.role,
    content: msg.content || null,
    model: msg.model
  };

  // Add usage stats if available
  if (msg.usage) {
    canonical.usage = msg.usage;
  }

  // Add finish details if full fidelity
  if (fidelity === 'full' && msg.finish_details) {
    canonical.finish_details = msg.finish_details;
  }

  // Preserve original IDs in metadata if full fidelity
  if (fidelity === 'full') {
    canonical.original_id = msg.id;
    canonical.original_parent_id = msg.parent_id;
  }

  return canonical;
}

/**
 * Extract content from ChatGPT message
 */
function extractContent(message) {
  if (!message.content || !message.content.parts) {
    return null;
  }

  const parts = message.content.parts;
  if (Array.isArray(parts) && parts.length > 0) {
    // Join all text parts
    return parts.filter(p => typeof p === 'string').join('\n\n');
  }

  return null;
}

/**
 * Extract usage statistics
 */
function extractUsage(message) {
  // ChatGPT doesn't expose token counts in exports (only via API)
  // Estimate if metadata available
  if (message.metadata && message.metadata.finish_details) {
    return {
      input_tokens: null,
      output_tokens: null,
      estimated: true
    };
  }
  return null;
}

/**
 * Extract model from conversation metadata
 */
function extractModel(conversation) {
  // Try to find model in various locations
  if (conversation.model) return conversation.model;

  // Check first message
  const firstNode = Object.values(conversation.mapping || {})[0];
  if (firstNode?.message?.metadata?.model_slug) {
    return firstNode.message.metadata.model_slug;
  }

  return 'unknown';
}

/**
 * Generate title from first user message
 */
function generateTitle(messages) {
  const firstUser = messages.find(m => m.role === 'user');
  if (firstUser && firstUser.content) {
    const truncated = firstUser.content.substring(0, 100);
    return truncated.length < firstUser.content.length
      ? truncated + '...'
      : truncated;
  }
  return 'Untitled ChatGPT Session';
}

/**
 * Convert Unix timestamp (float seconds) to ISO 8601
 */
function convertTimestamp(timestamp) {
  if (!timestamp) return new Date().toISOString();

  const date = new Date(timestamp * 1000);  // Convert seconds to milliseconds
  return date.toISOString();
}

/**
 * Convert title to filesystem-safe slug
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const [sourcePath, targetDir] = process.argv.slice(2);

  if (!sourcePath || !targetDir) {
    console.error('Usage: node chatgpt.js <source-file> <target-dir>');
    console.error('');
    console.error('Example:');
    console.error('  node chatgpt.js ~/Downloads/conversations.json ~/makanui-knowledge/');
    process.exit(1);
  }

  convertChatGPT(sourcePath, targetDir)
    .then(() => {
      console.log('\n✓ ChatGPT import complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n✗ Error:', err.message);
      process.exit(1);
    });
}
