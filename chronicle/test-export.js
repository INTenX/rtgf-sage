#!/usr/bin/env node

/**
 * Simple test script for RCM export (no CLI dependencies)
 */

import fs from 'fs';
import { convertAndSave } from './tools/serializers/markdown.js';

const SOURCE = process.argv[2] || '/home/cbasta/test-knowledge/rcm/archive/canonical/2026/02/2026-02-11_untitled-session_55fc0e3d.yaml';
const TARGET = process.argv[3] || '/tmp/rcm-export-test/';

console.log('🚀 RCM Export Test (Markdown Serializer)');
console.log(`   Source: ${SOURCE}`);
console.log(`   Target: ${TARGET}`);
console.log('');

try {
  // Ensure target directory exists
  fs.mkdirSync(TARGET, { recursive: true });

  // Convert to Markdown
  const result = convertAndSave(SOURCE, TARGET);

  console.log('✅ Export successful!');
  console.log(`   Title: ${result.title}`);
  console.log(`   Session ID: ${result.sessionId}`);
  console.log(`   Output: ${result.markdownPath}`);
  console.log('');

  // Read back and verify
  const content = fs.readFileSync(result.markdownPath, 'utf-8');
  const lines = content.split('\n').length;
  const size = (fs.statSync(result.markdownPath).size / 1024).toFixed(1);

  console.log('📊 File Stats:');
  console.log(`   Lines: ${lines}`);
  console.log(`   Size: ${size} KB`);
  console.log('');

  // Show first 30 lines
  console.log('📄 Preview (first 30 lines):');
  console.log('---');
  console.log(content.split('\n').slice(0, 30).join('\n'));

  process.exit(0);
} catch (err) {
  console.error('❌ Test failed:');
  console.error(`   ${err.message}`);
  console.error('');
  console.error(err.stack);
  process.exit(1);
}
