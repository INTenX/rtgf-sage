#!/usr/bin/env node

/**
 * RCM Web Dashboard Server
 *
 * Simple Express API server for RCM session management.
 * Serves static frontend and provides REST API for session data.
 *
 * Usage: node server.js [rcm-root-directory] [port]
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RCM_ROOT = process.argv[2] || process.cwd();
const PORT = process.argv[3] || 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load sessions from a flow state
function loadSessions(state) {
  const flowDir = path.join(RCM_ROOT, 'rcm', 'flows', state);

  if (!fs.existsSync(flowDir)) {
    return [];
  }

  const files = fs.readdirSync(flowDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      try {
        const fullPath = path.join(flowDir, f);
        const stats = fs.statSync(fullPath);
        const { data } = matter(fs.readFileSync(fullPath, 'utf-8'));

        return {
          filename: f,
          path: fullPath,
          size: stats.size,
          modified: stats.mtime,
          title: data.title || 'Untitled',
          sessionId: data.id,
          shortId: f.split('_').pop().replace('.md', '').substring(0, 8),
          tags: data.tags || [],
          created: data.created,
          platform: data.platform || 'unknown',
          messageCount: data.message_count || 0,
          flowState: data.flow_state || state,
          qualityScore: data.quality_score,
        };
      } catch (err) {
        console.error(`Error loading session ${f}:`, err.message);
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.modified) - new Date(a.modified));

  return files;
}

// API Routes

// Get state counts
app.get('/api/stats', (req, res) => {
  const stats = {
    hypothesis: loadSessions('hypothesis').length,
    codified: loadSessions('codified').length,
    validated: loadSessions('validated').length,
    promoted: loadSessions('promoted').length,
  };

  res.json(stats);
});

// Get sessions by state
app.get('/api/sessions/:state', (req, res) => {
  const { state } = req.params;
  const validStates = ['hypothesis', 'codified', 'validated', 'promoted'];

  if (!validStates.includes(state)) {
    return res.status(400).json({ error: 'Invalid state' });
  }

  const sessions = loadSessions(state);
  res.json(sessions);
});

// Get all sessions
app.get('/api/sessions', (req, res) => {
  const all = {
    hypothesis: loadSessions('hypothesis'),
    codified: loadSessions('codified'),
    validated: loadSessions('validated'),
    promoted: loadSessions('promoted'),
  };

  res.json(all);
});

// Get single session details
app.get('/api/session/:id', (req, res) => {
  const { id } = req.params;
  const states = ['hypothesis', 'codified', 'validated', 'promoted'];

  for (const state of states) {
    const sessions = loadSessions(state);
    const session = sessions.find(s => s.shortId === id || s.sessionId === id);

    if (session) {
      // Load full content
      const content = fs.readFileSync(session.path, 'utf-8');
      const { data, content: body } = matter(content);

      return res.json({
        ...session,
        frontmatter: data,
        rawMarkdown: body,
      });
    }
  }

  res.status(404).json({ error: 'Session not found' });
});

// Search sessions
app.get('/api/search', (req, res) => {
  const { q, tags, platform, state } = req.query;

  let sessions = [];
  const statesToSearch = state ? [state] : ['hypothesis', 'codified', 'validated', 'promoted'];

  for (const s of statesToSearch) {
    sessions = sessions.concat(loadSessions(s));
  }

  // Filter by query
  if (q) {
    const query = q.toLowerCase();
    sessions = sessions.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.tags.some(t => t.toLowerCase().includes(query))
    );
  }

  // Filter by tags
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase());
    sessions = sessions.filter(s =>
      tagList.some(tag => s.tags.some(t => t.toLowerCase().includes(tag)))
    );
  }

  // Filter by platform
  if (platform) {
    sessions = sessions.filter(s => s.platform === platform);
  }

  res.json(sessions);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    rcmRoot: RCM_ROOT,
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🌐 RCM Web Dashboard');
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   RCM Root: ${RCM_ROOT}`);
  console.log('');
  console.log('   API Endpoints:');
  console.log(`     GET /api/stats          - Flow state counts`);
  console.log(`     GET /api/sessions       - All sessions`);
  console.log(`     GET /api/sessions/:state - Sessions by state`);
  console.log(`     GET /api/session/:id    - Session details`);
  console.log(`     GET /api/search?q=...   - Search sessions`);
  console.log('');
  console.log('   Press Ctrl+C to stop');
  console.log('');
});
