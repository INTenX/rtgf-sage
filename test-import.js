#!/usr/bin/env node

/**
 * Simple test script for RCM import (no CLI dependencies)
 */

import fs from 'fs';
import path from 'path';
import { convertAndSave } from './tools/adapters/claude-code.js';

const SOURCE = process.argv[2] || '~/.claude/projects/-home-cbasta/55fc0e3d-f168-4d13-8cea-858a5cd0d672.jsonl';
const TARGET = process.argv[3] || '/home/cbasta/test-knowledge/rcm/archive/canonical/2026/02';

// Expand ~ if present
const sourceFile = SOURCE.replace(/^~/, process.env.HOME);

console.log('🚀 RCM Import Test (Core Converter)');
console.log(`   Source: ${sourceFile}`);
console.log(`   Target: ${TARGET}`);
console.log('');

try {
  // Ensure target directory exists
  fs.mkdirSync(TARGET, { recursive: true });

  // Convert
  const result = convertAndSave(sourceFile, TARGET, {
    flowState: 'hypothesis',
    tags: ['openclaw', 'workflow', 'planning'],
  });

  console.log('✅ Conversion successful!');
  console.log(`   Title: ${result.title}`);
  console.log(`   Session ID: ${result.sessionId}`);
  console.log(`   Output: ${result.canonicalPath}`);
  console.log('');

  // Read back and verify
  const content = fs.readFileSync(result.canonicalPath, 'utf-8');
  const lines = content.split('\n').length;
  const size = (fs.statSync(result.canonicalPath).size / 1024).toFixed(1);

  console.log('📊 File Stats:');
  console.log(`   Lines: ${lines}`);
  console.log(`   Size: ${size} KB`);

  process.exit(0);
} catch (err) {
  console.error('❌ Test failed:');
  console.error(`   ${err.message}`);
  console.error('');
  console.error(err.stack);
  process.exit(1);
}
