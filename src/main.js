/**
 * AI Coding Assistants Setup Script
 * =================================
 *
 * This script automates the setup and configuration of AI coding assistants
 * (Claude Code and Roo Code) within VS Code for JavaScript projects.
 *
 * Features:
 * - Automatic project structure detection
 * - Configuration of Claude Code and Roo Code
 * - MCP server setup and synchronization
 * - Ignore file management
 * - Custom mode configuration for Roo Code
 * - VS Code settings optimization
 * - Secure credential management
 *
 * @author Cody Swann
 * @license MIT
 */

import path from 'path';
import { program } from 'commander';
import { checkbox, confirm, input, password, select } from '@inquirer/prompts';
import { setupClaudeCode } from './integrations/claude-config.js';
import { setupRooCode } from './integrations/roo-config.js';
import { setupVSCodeSettings } from './integrations/vscode.js';
import { setupGitHooks, setupGitignore } from './integrations/git.js';
import { setupMcpConfig } from './integrations/mcp-config.js';
import { uninstall } from './integrations/uninstall.js';
import {
  findProjectRoot,
  ensureDirectory,
  isMonorepo
} from './utils/file.js';
import {
  initLogger,
  printHeader,
  printInfo,
  printError
} from './utils/logger.js';
import { loadEnvironmentVars, saveEnvironmentVars } from './config/environment.js';

// Script version
const VERSION = '1.0.0';

// The uninstall function is now imported from './integrations/uninstall.js'

/**
 * Main function to run the setup
 */
