/**
 * Git Hooks Module
 * 
 * Main entry point for the Git hooks system in the AI Coding Assistants setup.
 * This module exports functions for setting up and managing Git hooks.
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import inquirer from 'inquirer';
import HookRegistry from './hook-registry.js';
import PreCommitHook from './pre-commit-hook.js';
import PrepareCommitMsgHook from './prepare-commit-msg-hook.js';
import CommitMsgHook from './commit-msg-hook.js';

/**
 * Hook descriptions for display in the setup UI
 */
const HOOK_DESCRIPTIONS = {
  'pre-commit': {
    title: 'Pre-Commit Code Review',
    description: 'Uses Claude to review staged changes before they are committed',
    details: 'This hook analyzes your staged changes for bugs, security issues, and code quality problems before you commit them. It can be configured to either block commits with critical issues or just provide advisory warnings.'
  },
  'prepare-commit-msg': {
    title: 'Commit Message Generation',
    description: 'Uses Claude to suggest or generate commit messages based on staged changes',
    details: 'This hook analyzes your staged changes and either suggests a commit message or automatically inserts one. It follows conventional commit format and provides a summary of what changed and why.'
  },
  'commit-msg': {
    title: 'Commit Message Validation',
    description: 'Uses Claude to validate commit message structure and content',
    details: 'This hook ensures your commit messages follow guidelines like conventional commits format. It provides feedback on clarity, completeness, and format compliance.'
  },
  'pre-push': {
    title: 'Pre-Push Security Audit',
    description: 'Uses Claude to perform a security audit before pushing code',
    details: 'This hook analyzes all commits being pushed for security issues like credentials, sensitive information, or known vulnerabilities. It helps prevent pushing potentially problematic code to remote repositories.'
  },
  'post-merge': {
    title: 'Merge Summary',
    description: 'Uses Claude to generate a summary of merged changes',
    details: 'This hook activates after a merge or pull and provides a human-readable summary of what changed. It helps you understand exactly what you just integrated into your branch.'
  },
  'post-checkout': {
    title: 'Branch Context',
    description: 'Uses Claude to provide context when switching branches',
    details: 'This hook runs when you check out a different branch and provides a summary of recent activity, open issues, and key files in that branch. It helps you quickly get oriented when switching contexts.'
  },
  'post-rewrite': {
    title: 'Rebase Summary',
    description: 'Uses Claude to explain what changed during a rebase or amend',
    details: 'This hook activates after a rebase or commit --amend operation and explains what changed in plain language. It helps you understand the effects of complex rewrite operations.'
  },
  'pre-rebase': {
    title: 'Conflict Prediction',
    description: 'Uses Claude to predict potential merge conflicts before rebasing',
    details: 'This hook runs before a rebase operation and analyzes the branches to predict potential merge conflicts. It helps you plan for conflict resolution before starting a rebase.'
  }
};

/**
 * Get a hook registry for the specified project root
 * @param {Object} config Configuration object
 * @param {string} config.projectRoot Project root path
 * @param {Object} config.logger Logger instance
 * @param {boolean} config.dryRun Whether to perform a dry run
 * @returns {HookRegistry} Hook registry instance
 */
export function getHookRegistry(config) {
  const registry = new HookRegistry(config);

  // Register available hooks
  registry.registerHook('pre-commit', PreCommitHook, {
    enabled: false, // Default to disabled
    blockingMode: false,
    strictness: 'medium'
  });

  // Register prepare-commit-msg hook
  registry.registerHook('prepare-commit-msg', PrepareCommitMsgHook, {
    enabled: false, // Default to disabled
    mode: 'suggest', // 'suggest' or 'insert'
    conventionalCommits: true,
    includeScope: true,
    includeBreaking: true,
    messageStyle: 'detailed' // 'concise' or 'detailed'
  });

  // Register commit-msg hook
  registry.registerHook('commit-msg', CommitMsgHook, {
    enabled: false, // Default to disabled
    blockingMode: false,
    conventionalCommits: true,
    checkSpelling: true,
    checkGrammar: true,
    maxLength: { subject: 72, body: 100 },
    suggestImprovements: true
  });

  return registry;
}

/**
 * Initialize hooks configuration
 * @param {Object} config Configuration object
 * @param {string} config.projectRoot Project root path
 * @param {Object} config.logger Logger instance
 * @param {boolean} config.dryRun Whether to perform a dry run
 * @returns {Promise<void>}
 */
export async function initializeHooks(config) {
  const registry = getHookRegistry(config);
  
  // Load existing configuration if available
  await registry.loadConfig();
  
  // Return the registry
  return registry;
}

/**
 * Setup hooks based on user selection
 * @param {Object} config Configuration object
 * @param {string} config.projectRoot Project root path
 * @param {Object} config.logger Logger instance
 * @param {boolean} config.dryRun Whether to perform a dry run
 * @param {boolean} config.nonInteractive Whether to run in non-interactive mode
 * @returns {Promise<Object>} Setup results
 */
