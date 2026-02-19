#!/usr/bin/env node

/**
 * Link existing imported sessions to flows/hypothesis/
 */

import fs from 'fs';
import path from 'path';

const targetRoot = '/home/cbasta/test-knowledge';
const canonicalDir = path.join(targetRoot, 'rcm', 'archive', 'canonical', '2026', '02');
const hypothesisDir = path.join(targetRoot, 'rcm', 'flows', 'hypothesis');

// Ensure hypothesis directory exists
if (!fs.existsSync(hypothesisDir)) {
  fs.mkdirSync(hypothesisDir, { recursive: true });
}

// Find all canonical sessions
const sessions = fs.readdirSync(canonicalDir)
  .filter(f => f.endsWith('.yaml'));

console.log(`🔗 Linking ${sessions.length} sessions to flows/hypothesis/`);
console.log('');

let linkedCount = 0;

for (const session of sessions) {
  const canonicalPath = path.join(canonicalDir, session);
  const linkPath = path.join(hypothesisDir, session);

  // Remove existing link if present
  if (fs.existsSync(linkPath)) {
    fs.unlinkSync(linkPath);
  }

  // Create symlink
  fs.symlinkSync(path.resolve(canonicalPath), linkPath);
  linkedCount++;
  console.log(`   ✅ ${session}`);
}

console.log('');
console.log(`✅ Linked ${linkedCount} sessions to flows/hypothesis/`);
