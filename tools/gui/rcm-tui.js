#!/usr/bin/env node

/**
 * RCM Terminal UI
 *
 * Interactive session browser with keyboard navigation.
 * Uses blessed for TUI components.
 *
 * Usage: rcm-tui [rcm-root-directory]
 */

import blessed from 'blessed';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { flowTransition } from '../lib/git-operations.js';

const RCM_ROOT = process.argv[2] || process.cwd();

// Load sessions from a flow state
function loadSessions(state) {
  const flowDir = path.join(RCM_ROOT, 'rcm', 'flows', state);

  if (!fs.existsSync(flowDir)) {
    return [];
  }

  const files = fs.readdirSync(flowDir)
    .filter(f => f.endsWith('.yaml'))
    .map(f => {
      try {
        const fullPath = path.join(flowDir, f);
        const stats = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const session = yaml.load(content);

        return {
          filename: f,
          path: fullPath,
          size: stats.size,
          modified: stats.mtime,
          title: session.session?.metadata?.title || 'Untitled',
          sessionId: session.session?.id,
          shortId: f.split('_').pop().replace('.yaml', '').substring(0, 8),
          tags: session.session?.metadata?.tags || [],
          created: session.session?.created_at,
          platform: session.session?.source?.platform || 'unknown',
          messageCount: session.messages?.length || 0,
          flowState: session.session?.flow_state?.current || state,
          qualityScore: session.session?.flow_state?.quality_score,
          content: content,
        };
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.modified - a.modified);

  return files;
}

// Count sessions in each state
function getStateCounts() {
  return {
    hypothesis: loadSessions('hypothesis').length,
    codified: loadSessions('codified').length,
    validated: loadSessions('validated').length,
    promoted: loadSessions('promoted').length,
  };
}

// Create screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'RCM Session Manager'
});

// Header box
const header = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: 3,
  content: '',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'blue',
    border: {
      fg: 'blue'
    }
  }
});

// Status bar
const statusBar = blessed.box({
  bottom: 0,
  left: 0,
  width: '100%',
  height: 3,
  content: '{center}[↑↓] Navigate  [Enter] Details  [P] Promote  [E] Export  [T] Tags  [Tab] Change State  [Q] Quit{/center}',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: 'gray'
    }
  }
});

// Session list
const sessionList = blessed.list({
  top: 3,
  left: 0,
  width: '60%',
  height: '100%-6',
  label: ' Sessions ',
  keys: true,
  vi: true,
  mouse: true,
  border: {
    type: 'line'
  },
  style: {
    selected: {
      bg: 'blue',
      fg: 'white'
    },
    border: {
      fg: 'cyan'
    }
  },
  scrollbar: {
    ch: '█',
    style: {
      bg: 'cyan'
    }
  }
});

// Preview box
const previewBox = blessed.box({
  top: 3,
  left: '60%',
  width: '40%',
  height: '100%-6',
  label: ' Preview ',
  content: '',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    border: {
      fg: 'cyan'
    }
  },
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: '█',
    style: {
      bg: 'cyan'
    }
  }
});

// State variables
let currentState = 'hypothesis';
let sessions = [];
let selectedSession = null;

// Update header
function updateHeader() {
  const counts = getStateCounts();
  header.setContent(
    `{center}{bold}RCM Session Manager{/bold} - ${RCM_ROOT}{/center}\n` +
    `{center}[Hypothesis: ${counts.hypothesis}] [Codified: ${counts.codified}] [Validated: ${counts.validated}] [Promoted: ${counts.promoted}]{/center}`
  );
  screen.render();
}

// Load and display sessions
function refreshSessions() {
  sessions = loadSessions(currentState);

  const items = sessions.map(s => {
    const sizeKB = (s.size / 1024).toFixed(1);
    const tagsStr = s.tags.length > 0 ? ` [${s.tags.slice(0, 2).join(', ')}]` : '';
    return `${s.title.substring(0, 40).padEnd(40)} ${sizeKB.padStart(7)}KB ${s.platform.padStart(12)}${tagsStr}`;
  });

  sessionList.setItems(items);
  sessionList.setLabel(` Sessions (${currentState}) - ${sessions.length} total `);

  if (sessions.length > 0) {
    sessionList.select(0);
    updatePreview(0);
  } else {
    previewBox.setContent('\n  No sessions in this state.');
  }

  updateHeader();
  screen.render();
}

