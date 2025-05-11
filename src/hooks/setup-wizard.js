/**
 * Hook Setup Wizard
 * 
 * Provides an interactive wizard for setting up Git hooks.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { getHookRegistry, initializeHooks, setupHooks } from './index.js';
import { applyHookTemplate } from './config-manager.js';
import { isClaudeCliAvailable } from '../integrations/claude-cli.js';

/**
 * Run the hook setup wizard
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {Object} [options.logger] Logger instance
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @param {boolean} [options.nonInteractive=false] Whether to run in non-interactive mode
 * @returns {Promise<Object>} Setup results
 */
export async function runSetupWizard({ 
  projectRoot, 
  logger,
  dryRun = false,
  nonInteractive = false
}) {
  const printInfo = message => logger?.info?.(message) || console.log(chalk.blue(message));
  const printSuccess = message => logger?.success?.(message) || console.log(chalk.green(message));
  const printWarning = message => logger?.warn?.(message) || console.warn(chalk.yellow(message));
  
  printInfo('Starting Claude Git Hooks Setup Wizard');
  
  // Check for Claude CLI availability
  const claudeCliAvailable = await isClaudeCliAvailable();
  
  if (claudeCliAvailable) {
    printSuccess('Claude CLI is available and will be used for Git hooks');
  } else {
    printWarning('Claude CLI is not available. Hooks will use the Claude API instead.');
    printInfo('To use Claude CLI, install it from: https://github.com/anthropics/claude-cli');
  }
  
  // Initialize hooks registry
  const registry = await initializeHooks({
    projectRoot,
    logger,
    dryRun
  });
  
  // If non-interactive mode, use default settings
  if (nonInteractive) {
    printInfo('Running in non-interactive mode, using standard template');
    await applyHookTemplate({
      projectRoot,
      template: 'standard',
      logger
    });
    
    return setupHooks({
      projectRoot,
      logger,
      dryRun,
      nonInteractive: true
    });
  }
  
  // Ask user about installation approach
  const { approach } = await inquirer.prompt([
    {
      type: 'list',
      name: 'approach',
      message: 'How would you like to set up Claude Git hooks?',
      choices: [
        { name: 'Minimal - Only essential hooks with basic configuration', value: 'minimal' },
        { name: 'Standard - Common hooks with recommended configuration', value: 'standard' },
        { name: 'Strict - All hooks with comprehensive configuration', value: 'strict' },
        { name: 'Custom - Select specific hooks and configure each one', value: 'custom' }
      ],
      default: 'standard'
    }
  ]);
  
  // If using a template, apply it
  if (approach !== 'custom') {
    printInfo(`Applying ${approach} configuration template...`);
    await applyHookTemplate({
      projectRoot,
      template: approach,
      logger
    });
    
    // Set up hooks
    return setupHooks({
      projectRoot,
      logger,
      dryRun,
      nonInteractive: true // Skip interactive configuration
    });
  }
  
  // Custom approach - call the setupHooks function
  return setupHooks({
    projectRoot,
    logger,
    dryRun,
    nonInteractive: false // Allow interactive configuration
  });
}

export default runSetupWizard;