async function main() {
  try {
    console.log('\nAI Coding Assistants Setup Script\n');

    // Process command line arguments
    program
      .name('ai-assistant-setup')
      .description('Setup AI coding assistants (Claude Code and Roo Code) for your project')
      .version(VERSION)
      .option('--dry-run', 'Show what would be done without making changes', false)
      .option('-v, --verbose [level]', 'Verbosity level (0-3)', (val) => parseInt(val) || 1, 1)
      .option('-n, --non-interactive', 'Run in non-interactive mode with defaults', false)
      .option('-f, --force', 'Force overwrite of existing configurations', false)
      .option('--remove', 'Remove all configurations and settings created by this script', false)
      .option('--remove-all', 'Remove all AI assistant configurations, including VS Code settings', false)
      .option('--list-files', 'List all AI assistant files and directories without removing them', false)
      .option('--diff-explain', 'Run the diff-explain command with default options (uses staged changes)', false)
      .option('--diff-explain-commit <hash>', 'Run diff-explain on a specific commit')
      .option('--diff-explain-branch <name>', 'Run diff-explain on a branch compared to current')
      .parse(process.argv);

    const options = program.opts();
    const dryRun = options.dryRun;
    const verbose = options.verbose;
    const nonInteractive = options.nonInteractive;
    const forceOverwrite = options.force;

    if (dryRun) {
      printInfo('Running in dry-run mode. No changes will be made.');
    }

    if (nonInteractive) {
      printInfo('Running in non-interactive mode with defaults.');
    }

    // Find project root
    const projectRoot = await findProjectRoot();
    printInfo(`Found project at: ${projectRoot}`);
    
    // Detect if this is a monorepo
    const isMonorepoProject = await isMonorepo(projectRoot);
    printInfo(`Detected project type: ${isMonorepoProject ? 'Monorepo' : 'Standard Repository'}`);

    // Setup logging
    const logsDir = path.join(projectRoot, '.ai-assistants', 'logs');
    await ensureDirectory(logsDir, dryRun);

    const logger = initLogger({
      logsPath: path.join(logsDir, 'setup.log'),
      dryRun,
      verbose
    });

    // Define logger globally for error handling
    global.logger = logger;

    // Create shared configuration options
    const sharedOptions = {
      projectRoot,
      logger,
      dryRun,
      nonInteractive,
      forceOverwrite,
      checkbox,
      confirm,
      password,
      input,
      select
    };

    // Check if we just want to list AI assistant files
    if (options.listFiles) {
      const { findAIAssistantFiles } = await import('./integrations/uninstall.js');
      const { files, directories } = await findAIAssistantFiles(projectRoot);

      printHeader('AI Assistant Files and Directories');

      // Print directories
      if (directories.length > 0) {
        console.log('\nDirectories:');
        directories.forEach(dir => console.log(`- ${dir}`));
      } else {
        console.log('\nNo AI assistant directories found.');
      }

      // Print files
      if (files.length > 0) {
        console.log('\nFiles:');
        files.forEach(file => {
          if (typeof file === 'string') {
            console.log(`- ${file}`);
          } else if (file.path && file.aiSettings) {
            console.log(`- ${file.path} (contains AI settings: ${Object.keys(file.aiSettings).join(', ')})`);
          }
        });
      } else {
        console.log('\nNo AI assistant files found.');
      }

      return;
    }

    // Check if we're removing configuration
    if (options.remove || options.removeAll) {
      await uninstall({
        ...sharedOptions,
        includeVSCode: options.removeAll
      });
      return;
    }

    // Check if we're running diff-explain
    if (options.diffExplain || options.diffExplainCommit || options.diffExplainBranch) {
      try {
        // Import the diff-explain module dynamically
        const { explainDiff } = await import('./integrations/diff-explain.js');

        // Call the explainDiff function with appropriate options
        const explanation = await explainDiff({
          commit: options.diffExplainCommit,
          branch: options.diffExplainBranch,
          staged: options.diffExplain && !options.diffExplainCommit && !options.diffExplainBranch,
          projectRoot
        });

        // Print the explanation
        console.log(explanation);
        return;
      } catch (err) {
        printError(`Error explaining diff: ${err.message}`);
        if (global.logger) {
          global.logger.error(err.stack);
        }
        process.exit(1);
      }
    }
    
    // Load environment variables
    const env = await loadEnvironmentVars(projectRoot);
    
    // Get setup type
    let setupType = 'both';
    if (!nonInteractive) {
      setupType = await select({
        message: 'What would you like to do?',
        choices: [
          { value: 'both', name: 'Setup both Claude Code and Roo Code' },
          { value: 'claude', name: 'Setup only Claude Code' },
          { value: 'roo', name: 'Setup only Roo Code' },
          { value: 'update', name: 'Update existing configurations' }
        ]
      });
    }
    
    // Configure MCP servers - do this first as both assistants need it
    const mcpConfigResult = await setupMcpConfig({
      ...sharedOptions,
      env
    });
    
    // Update environment variables with any new ones from MCP config
    Object.assign(env, mcpConfigResult.env);
    
    // Perform setup based on selection
    if (['both', 'claude', 'update'].includes(setupType)) {
      const claudeResult = await setupClaudeCode({
        ...sharedOptions,
        env
      });
      
      // Update environment variables with any new ones from Claude config
      if (claudeResult?.apiKey) {
        env.ANTHROPIC_API_KEY = claudeResult.apiKey;
      }
    }
    
    if (['both', 'roo', 'update'].includes(setupType)) {
      await setupRooCode({
        ...sharedOptions,
        env
      });
    }
    
    // Setup .gitignore patterns
    await setupGitignore(sharedOptions);
    
    // Setup VS Code settings
    await setupVSCodeSettings(sharedOptions);

    // Setup Git hooks
    await setupGitHooks(sharedOptions);
    
    // Save updated environment variables
    await saveEnvironmentVars(projectRoot, env, dryRun);

    printHeader('Setup Complete!');
    console.log('Your project is now configured to use AI coding assistants.');
    console.log('\nManual steps required:');
    console.log('1. Install the Claude extension for VS Code');
    console.log('2. Install the Roo Code extension for VS Code');
    console.log('3. Restart VS Code to apply the settings');

    if (setupType === 'claude' || setupType === 'both') {
      console.log('\nTo use Claude Code in terminal:');
      console.log('  $ npx @anthropic/claude-code');
    }

    console.log('\nTo uninstall AI assistant configurations later:');
    console.log('  $ node index.js --list-files              # List all AI assistant files without removing');
    console.log('  $ node index.js --remove --dry-run        # Show what would be removed (no actual changes)');
    console.log('  $ node index.js --remove                  # Remove AI assistant configuration files');
    console.log('  $ node index.js --remove-all              # Remove config files + VS Code settings');

    console.log('\nThank you for using the AI Coding Assistants Setup Script!');
  } catch (err) {
    printError(`Error: ${err.message}`);
    if (global.logger) {
      global.logger.error(err.stack);
    }
    process.exit(1);
  }
}

// Only run if this is the main module
if (process.argv[1].endsWith('main.js')) {
  main();
}

export default main;