export async function setupHooks(config) {
  // Initialize hooks
  const registry = await initializeHooks(config);
  const hooks = registry.getAllHooks();
  
  // In non-interactive mode, just use defaults
  if (config.nonInteractive) {
    return registry.setupHooks();
  }
  
  // Create list of available hooks for selection
  const choices = Object.entries(hooks).map(([id, hook]) => ({
    name: `${HOOK_DESCRIPTIONS[id]?.title || hook.name} - ${HOOK_DESCRIPTIONS[id]?.description || hook.description}`,
    value: id,
    short: HOOK_DESCRIPTIONS[id]?.title || hook.name,
    checked: hook.isEnabled()
  }));
  
  // Prompt user to select hooks
  const { selectedHooks } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedHooks',
      message: 'Select Git hooks to enable:',
      choices,
      pageSize: 10
    }
  ]);
  
  // Enable/disable hooks based on selection
  Object.keys(hooks).forEach(id => {
    if (selectedHooks.includes(id)) {
      registry.enableHook(id);
    } else {
      registry.disableHook(id);
    }
  });
  
  // Configure selected hooks
  for (const hookId of selectedHooks) {
    const hook = registry.getHook(hookId);
    if (!hook) continue;
    
    console.log(chalk.blue(`\nConfiguring ${hook.name}...\n`));
    console.log(chalk.gray(HOOK_DESCRIPTIONS[hookId]?.details || ''));
    
    // Configure pre-commit hook
    if (hookId === 'pre-commit') {
      const { strictness, blockingMode } = await inquirer.prompt([
        {
          type: 'list',
          name: 'strictness',
          message: 'Select strictness level:',
          choices: [
            { name: 'Low - Focus only on critical bugs and security issues', value: 'low' },
            { name: 'Medium - Include bugs, security issues, and clear code quality problems', value: 'medium' },
            { name: 'High - Be thorough and include style and best practices', value: 'high' }
          ],
          default: 'medium'
        },
        {
          type: 'confirm',
          name: 'blockingMode',
          message: 'Block commits with critical issues?',
          default: false
        }
      ]);

      hook.setStrictness(strictness);
      hook.blockingMode = blockingMode;
    }

    // Configure prepare-commit-msg hook
    else if (hookId === 'prepare-commit-msg') {
      const { mode, conventionalCommits, messageStyle } = await inquirer.prompt([
        {
          type: 'list',
          name: 'mode',
          message: 'How should Claude interact with commit messages?',
          choices: [
            { name: 'Suggest - Show suggestions without modifying commit message', value: 'suggest' },
            { name: 'Insert - Automatically insert Claude-generated commit message', value: 'insert' }
          ],
          default: 'suggest'
        },
        {
          type: 'confirm',
          name: 'conventionalCommits',
          message: 'Use Conventional Commits format? (feat:, fix:, etc.)',
          default: true
        },
        {
          type: 'list',
          name: 'messageStyle',
          message: 'Commit message style:',
          choices: [
            { name: 'Concise - Short subject line only', value: 'concise' },
            { name: 'Detailed - Subject with detailed body', value: 'detailed' }
          ],
          default: 'detailed'
        }
      ]);

      // Apply configuration to hook
      hook.mode = mode;
      hook.conventionalCommits = conventionalCommits;
      hook.messageStyle = messageStyle;

      // If using conventional commits, ask about additional options
      if (conventionalCommits) {
        const { includeScope, includeBreaking } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'includeScope',
            message: 'Include scope in conventional commits? (feat(scope): message)',
            default: true
          },
          {
            type: 'confirm',
            name: 'includeBreaking',
            message: 'Check for breaking changes?',
            default: true
          }
        ]);

        hook.includeScope = includeScope;
        hook.includeBreaking = includeBreaking;
      }
    }

    // Configure commit-msg hook
    else if (hookId === 'commit-msg') {
      const { blockingMode, conventionalCommits, checkSpelling, checkGrammar } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'blockingMode',
          message: 'Block commits with invalid messages?',
          default: false
        },
        {
          type: 'confirm',
          name: 'conventionalCommits',
          message: 'Enforce Conventional Commits format? (feat:, fix:, etc.)',
          default: true
        },
        {
          type: 'confirm',
          name: 'checkSpelling',
          message: 'Check for spelling errors?',
          default: true
        },
        {
          type: 'confirm',
          name: 'checkGrammar',
          message: 'Check for grammar errors?',
          default: true
        }
      ]);

      // Apply configuration to hook
      hook.blockingMode = blockingMode;
      hook.conventionalCommits = conventionalCommits;
      hook.checkSpelling = checkSpelling;
      hook.checkGrammar = checkGrammar;
    }
  }
  
  // Save the configuration
  await registry.saveConfig();
  
  // Set up the hooks
  return registry.setupHooks();
}

/**
 * Remove hooks
 * @param {Object} config Configuration object
 * @param {string} config.projectRoot Project root path
 * @param {Object} config.logger Logger instance
 * @param {boolean} config.dryRun Whether to perform a dry run
 * @returns {Promise<Object>} Removal results
 */
export async function removeHooks(config) {
  const registry = getHookRegistry(config);
  return registry.removeHooks();
}

export default {
  getHookRegistry,
  initializeHooks,
  setupHooks,
  removeHooks
};