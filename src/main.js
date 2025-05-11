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

import fs from 'fs-extra';
import path from 'path';
import { program } from 'commander';
import { checkbox, confirm, input, password, select } from '@inquirer/prompts';
import { setupClaudeCode } from './integrations/claude-config.js';
import { setupRooCode } from './integrations/roo-config.js';
import { setupVSCodeSettings } from './integrations/vscode.js';
import { setupGitHooks, setupGitignore } from './integrations/git.js';
import { setupMcpConfig } from './integrations/mcp-config.js';
import {
  findProjectRoot,
  ensureDirectory,
  isMonorepo,
  fileExists
} from './utils/file.js';
import {
  initLogger,
  printHeader,
  printInfo,
  printSuccess,
  printError,
  printWarning,
  printDebug
} from './utils/logger.js';
import { getProjectPaths, isWindows, isMac, isLinux } from './config/paths.js';
import { loadEnvironmentVars, saveEnvironmentVars } from './config/environment.js';

// Script version
const VERSION = '1.0.0';

/**
 * Remove all configurations created by this script
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Project root directory
 * @param {Object} options.logger Winston logger instance
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @param {boolean} [options.nonInteractive=false] Whether to run in non-interactive mode
 * @param {Function} [options.confirm] Function to confirm user choices
 */
async function uninstall(options) {
  const { 
    projectRoot, 
    logger, 
    dryRun = false, 
    nonInteractive = false,
    confirm = async () => true
  } = options;
  
  printHeader('Removing AI Coding Assistants Configuration');

  // Ask for confirmation unless in non-interactive mode
  let shouldUninstall = true;
  if (!nonInteractive) {
    shouldUninstall = await confirm({
      message: 'WARNING: This will remove all configurations and settings created by this script. Continue?',
      default: false
    });

    if (!shouldUninstall) {
      printInfo('Uninstall cancelled.');
      return;
    }
  }

  try {
    // Import git module to avoid circular dependencies
    const { removeGitHooks } = await import('./integrations/git.js');
    
    // Remove Git hooks
    printInfo('Removing Git hooks...');
    const hooksResult = await removeGitHooks({
      projectRoot,
      logger,
      dryRun
    });

    if (hooksResult.success && hooksResult.success.length > 0) {
      printSuccess(`Successfully removed ${hooksResult.success.length} Git hooks`);
    }

    if (hooksResult.failed && hooksResult.failed.length > 0) {
      printWarning(`Failed to remove ${hooksResult.failed.length} Git hooks`);
    }
    
    // Get all paths for project files
    const paths = getProjectPaths(projectRoot);

    // Remove directories and files
    for (const [name, filePath] of Object.entries(paths)) {
      // Skip git, root, and env directories
      if (['root', 'git', 'env', 'envExample'].includes(name)) {
        continue;
      }
      
      if (await fileExists(filePath)) {
        if (dryRun) {
          printDebug(`Would remove: ${filePath}`);
        } else {
          await fs.remove(filePath);
          printSuccess(`Removed: ${filePath}`);
        }
      }
    }

    printSuccess('All AI coding assistant configuration files have been removed.');
    printInfo('Note: VS Code settings were not modified to avoid disrupting your editor configuration.');
    printInfo('If desired, you can manually remove AI assistant settings from your VS Code settings.json.');
  } catch (err) {
    printError(`Error during uninstall: ${err.message}`);
    process.exit(1);
  }
}

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

    // Check if we're removing configuration
    if (options.remove) {
      await uninstall(sharedOptions);
      return;
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
    
    console.log('\nThank you for using the AI Coding Assistants Setup Script!');
  } catch (err) {
    printError(`Error: ${err.message}`);
    if (logger) {
      logger.error(err.stack);
    }
    process.exit(1);
  }
}

// Only run if this is the main module
if (process.argv[1].endsWith('main.js')) {
  main();
}

export default main;