#!/usr/bin/env node

/**
 * rcm-export - Export RCM sessions to various formats
 *
 * Converts canonical YAML sessions to output formats for RAG, analysis, etc.
 *
 * Usage:
 *   rcm-export --input session.yaml --format markdown --output ./export/
 *   rcm-export --input "flows/promoted/*.yaml" --format markdown --output ~/anythingllm/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { program } from 'commander';
import glob from 'fast-glob';
import { convertAndSave as toMarkdown } from '../serializers/markdown.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Format serializer mapping
const SERIALIZERS = {
  'markdown': toMarkdown,
  'md': toMarkdown,
  // Future: 'json', 'html', 'pdf'
};

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Resolve input files (supports glob patterns)
 */
function resolveInputFiles(inputPattern, rcmRoot = null) {
  // If absolute path, use as-is
  if (path.isAbsolute(inputPattern)) {
    return glob.sync(inputPattern);
  }

  // If relative and rcmRoot provided, resolve from rcmRoot
  if (rcmRoot) {
    const fullPattern = path.join(rcmRoot, inputPattern);
    return glob.sync(fullPattern);
  }

  // Otherwise resolve from cwd
  return glob.sync(inputPattern);
}

/**
 * Export single session
 */
function exportSession(inputFile, format, outputPath, options = {}) {
  const serializer = SERIALIZERS[format];
  if (!serializer) {
    throw new Error(`Unsupported format: ${format}`);
  }

  // If output is directory, use input filename
  let finalOutputPath = outputPath;
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
    const inputFilename = path.basename(inputFile, '.yaml');
    const ext = format === 'markdown' || format === 'md' ? '.md' : `.${format}`;
    finalOutputPath = path.join(outputPath, `${inputFilename}${ext}`);
  }

  const result = serializer(inputFile, finalOutputPath, options);
  return result;
}

/**
 * Main export function
 */
async function exportSessions(options) {
  const {
    input,
    format,
    output,
    rcmRoot = null,
    verbose = false,
  } = options;

  console.log('🚀 RCM Export');
  console.log(`   Input: ${input}`);
  console.log(`   Format: ${format}`);
  console.log(`   Output: ${output}`);
  console.log('');

  // Resolve input files
  const inputFiles = resolveInputFiles(input, rcmRoot);

  if (inputFiles.length === 0) {
    throw new Error(`No files found matching pattern: ${input}`);
  }

  console.log(`📁 Found ${inputFiles.length} session(s) to export`);
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(output)) {
    ensureDir(output);
  }

  // Export each file
  const results = [];
  for (const inputFile of inputFiles) {
    try {
      console.log(`🔄 Exporting: ${path.basename(inputFile)}`);
      const result = exportSession(inputFile, format, output);
      results.push(result);
      console.log(`   ✅ ${result.title}`);
      console.log(`   📄 ${result.markdownPath || result.outputPath}`);
      console.log('');
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
      if (verbose) {
        console.error(err.stack);
      }
      console.log('');
    }
  }

  console.log('✅ Export complete!');
  console.log(`   Total: ${results.length}/${inputFiles.length} sessions exported`);

  return results;
}

// CLI setup
program
  .name('rcm-export')
  .description('Export RCM sessions to various formats')
  .version('0.1.0')
  .requiredOption('-i, --input <pattern>', 'Input file path or glob pattern (e.g., "flows/promoted/*.yaml")')
  .requiredOption('-f, --format <format>', 'Output format (markdown, json, html)')
  .requiredOption('-o, --output <path>', 'Output directory or file path')
  .option('-r, --rcm-root <path>', 'RCM root directory (for relative paths)')
  .option('--verbose', 'Verbose output');

program.parse();

const options = program.opts();

// Run export
exportSessions(options)
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('');
    console.error('❌ Export failed:');
    console.error(`   ${err.message}`);
    if (options.verbose) {
      console.error('');
      console.error(err.stack);
    }
    process.exit(1);
  });
