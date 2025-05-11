#!/usr/bin/env node

/**
 * Claude Diff Explain Command
 * 
 * CLI command to provide AI-enhanced git diff output with explanations,
 * highlighting potential issues, and providing context for the changes.
 */

import { program } from 'commander';
import chalk from 'chalk';
import { explainDiff } from '../integrations/diff-explain.js';
import { printHeader, printInfo, printError } from '../utils/logger.js';

// Command version
const VERSION = '1.0.0';

// Configure the command
program
  .name('claude diff-explain')
  .description('Get AI-enhanced git diff explanations')
  .version(VERSION)
  .option('-c, --commit <hash>', 'Specific commit to explain')
  .option('-b, --branch <name>', 'Branch to diff against current')
  .option('-f, --files <files...>', 'Specific files to include in diff')
  .option('-s, --staged', 'Explain staged changes', false)
  .option('--since <ref>', 'Show changes since this reference (e.g., HEAD~3)')
  .option('--until <ref>', 'Show changes until this reference')
  .option('-o, --output-format <format>', 'Output format (inline, side-by-side, summary-only)', 'inline')
  .option('-v, --verbosity <level>', 'Verbosity level (brief, detailed)', 'detailed')
  .option('--focus <areas...>', 'Focus areas (functionality, security, performance, readability)')
  .option('--no-highlight-issues', 'Do not highlight potential issues')
  .option('--no-suggestions', 'Do not include suggestions for improvements')
  .option('--no-summary', 'Do not include a summary of changes')
  .option('--max-tokens <tokens>', 'Maximum tokens for Claude response', '4000')
  .parse(process.argv);

// Get command options
const options = program.opts();

/**
 * Main function to run the command
 */
async function main() {
  try {
    printHeader('Claude Diff Explain');
    
    // Check that at least one diff option is specified
    if (!options.commit && !options.branch && !options.staged && !options.since) {
      printInfo('No diff options specified. Defaulting to staged changes.');
      options.staged = true;
    }
    
    // If multiple diff options are specified, prioritize one
    if ((options.commit && options.branch) || 
        (options.commit && options.since) || 
        (options.branch && options.since)) {
      printInfo('Multiple diff options specified. Using the first option in order of priority: commit > branch > since > staged.');
      
      if (options.commit) {
        options.branch = undefined;
        options.since = undefined;
        options.staged = false;
      } else if (options.branch) {
        options.since = undefined;
        options.staged = false;
      } else if (options.since) {
        options.staged = false;
      }
    }
    
    // Convert focus areas to array if specified
    let focusAreas;
    if (options.focus) {
      focusAreas = Array.isArray(options.focus) ? options.focus : [options.focus];
    }
    
    // Call the explainDiff function
    const explanation = await explainDiff({
      commit: options.commit,
      branch: options.branch,
      files: options.files,
      staged: options.staged,
      since: options.since,
      until: options.until,
      outputFormat: options.outputFormat,
      verbosity: options.verbosity,
      focusAreas,
      highlightIssues: options.highlightIssues,
      includeSuggestions: options.suggestions,
      includeSummary: options.summary,
      maxTokens: parseInt(options.maxTokens, 10)
    });
    
    // Print the explanation
    console.log(explanation);
  } catch (err) {
    printError(`Error: ${err.message}`);
    process.exit(1);
  }
}

// Run the command
main();