// Update preview
function updatePreview(index) {
  if (index < 0 || index >= sessions.length) return;

  selectedSession = sessions[index];
  const s = selectedSession;

  const sizeKB = (s.size / 1024).toFixed(1);
  const created = new Date(s.created).toLocaleString();
  const modified = s.modified.toLocaleString();

  let preview = `{bold}${s.title}{/bold}\n\n`;
  preview += `ID: ${s.shortId}\n`;
  preview += `Size: ${sizeKB} KB\n`;
  preview += `Platform: ${s.platform}\n`;
  preview += `Messages: ${s.messageCount}\n`;
  preview += `Created: ${created}\n`;
  preview += `Modified: ${modified}\n`;
  preview += `State: ${s.flowState}\n`;

  if (s.qualityScore !== null) {
    preview += `Quality: ${s.qualityScore}/100\n`;
  }

  if (s.tags.length > 0) {
    preview += `\n{bold}Tags:{/bold}\n${s.tags.map(t => `  • ${t}`).join('\n')}\n`;
  }

  // Extract first user message for preview
  try {
    const session = yaml.load(s.content);
    const firstUserMsg = session.messages?.find(m => m.role === 'user' && m.content);
    if (firstUserMsg) {
      const contentPreview = firstUserMsg.content.substring(0, 200).replace(/\n/g, ' ');
      preview += `\n{bold}First Message:{/bold}\n${contentPreview}...\n`;
    }
  } catch (err) {
    // Ignore parse errors
  }

  previewBox.setContent(preview);
  screen.render();
}

// Promote session dialog
function showPromoteDialog() {
  if (!selectedSession) return;

  const states = {
    hypothesis: ['codified'],
    codified: ['validated', 'hypothesis'],
    validated: ['promoted', 'codified'],
    promoted: ['validated']
  };

  const availableStates = states[currentState] || [];

  if (availableStates.length === 0) {
    showMessage('No valid transitions from this state.');
    return;
  }

  const promptBox = blessed.prompt({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 60,
    height: 10,
    label: ' Promote Session ',
    border: {
      type: 'line'
    },
    style: {
      border: {
        fg: 'green'
      }
    }
  });

  promptBox.input(`Promote to: ${availableStates.join(', ')}\n\nEnter target state:`, '', (err, value) => {
    if (err || !value) return;

    const toState = value.trim().toLowerCase();

    if (!availableStates.includes(toState)) {
      showMessage(`Invalid state. Must be: ${availableStates.join(', ')}`);
      return;
    }

    try {
      flowTransition(RCM_ROOT, selectedSession.path, currentState, toState, {
        tags: selectedSession.tags,
      });

      showMessage(`✓ Promoted to ${toState}!`);
      refreshSessions();
    } catch (err) {
      showMessage(`✗ Error: ${err.message}`);
    }
  });

  screen.render();
}

// Show message
function showMessage(msg) {
  const msgBox = blessed.message({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 60,
    height: 8,
    label: ' Message ',
    border: {
      type: 'line'
    },
    style: {
      border: {
        fg: 'yellow'
      }
    }
  });

  msgBox.display(msg, 2, () => {
    screen.render();
  });
}

// Export session
function exportSession() {
  if (!selectedSession) return;

  const outputDir = path.join(RCM_ROOT, 'exports');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, selectedSession.filename.replace('.yaml', '.md'));

  // Simple markdown export (you can import the full serializer here)
  const content = `# ${selectedSession.title}\n\n` +
    `**Session ID:** ${selectedSession.shortId}\n` +
    `**Platform:** ${selectedSession.platform}\n` +
    `**Messages:** ${selectedSession.messageCount}\n` +
    `**Tags:** ${selectedSession.tags.join(', ')}\n\n` +
    `[Full session available in RCM archive]`;

  fs.writeFileSync(outputFile, content, 'utf-8');
  showMessage(`✓ Exported to:\n${outputFile}`);
}

// Key bindings
sessionList.key(['escape', 'q'], () => {
  return process.exit(0);
});

sessionList.on('select', (item, index) => {
  updatePreview(index);
});

sessionList.key('p', () => {
  showPromoteDialog();
});

sessionList.key('e', () => {
  exportSession();
});

sessionList.key('tab', () => {
  const states = ['hypothesis', 'codified', 'validated', 'promoted'];
  const currentIndex = states.indexOf(currentState);
  currentState = states[(currentIndex + 1) % states.length];
  refreshSessions();
});

sessionList.key('r', () => {
  refreshSessions();
  showMessage('✓ Refreshed!');
});

// Append elements
screen.append(header);
screen.append(sessionList);
screen.append(previewBox);
screen.append(statusBar);

// Initial load
refreshSessions();
sessionList.focus();

// Render
screen.render();
