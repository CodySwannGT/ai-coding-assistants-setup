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
import PrePushHook from './pre-push-hook.js';
import PostMergeHook from './post-merge-hook.js';
import PostCheckoutHook from './post-checkout-hook.js';
import PostRewriteHook from './post-rewrite-hook.js';
import PreRebaseHook from './pre-rebase-hook.js';

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

  // Register pre-push hook
  registry.registerHook('pre-push', PrePushHook, {
    enabled: false, // Default to disabled
    blockingMode: false,
    auditTypes: ['security', 'credentials', 'sensitive-data', 'dependencies'],
    excludePatterns: ['node_modules/**', 'dist/**', 'build/**', '**/*.lock'],
    maxCommits: 10,
    maxDiffSize: 100000
  });

  // Register post-merge hook
  registry.registerHook('post-merge', PostMergeHook, {
    enabled: false, // Default to disabled
    summaryFormat: 'detailed', // 'concise' or 'detailed'
    includeStats: true,
    includeDependencies: true,
    includeBreakingChanges: true,
    notifyMethod: 'terminal', // 'terminal', 'file', or 'notification'
    maxDiffSize: 100000
  });

  // Register post-checkout hook
  registry.registerHook('post-checkout', PostCheckoutHook, {
    enabled: false, // Default to disabled
    summaryFormat: 'detailed', // 'concise' or 'detailed'
    includeStats: true,
    includeDependencies: true,
    includeBreakingChanges: true,
    notifyMethod: 'terminal', // 'terminal', 'file', or 'notification'
    skipInitialCheckout: true,
    skipTagCheckout: false,
    maxDiffSize: 100000
  });

  // Register post-rewrite hook
  registry.registerHook('post-rewrite', PostRewriteHook, {
    enabled: false, // Default to disabled
    summaryFormat: 'detailed', // 'concise' or 'detailed'
    includeStats: true,
    includeDependencies: true,
    includeBreakingChanges: true,
    notifyMethod: 'terminal', // 'terminal', 'file', or 'notification'
    maxDiffSize: 100000
  });

  // Register pre-rebase hook
  registry.registerHook('pre-rebase', PreRebaseHook, {
    enabled: false, // Default to disabled
    blockingMode: 'warn', // 'block', 'warn', or 'none'
    checkConflicts: true,
    checkTestImpact: false,
    checkDependencies: true,
    blockOnSeverity: 'high', // 'critical', 'high', 'medium', 'low', 'none'
    maxDiffSize: 100000
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
      const { strictness, blockingMode, reviewTypes, blockOnSeverity } = await inquirer.prompt([
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
          type: 'checkbox',
          name: 'reviewTypes',
          message: 'Select areas to focus on during review:',
          choices: [
            { name: 'Bugs - Logical errors, edge cases, and exceptions', value: 'bugs', checked: true },
            { name: 'Security - Vulnerabilities and sensitive data exposure', value: 'security', checked: true },
            { name: 'Performance - Efficiency and resource usage', value: 'performance', checked: false },
            { name: 'Best Practices - Design patterns and maintainability', value: 'best-practices', checked: true },
            { name: 'Style - Formatting, naming conventions, and readability', value: 'style', checked: false }
          ],
          validate: input => input.length > 0 ? true : 'Please select at least one area'
        },
        {
          type: 'confirm',
          name: 'blockingMode',
          message: 'Enable blocking mode for commits with issues?',
          default: false
        },
        {
          type: 'list',
          name: 'blockOnSeverity',
          message: 'Block commits with issues at or above which severity level?',
          choices: [
            { name: 'None - Never block commits', value: 'none' },
            { name: 'Critical - Only block commits with critical issues', value: 'critical' },
            { name: 'High - Block commits with high or critical issues', value: 'high' },
            { name: 'Medium - Block commits with medium to critical issues', value: 'medium' },
            { name: 'Low - Block commits with any issues', value: 'low' }
          ],
          default: 'none',
          when: answers => answers.blockingMode
        }
      ]);

      hook.setStrictness(strictness);
      hook.blockingMode = blockingMode;

      if (reviewTypes && reviewTypes.length > 0) {
        hook.reviewTypes = reviewTypes;
      }

      if (blockingMode && blockOnSeverity) {
        hook.blockOnSeverity = blockOnSeverity;
      }
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

    // Configure pre-push hook
    else if (hookId === 'pre-push') {
      const { blockingMode, auditTypes } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'blockingMode',
          message: 'Block pushes with critical security issues?',
          default: false
        },
        {
          type: 'checkbox',
          name: 'auditTypes',
          message: 'What should Claude check for?',
          choices: [
            { name: 'Security vulnerabilities', value: 'security', checked: true },
            { name: 'Credentials or API keys', value: 'credentials', checked: true },
            { name: 'Sensitive data', value: 'sensitive-data', checked: true },
            { name: 'Dependency vulnerabilities', value: 'dependencies', checked: true }
          ]
        }
      ]);

      hook.blockingMode = blockingMode;
      hook.auditTypes = auditTypes;

      // Ask about excluded patterns if the user wants to customize them
      const { customizeExcludes } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'customizeExcludes',
          message: 'Do you want to customize file patterns to exclude from security checks?',
          default: false
        }
      ]);

      if (customizeExcludes) {
        const { excludePatterns } = await inquirer.prompt([
          {
            type: 'input',
            name: 'excludePatterns',
            message: 'Enter comma-separated patterns to exclude (e.g., node_modules/**,dist/**):',
            default: hook.excludePatterns.join(','),
            filter: value => value.split(',').map(p => p.trim()).filter(p => p)
          }
        ]);

        hook.excludePatterns = excludePatterns;
      }
    }

    // Configure post-merge hook
    else if (hookId === 'post-merge') {
      const { summaryFormat, includeStats, notifyMethod } = await inquirer.prompt([
        {
          type: 'list',
          name: 'summaryFormat',
          message: 'How detailed should merge summaries be?',
          choices: [
            { name: 'Concise - Short overview of changes', value: 'concise' },
            { name: 'Detailed - Comprehensive explanation of changes', value: 'detailed' }
          ],
          default: 'detailed'
        },
        {
          type: 'confirm',
          name: 'includeStats',
          message: 'Include statistics in merge summaries?',
          default: true
        },
        {
          type: 'list',
          name: 'notifyMethod',
          message: 'How should merge summaries be delivered?',
          choices: [
            { name: 'Terminal output', value: 'terminal' },
            { name: 'Write to file', value: 'file' },
            { name: 'System notification (where supported)', value: 'notification' }
          ],
          default: 'terminal'
        }
      ]);

      hook.summaryFormat = summaryFormat;
      hook.includeStats = includeStats;
      hook.notifyMethod = notifyMethod;

      // If the user wants to write to a file, ask for the output file
      if (notifyMethod === 'file') {
        const { outputFile } = await inquirer.prompt([
          {
            type: 'input',
            name: 'outputFile',
            message: 'File to write merge summaries to:',
            default: hook.outputFile
          }
        ]);

        hook.outputFile = outputFile;
      }

      // Ask about advanced options
      const { configureAdvanced } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'configureAdvanced',
          message: 'Configure advanced options for merge summaries?',
          default: false
        }
      ]);

      if (configureAdvanced) {
        const { includeDependencies, includeBreakingChanges } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'includeDependencies',
            message: 'Highlight dependency changes in summaries?',
            default: hook.includeDependencies
          },
          {
            type: 'confirm',
            name: 'includeBreakingChanges',
            message: 'Highlight potential breaking changes in summaries?',
            default: hook.includeBreakingChanges
          }
        ]);

        hook.includeDependencies = includeDependencies;
        hook.includeBreakingChanges = includeBreakingChanges;
      }
    }

    // Configure post-checkout hook
    else if (hookId === 'post-checkout') {
      const { summaryFormat, includeStats, notifyMethod } = await inquirer.prompt([
        {
          type: 'list',
          name: 'summaryFormat',
          message: 'How detailed should branch summaries be?',
          choices: [
            { name: 'Concise - Short overview of branch changes', value: 'concise' },
            { name: 'Detailed - Comprehensive explanation of branch changes', value: 'detailed' }
          ],
          default: 'detailed'
        },
        {
          type: 'confirm',
          name: 'includeStats',
          message: 'Include statistics in branch summaries?',
          default: true
        },
        {
          type: 'list',
          name: 'notifyMethod',
          message: 'How should branch summaries be delivered?',
          choices: [
            { name: 'Terminal output', value: 'terminal' },
            { name: 'Write to file', value: 'file' },
            { name: 'System notification (where supported)', value: 'notification' }
          ],
          default: 'terminal'
        }
      ]);

      hook.summaryFormat = summaryFormat;
      hook.includeStats = includeStats;
      hook.notifyMethod = notifyMethod;

      // Ask about advanced options
      const { configureAdvanced } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'configureAdvanced',
          message: 'Configure advanced options for branch summaries?',
          default: false
        }
      ]);

      if (configureAdvanced) {
        const { includeDependencies, includeBreakingChanges, skipInitialCheckout, skipTagCheckout } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'includeDependencies',
            message: 'Highlight dependency changes in summaries?',
            default: hook.includeDependencies
          },
          {
            type: 'confirm',
            name: 'includeBreakingChanges',
            message: 'Highlight potential breaking changes in summaries?',
            default: hook.includeBreakingChanges
          },
          {
            type: 'confirm',
            name: 'skipInitialCheckout',
            message: 'Skip summaries for initial checkouts?',
            default: hook.skipInitialCheckout
          },
          {
            type: 'confirm',
            name: 'skipTagCheckout',
            message: 'Skip summaries when checking out tags?',
            default: hook.skipTagCheckout
          }
        ]);

        hook.includeDependencies = includeDependencies;
        hook.includeBreakingChanges = includeBreakingChanges;
        hook.skipInitialCheckout = skipInitialCheckout;
        hook.skipTagCheckout = skipTagCheckout;
      }
    }

    // Configure post-rewrite hook
    else if (hookId === 'post-rewrite') {
      const { summaryFormat, includeStats, notifyMethod } = await inquirer.prompt([
        {
          type: 'list',
          name: 'summaryFormat',
          message: 'How detailed should rewrite summaries be?',
          choices: [
            { name: 'Concise - Short overview of rewritten changes', value: 'concise' },
            { name: 'Detailed - Comprehensive explanation of rewritten changes', value: 'detailed' }
          ],
          default: 'detailed'
        },
        {
          type: 'confirm',
          name: 'includeStats',
          message: 'Include statistics in rewrite summaries?',
          default: true
        },
        {
          type: 'list',
          name: 'notifyMethod',
          message: 'How should rewrite summaries be delivered?',
          choices: [
            { name: 'Terminal output', value: 'terminal' },
            { name: 'Write to file', value: 'file' },
            { name: 'System notification (where supported)', value: 'notification' }
          ],
          default: 'terminal'
        }
      ]);

      hook.summaryFormat = summaryFormat;
      hook.includeStats = includeStats;
      hook.notifyMethod = notifyMethod;

      // Ask about advanced options
      const { configureAdvanced } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'configureAdvanced',
          message: 'Configure advanced options for rewrite summaries?',
          default: false
        }
      ]);

      if (configureAdvanced) {
        const { includeDependencies, includeBreakingChanges } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'includeDependencies',
            message: 'Highlight dependency changes in summaries?',
            default: hook.includeDependencies
          },
          {
            type: 'confirm',
            name: 'includeBreakingChanges',
            message: 'Highlight potential breaking changes in summaries?',
            default: hook.includeBreakingChanges
          }
        ]);

        hook.includeDependencies = includeDependencies;
        hook.includeBreakingChanges = includeBreakingChanges;
      }
    }

    // Configure pre-rebase hook
    else if (hookId === 'pre-rebase') {
      const { blockingMode, checkConflicts, checkTestImpact, checkDependencies } = await inquirer.prompt([
        {
          type: 'list',
          name: 'blockingMode',
          message: 'How should the hook respond to detected issues?',
          choices: [
            { name: 'Block - Prevent rebase if issues are detected', value: 'block' },
            { name: 'Warn - Show warnings but allow rebase to proceed', value: 'warn' },
            { name: 'None - Just provide information, no warnings', value: 'none' }
          ],
          default: 'warn'
        },
        {
          type: 'confirm',
          name: 'checkConflicts',
          message: 'Check for potential merge conflicts?',
          default: hook.checkConflicts
        },
        {
          type: 'confirm',
          name: 'checkTestImpact',
          message: 'Check for impact on tests?',
          default: hook.checkTestImpact
        },
        {
          type: 'confirm',
          name: 'checkDependencies',
          message: 'Check for dependency changes?',
          default: hook.checkDependencies
        }
      ]);

      hook.blockingMode = blockingMode;
      hook.checkConflicts = checkConflicts;
      hook.checkTestImpact = checkTestImpact;
      hook.checkDependencies = checkDependencies;

      // If blocking mode is enabled, ask about severity threshold
      if (blockingMode === 'block') {
        const { blockOnSeverity } = await inquirer.prompt([
          {
            type: 'list',
            name: 'blockOnSeverity',
            message: 'Block rebase on issues with which severity level or higher?',
            choices: [
              { name: 'Critical - Only block on critical issues', value: 'critical' },
              { name: 'High - Block on high or critical issues', value: 'high' },
              { name: 'Medium - Block on medium, high, or critical issues', value: 'medium' },
              { name: 'Low - Block on any issues', value: 'low' }
            ],
            default: 'high'
          }
        ]);

        hook.blockOnSeverity = blockOnSeverity;
      }
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