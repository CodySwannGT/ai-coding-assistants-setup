#!/usr/bin/env node

/**
 * Claude Code Review Command
 * 
 * CLI command to run AI-powered code reviews on files in a project.
 */

import { program } from 'commander';
import { Feedback } from '../utils/feedback';
import { CodeReview } from '../integrations/code-review';

// Command version
const VERSION = '1.0.0';

// Configure the command
program
  .name('claude code-review')
  .description('Run AI-powered code reviews on your project files')
  .version(VERSION)
  .option('-i, --include <patterns...>', 'File patterns to include (glob syntax)')
  .option('-e, --exclude <patterns...>', 'File patterns to exclude (glob syntax)')
  .option('-f, --files <files...>', 'Specific files to review')
  .option('--focus <areas...>', 'Focus areas for review (security, functionality, performance, style)')
  .option('-m, --model <model>', 'Claude model to use', 'claude-3-haiku-20240307')
  .option('-c, --config <path>', 'Path to config file')
  .option('-o, --output <format>', 'Output format (markdown, json)', 'markdown')
  .option('--no-save', 'Do not save review results to file')
  .option('-v, --verbose', 'Enable verbose output')
  .parse(process.argv);

// Get command options
const options = program.opts();

/**
 * Main function to run the command
 */
async function main() {
  try {
    // Configure feedback verbosity
    Feedback.setVerbose(options.verbose);
    
    // Print command header
    Feedback.section('Claude Code Review');
    
    // Run the code review
    const result = await CodeReview.runCodeReview({
      includePatterns: options.include,
      excludePatterns: options.exclude,
      files: options.files,
      focusAreas: options.focus,
      model: options.model,
      configPath: options.config,
      outputFormat: options.output,
      saveResults: options.save
    });
    
    // Output the results
    if (options.output === 'json') {
      // Output as JSON
      console.log(JSON.stringify(result, null, 2));
    } else {
      // Output as formatted markdown
      const markdown = CodeReview.formatReviewAsMarkdown(result);
      console.log(markdown);
    }
    
    // Print summary
    Feedback.info(`Review completed. Found issues: ` +
      `${result.files.reduce((count, file) => count + file.issues.length, 0)}`
    );
    
    // Count critical/high issues
    const criticalCount = result.files.reduce((count, file) => {
      return count + file.issues.filter(issue => issue.severity === 'critical').length;
    }, 0);
    
    const highCount = result.files.reduce((count, file) => {
      return count + file.issues.filter(issue => issue.severity === 'high').length;
    }, 0);
    
    if (criticalCount > 0) {
      Feedback.error(`Found ${criticalCount} critical issue(s)!`);
    }
    
    if (highCount > 0) {
      Feedback.warning(`Found ${highCount} high severity issue(s)`);
    }
    
  } catch (err) {
    Feedback.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// Run the command
main();