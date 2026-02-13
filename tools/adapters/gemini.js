#!/usr/bin/env node

/**
 * Gemini (Google) → Canonical YAML Converter
 *
 * Converts Google Gemini/Bard export (Google Takeout) to SAGE canonical format.
 *
 * Input: Saved Gemini Activity.json from Google Takeout
 * Output: Canonical YAML files in target directory
 *
 * Usage:
 *   node gemini.js /path/to/gemini-export.json /path/to/output/dir
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';

/**
 * Convert Gemini export to canonical format
 */
export async function convertGemini(sourcePath, targetDir, options = {}) {
  const fidelity = options.fidelity || 'standard';

  console.log(`Reading Gemini export: ${sourcePath}`);
  const rawData = await fs.readFile(sourcePath, 'utf-8');
  const geminiData = JSON.parse(rawData);

  const sessions = [];

  // Gemini export can be array or object with conversations property
  const conversations = Array.isArray(geminiData) ? geminiData : geminiData.conversations || [];

  for (const conversation of conversations) {
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
      console.error(`✗ Failed to convert conversation ${conversation.conversationId || 'unknown'}:`, err.message);
    }
  }

  console.log(`\n✓ Converted ${sessions.length} Gemini conversations`);
  return sessions;
}

/**
 * Convert single Gemini conversation to canonical format
 */
async function convertConversation(conversation, fidelity) {
  const sessionId = uuidv4();
  const createdAt = convertTimestamp(conversation.createTime || conversation.create_time);
  const updatedAt = convertTimestamp(conversation.updateTime || conversation.update_time);

  // Convert turns to messages (Gemini uses "turns" instead of "messages")
  const turns = conversation.turns || [];
  const messages = flattenTurns(turns);

  // Extract model info
  const model = conversation.model || 'gemini-pro';

  const canonical = {
    session: {
      id: sessionId,
      canonical_version: '1.0',
      created_at: createdAt,
      updated_at: updatedAt,

      source: {
        platform: 'gemini',
        platform_version: model,
        session_id: conversation.conversationId || conversation.id,
        export_method: 'google-takeout'
      },

      metadata: {
        title: conversation.title || generateTitle(messages),
        summary: null,
        tags: [],
        participants: ['user', 'assistant'],
        model: model,
        conversation_id: conversation.conversationId || conversation.id
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
        ? ['citations', 'web_search', 'images', 'metadata']
        : ['citations', 'web_search']
    }
  };

  return canonical;
}

/**
 * Flatten Gemini "turns" into messages array
 * Each turn contains userQuery + geminiResponse
 */
function flattenTurns(turns) {
  const messages = [];

  for (const turn of turns) {
    const timestamp = convertTimestamp(turn.timestamp || turn.createTime);

    // User message
    if (turn.userQuery) {
      messages.push({
        id: turn.turnId || uuidv4(),
        timestamp: timestamp,
        role: 'user',
        content: extractUserContent(turn.userQuery),
        images: extractImages(turn.userQuery)
      });
    }

    // Assistant message (Gemini response)
    if (turn.geminiResponse || turn.response) {
      const response = turn.geminiResponse || turn.response;
      messages.push({
        id: uuidv4(),
        timestamp: timestamp,
        role: 'assistant',
        content: extractAssistantContent(response),
        citations: extractCitations(response),
        web_search: extractWebSearch(response),
        images: extractResponseImages(response)
      });
    }
  }

  return messages;
}

/**
 * Convert Gemini message to canonical format
 */
function convertMessage(msg, fidelity) {
  const canonical = {
    id: uuidv4(),  // Generate new UUID for canonical
    parent_id: null,  // Gemini doesn't expose parent relationships
    timestamp: msg.timestamp,
    role: msg.role,
    content: msg.content || null
  };

  // Add Gemini-specific features
  if (msg.citations && msg.citations.length > 0) {
    canonical.citations = msg.citations;
  }

  if (msg.web_search) {
    canonical.web_search = msg.web_search;
  }

  if (msg.images && msg.images.length > 0) {
    canonical.images = msg.images;
  }

  // Preserve original ID if full fidelity
  if (fidelity === 'full' && msg.id) {
    canonical.original_id = msg.id;
  }

  return canonical;
}

/**
 * Extract content from user query
 */
function extractUserContent(userQuery) {
  if (typeof userQuery === 'string') return userQuery;
  if (userQuery.text) return userQuery.text;
  if (userQuery.prompt) return userQuery.prompt;
  return null;
}

/**
 * Extract content from Gemini response
 */
function extractAssistantContent(response) {
  if (typeof response === 'string') return response;
  if (response.text) return response.text;
  if (response.content) return response.content;

  // Handle structured response
  if (response.candidates && response.candidates.length > 0) {
    const candidate = response.candidates[0];
    if (candidate.content && candidate.content.parts) {
      return candidate.content.parts
        .filter(p => p.text)
        .map(p => p.text)
        .join('\n\n');
    }
  }

  return null;
}

/**
 * Extract citations from Gemini response
 */
function extractCitations(response) {
  if (!response.citations && !response.citationMetadata) return null;

  const citations = response.citations || response.citationMetadata?.citationSources || [];

  return citations.map(citation => ({
    source: citation.source || citation.uri || citation.url,
    title: citation.title,
    start_index: citation.startIndex,
    end_index: citation.endIndex
  }));
}

/**
 * Extract web search metadata
 */
function extractWebSearch(response) {
  if (!response.webSearch && !response.grounding) return null;

  const webSearch = response.webSearch || response.grounding;

  return {
    query: webSearch.query || webSearch.searchQuery,
    results: webSearch.results || webSearch.groundingChunks || []
  };
}

/**
 * Extract images from user query
 */
function extractImages(userQuery) {
  if (!userQuery.images && !userQuery.image) return null;

  const images = userQuery.images || (userQuery.image ? [userQuery.image] : []);

  return images.map(img => ({
    url: img.url || img.uri,
    mime_type: img.mimeType || img.type,
    alt_text: img.altText || img.description
  }));
}

/**
 * Extract images from Gemini response
 */
function extractResponseImages(response) {
  if (!response.images && !response.inlineData) return null;

  const images = response.images || (response.inlineData ? [response.inlineData] : []);

  return images.map(img => ({
    url: img.url || img.uri,
    mime_type: img.mimeType || img.type,
    data: img.data  // Base64 encoded if included
  }));
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
  return 'Untitled Gemini Session';
}

/**
 * Convert various timestamp formats to ISO 8601
 */
function convertTimestamp(timestamp) {
  if (!timestamp) return new Date().toISOString();

  // Already ISO 8601
  if (typeof timestamp === 'string' && timestamp.includes('T')) {
    return timestamp;
  }

  // Unix timestamp (seconds)
  if (typeof timestamp === 'number') {
    return new Date(timestamp * 1000).toISOString();
  }

  // Try parsing as date string
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return new Date().toISOString();
  }
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
    console.error('Usage: node gemini.js <source-file> <target-dir>');
    console.error('');
    console.error('Example:');
    console.error('  node gemini.js ~/Downloads/gemini-takeout.json ~/makanui-knowledge/');
    process.exit(1);
  }

  convertGemini(sourcePath, targetDir)
    .then(() => {
      console.log('\n✓ Gemini import complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n✗ Error:', err.message);
      process.exit(1);
    });
}
