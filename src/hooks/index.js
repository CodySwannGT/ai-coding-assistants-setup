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
import BranchStrategyHook from './branch-strategy-hook.js';
import TestFirstDevelopmentHook from './test-first-development-hook.js';
import DiffExplainHook from './diff-explain-hook.js';

/**
 * Hook descriptions for display in the setup UI
 */
const HOOK_DESCRIPTIONS = {
  'pre-commit': {
    title: 'Pre-Commit Code Review',
    description: 'Uses Claude to review staged changes before they are committed',
    details: 'This hook analyzes your staged changes for bugs, security issues, and code quality problems before you commit them. It can be configured to either block commits with critical issues or just provide advisory warnings.'
  },
  'type-check': {
    title: 'TypeScript Type Checking',
    description: 'Runs TypeScript type checking on your code before committing',
    details: 'This hook runs the TypeScript compiler to check for type errors in your code before committing. It helps catch type-related issues early in the development process.'
  },
  'lint': {
    title: 'Code Linting',
    description: 'Runs linting checks on your code before committing',
    details: 'This hook runs your configured linter (ESLint, TSLint, etc.) on staged files to ensure code quality and consistency before committing.'
  },
  'format': {
    title: 'Code Formatting',
    description: 'Ensures code is properly formatted before committing',
    details: 'This hook runs your configured formatter (Prettier, etc.) on staged files to ensure consistent code style before committing.'
  },
  'commit-lint': {
    title: 'Commit Message Validation',
    description: 'Validates commit messages against conventional commits format',
    details: 'This hook ensures your commit messages follow the conventional commits format, making your commit history more consistent and readable.'
  },
  'diff-explain': {
    title: 'AI-Enhanced Git Diff Explanation',
    description: 'Uses Claude to explain code changes in natural language',
    details: 'This enables the `diff-explain` command that provides AI-enhanced git diff output with natural language explanations, context, and potential issue identification. It helps you understand code changes more easily and spot potential problems.'
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
  },
  'branch-strategy': {
    title: 'Branching Strategy Enforcement',
    description: 'Enforces branch naming conventions and workflow rules',
    details: 'This hook validates that your branches follow the chosen branching strategy (GitFlow, Trunk-based, GitHub Flow, or custom). It checks branch naming conventions, workflow rules, and can use Claude to validate branch purpose based on its name and commits.'
  },
  'test-first-development': {
    title: 'Test-First Development Enforcement',
    description: 'Detects new files without tests and suggests test cases',
    details: 'This hook promotes test-first development by checking for new files that lack corresponding test files. It can suggest appropriate test cases using Claude and optionally block commits until tests are created.'
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
  // Get Claude CLI preference from the environment
  const useClaudeCli = process.env.CLAUDE_USE_CLI !== 'false'; // Default to true unless explicitly disabled

  registry.registerHook('pre-commit', PreCommitHook, {
    enabled: false, // Default to disabled
    blockingMode: false,
    strictness: 'medium',
    preferCli: useClaudeCli
  });

  // Register prepare-commit-msg hook
  registry.registerHook('prepare-commit-msg', PrepareCommitMsgHook, {
    enabled: false, // Default to disabled
    mode: 'suggest', // 'suggest' or 'insert'
    conventionalCommits: true,
    includeScope: true,
    includeBreaking: true,
    messageStyle: 'detailed', // 'concise' or 'detailed'
    preferCli: useClaudeCli
  });

  // Register commit-msg hook
  registry.registerHook('commit-msg', CommitMsgHook, {
    enabled: false, // Default to disabled
    blockingMode: false,
    conventionalCommits: true,
    checkSpelling: true,
    checkGrammar: true,
    maxLength: { subject: 72, body: 100 },
    suggestImprovements: true,
    preferCli: useClaudeCli
  });

  // Register pre-push hook
  registry.registerHook('pre-push', PrePushHook, {
    enabled: false, // Default to disabled
    blockingMode: false,
    auditTypes: ['security', 'credentials', 'sensitive-data', 'dependencies'],
    excludePatterns: ['node_modules/**', 'dist/**', 'build/**', '**/*.lock'],
    maxCommits: 10,
    maxDiffSize: 100000,
    preferCli: useClaudeCli
  });

  // Register post-merge hook
  registry.registerHook('post-merge', PostMergeHook, {
    enabled: false, // Default to disabled
    summaryFormat: 'detailed', // 'concise' or 'detailed'
    includeStats: true,
    includeDependencies: true,
    includeBreakingChanges: true,
    notifyMethod: 'terminal', // 'terminal', 'file', or 'notification'
    maxDiffSize: 100000,
    preferCli: useClaudeCli
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
    maxDiffSize: 100000,
    preferCli: useClaudeCli
  });

  // Register post-rewrite hook
  registry.registerHook('post-rewrite', PostRewriteHook, {
    enabled: false, // Default to disabled
    summaryFormat: 'detailed', // 'concise' or 'detailed'
    includeStats: true,
    includeDependencies: true,
    includeBreakingChanges: true,
    notifyMethod: 'terminal', // 'terminal', 'file', or 'notification'
    maxDiffSize: 100000,
    preferCli: useClaudeCli
  });

  // Register pre-rebase hook
  registry.registerHook('pre-rebase', PreRebaseHook, {
    enabled: false, // Default to disabled
    blockingMode: 'warn', // 'block', 'warn', or 'none'
    checkConflicts: true,
    checkTestImpact: false,
    checkDependencies: true,
    blockOnSeverity: 'high', // 'critical', 'high', 'medium', 'low', 'none'
    maxDiffSize: 100000,
    preferCli: useClaudeCli
  });

  // Register branch strategy hook
  registry.registerHook('branch-strategy', BranchStrategyHook, {
    enabled: false, // Default to disabled
    strategyType: 'gitflow', // 'gitflow', 'trunk', 'github-flow', or 'custom'
    blockingMode: 'warn', // 'block', 'warn', or 'none'
    branchPrefixes: {
      feature: 'feature/',
      bugfix: 'bugfix/',
      hotfix: 'hotfix/',
      release: 'release/',
      support: 'support/'
    },
    mainBranches: ['main', 'master', 'develop'],
    protectedBranches: ['main', 'master', 'develop', 'release/*'],
    releasePattern: '^release\\/v?(\\d+\\.\\d+\\.\\d+)$',
    validateWithClaude: true,
    jiraIntegration: false,
    preferCli: useClaudeCli
  });

  // Register test-first development hook
  registry.registerHook('test-first-development', TestFirstDevelopmentHook, {
    enabled: false, // Default to disabled
    blockingMode: 'warn', // 'block', 'warn', or 'none'
    fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.py', '.rb'], // File extensions to check
    testDirectories: ['test', 'tests', '__tests__', 'spec'], // Directories where tests should be located
    suggestWithClaude: true, // Whether to use Claude for test suggestions
    testFramework: 'auto', // Auto-detect test framework
    preferCli: useClaudeCli
  });

  // Register diff-explain feature
  registry.registerHook('diff-explain', DiffExplainHook, {
    enabled: false, // Default to disabled
    verbosity: 'detailed', // 'detailed' or 'brief'
    focusAreas: ['functionality', 'security', 'performance', 'readability'],
    outputFormat: 'inline', // 'inline', 'summary-only', 'side-by-side'
    maxTokens: 4000,
    maxDiffSize: 100000,
    highlightIssues: true,
    includeSuggestions: true,
    includeSummary: true,
    preferCli: useClaudeCli
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

  // Try to import project detector for code quality hooks
  let projectDetector = null;
  try {
    projectDetector = (await import('../utils/project-detector.js')).default;
  } catch (err) {
    // Project detector not available, continue without it
    console.log('Project detector not available, code quality hooks will not be offered');
  }

  // Detect project capabilities if detector is available
  let typeScriptInfo = { isTypeScriptProject: false, hasTypesCheck: false };
  let linterInfo = { linter: null, scriptName: null };
  let formatterInfo = { formatter: null, scriptName: null };
  let commitlintInfo = { hasCommitlint: false };

  if (projectDetector) {
    try {
      // Detect TypeScript
      const isTypeScript = await projectDetector.isTypeScriptProject(config.projectRoot);
      if (isTypeScript) {
        typeScriptInfo = {
          isTypeScriptProject: true,
          hasTypesCheck: false,
          ...(await projectDetector.hasTypeScriptTypeChecking(config.projectRoot))
        };
      }

      // Detect linter
      linterInfo = await projectDetector.detectLinter(config.projectRoot);

      // Detect formatter
      formatterInfo = await projectDetector.detectFormatter(config.projectRoot);

      // Detect commitlint
      commitlintInfo = await projectDetector.hasCommitlint(config.projectRoot);
    } catch (err) {
      // Error in detection, continue without it
      console.log('Error detecting project capabilities:', err.message);
    }
  }

  // Create list of available hooks for selection
  const choices = Object.entries(hooks).map(([id, hook]) => ({
    name: `${HOOK_DESCRIPTIONS[id]?.title || hook.name} - ${HOOK_DESCRIPTIONS[id]?.description || hook.description}`,
    value: id,
    short: HOOK_DESCRIPTIONS[id]?.title || hook.name,
    checked: hook.isEnabled()
  }));

  // Add code quality hooks if capabilities are detected
  if (typeScriptInfo.isTypeScriptProject) {
    choices.push({
      name: `${HOOK_DESCRIPTIONS['type-check'].title} - ${HOOK_DESCRIPTIONS['type-check'].description}`,
      value: 'type-check',
      short: HOOK_DESCRIPTIONS['type-check'].title,
      checked: false
    });
  }

  if (linterInfo.linter) {
    choices.push({
      name: `${HOOK_DESCRIPTIONS['lint'].title} - ${HOOK_DESCRIPTIONS['lint'].description} (${linterInfo.linter})`,
      value: 'lint',
      short: HOOK_DESCRIPTIONS['lint'].title,
      checked: false
    });
  }

  if (formatterInfo.formatter) {
    choices.push({
      name: `${HOOK_DESCRIPTIONS['format'].title} - ${HOOK_DESCRIPTIONS['format'].description} (${formatterInfo.formatter})`,
      value: 'format',
      short: HOOK_DESCRIPTIONS['format'].title,
      checked: false
    });
  }

  if (commitlintInfo.hasCommitlint) {
    choices.push({
      name: `${HOOK_DESCRIPTIONS['commit-lint'].title} - ${HOOK_DESCRIPTIONS['commit-lint'].description}`,
      value: 'commit-lint',
      short: HOOK_DESCRIPTIONS['commit-lint'].title,
      checked: false
    });
  }
  
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
    // Handle code quality hooks separately
    if (['type-check', 'lint', 'format', 'commit-lint'].includes(hookId)) {
      await configureCodeQualityHook(hookId, {
        ...config,
        typeScriptInfo,
        linterInfo,
        formatterInfo,
        commitlintInfo,
        projectDetector
      });
      continue;
    }

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

    // Configure branch strategy hook
    else if (hookId === 'branch-strategy') {
      const { strategyType, blockingMode, validateWithClaude } = await inquirer.prompt([
        {
          type: 'list',
          name: 'strategyType',
          message: 'Select branching strategy to enforce:',
          choices: [
            { name: 'GitFlow - Feature/release/hotfix branches with develop and main branches', value: 'gitflow' },
            { name: 'Trunk-based - Short-lived feature branches merged frequently to trunk', value: 'trunk' },
            { name: 'GitHub Flow - Feature branches merged directly to main', value: 'github-flow' },
            { name: 'Custom - Define your own branching strategy rules', value: 'custom' }
          ],
          default: 'gitflow'
        },
        {
          type: 'list',
          name: 'blockingMode',
          message: 'How should the hook respond to strategy violations?',
          choices: [
            { name: 'Block - Prevent push if violations are detected', value: 'block' },
            { name: 'Warn - Show warnings but allow push to proceed', value: 'warn' },
            { name: 'None - Just provide information, no warnings', value: 'none' }
          ],
          default: 'warn'
        },
        {
          type: 'confirm',
          name: 'validateWithClaude',
          message: 'Use Claude AI to validate branch purposes?',
          default: true
        }
      ]);

      hook.strategyType = strategyType;
      hook.blockingMode = blockingMode;
      hook.validateWithClaude = validateWithClaude;

      // If GitFlow is selected, configure branch prefixes
      if (strategyType === 'gitflow') {
        const { configurePrefixes } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'configurePrefixes',
            message: 'Configure GitFlow branch prefixes?',
            default: false
          }
        ]);

        if (configurePrefixes) {
          const { feature, bugfix, hotfix, release, support } = await inquirer.prompt([
            {
              type: 'input',
              name: 'feature',
              message: 'Feature branch prefix:',
              default: hook.branchPrefixes.feature
            },
            {
              type: 'input',
              name: 'bugfix',
              message: 'Bugfix branch prefix:',
              default: hook.branchPrefixes.bugfix
            },
            {
              type: 'input',
              name: 'hotfix',
              message: 'Hotfix branch prefix:',
              default: hook.branchPrefixes.hotfix
            },
            {
              type: 'input',
              name: 'release',
              message: 'Release branch prefix:',
              default: hook.branchPrefixes.release
            },
            {
              type: 'input',
              name: 'support',
              message: 'Support branch prefix:',
              default: hook.branchPrefixes.support
            }
          ]);

          hook.branchPrefixes = {
            feature,
            bugfix,
            hotfix,
            release,
            support
          };
        }

        // Ask about main branches
        const { configureMainBranches } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'configureMainBranches',
            message: 'Configure main branches?',
            default: false
          }
        ]);

        if (configureMainBranches) {
          const { mainBranches } = await inquirer.prompt([
            {
              type: 'input',
              name: 'mainBranches',
              message: 'Main branches (comma-separated list):',
              default: hook.mainBranches.join(','),
              filter: value => value.split(',').map(b => b.trim()).filter(b => b)
            }
          ]);

          hook.mainBranches = mainBranches;
        }

        // Ask about protected branches
        const { configureProtectedBranches } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'configureProtectedBranches',
            message: 'Configure protected branches?',
            default: false
          }
        ]);

        if (configureProtectedBranches) {
          const { protectedBranches } = await inquirer.prompt([
            {
              type: 'input',
              name: 'protectedBranches',
              message: 'Protected branches (comma-separated list, can include wildcards):',
              default: hook.protectedBranches.join(','),
              filter: value => value.split(',').map(b => b.trim()).filter(b => b)
            }
          ]);

          hook.protectedBranches = protectedBranches;
        }
      }

      // Ask about JIRA integration
      const { jiraIntegration } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'jiraIntegration',
          message: 'Enforce JIRA ticket IDs in branch names?',
          default: hook.jiraIntegration
        }
      ]);

      hook.jiraIntegration = jiraIntegration;

      if (jiraIntegration) {
        const { jiraPattern } = await inquirer.prompt([
          {
            type: 'input',
            name: 'jiraPattern',
            message: 'JIRA ticket ID pattern (regex):',
            default: hook.jiraPattern || '[A-Z]+-\\d+'
          }
        ]);

        hook.jiraPattern = jiraPattern;
      }

      // Ask about custom rules if using custom strategy
      if (strategyType === 'custom') {
        console.log(chalk.blue('\nFor custom branching strategies, you can define rules in .claude/branch-strategy.json'));
        console.log(chalk.gray('Example rules include branch naming patterns, target branch restrictions, and file checks.'));
        console.log(chalk.gray('See documentation for more details on custom rule configuration.'));
      }
    }

    // Configure diff-explain feature
    else if (hookId === 'diff-explain') {
      const { verbosity, outputFormat, focusAreas } = await inquirer.prompt([
        {
          type: 'list',
          name: 'verbosity',
          message: 'How detailed should explanations be?',
          choices: [
            { name: 'Detailed - Comprehensive explanations with context', value: 'detailed' },
            { name: 'Brief - Concise explanations focused on key points', value: 'brief' }
          ],
          default: 'detailed'
        },
        {
          type: 'list',
          name: 'outputFormat',
          message: 'How should explanations be displayed?',
          choices: [
            { name: 'Inline - Explanations with the original diff', value: 'inline' },
            { name: 'Summary Only - Just the explanations without the diff', value: 'summary-only' },
            { name: 'Side-by-Side - Explanations next to the diff (experimental)', value: 'side-by-side' }
          ],
          default: 'inline'
        },
        {
          type: 'checkbox',
          name: 'focusAreas',
          message: 'Which aspects should explanations focus on?',
          choices: [
            { name: 'Functionality - Purpose and behavior of changes', value: 'functionality', checked: true },
            { name: 'Security - Security implications and vulnerabilities', value: 'security', checked: true },
            { name: 'Performance - Efficiency and resource considerations', value: 'performance', checked: true },
            { name: 'Readability - Code quality and maintainability', value: 'readability', checked: true }
          ],
          validate: input => input.length > 0 ? true : 'Please select at least one focus area'
        }
      ]);

      hook.verbosity = verbosity;
      hook.outputFormat = outputFormat;

      if (focusAreas && focusAreas.length > 0) {
        hook.focusAreas = focusAreas;
      }

      // Ask about advanced options
      const { configureAdvanced } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'configureAdvanced',
          message: 'Configure advanced options for diff explanations?',
          default: false
        }
      ]);

      if (configureAdvanced) {
        const { maxTokens, maxDiffSize, highlightIssues, includeSuggestions, includeSummary } = await inquirer.prompt([
          {
            type: 'input',
            name: 'maxTokens',
            message: 'Maximum tokens for Claude response:',
            default: hook.maxTokens.toString(),
            validate: input => /^\d+$/.test(input) && parseInt(input) >= 1000 ? true : 'Please enter a number of at least 1000'
          },
          {
            type: 'input',
            name: 'maxDiffSize',
            message: 'Maximum diff size to process (in characters):',
            default: hook.maxDiffSize.toString(),
            validate: input => /^\d+$/.test(input) && parseInt(input) >= 1000 ? true : 'Please enter a number of at least 1000'
          },
          {
            type: 'confirm',
            name: 'highlightIssues',
            message: 'Highlight potential issues in explanations?',
            default: hook.highlightIssues
          },
          {
            type: 'confirm',
            name: 'includeSuggestions',
            message: 'Include suggestions for improvements?',
            default: hook.includeSuggestions
          },
          {
            type: 'confirm',
            name: 'includeSummary',
            message: 'Include summary of overall changes?',
            default: hook.includeSummary
          }
        ]);

        hook.maxTokens = parseInt(maxTokens, 10);
        hook.maxDiffSize = parseInt(maxDiffSize, 10);
        hook.highlightIssues = highlightIssues;
        hook.includeSuggestions = includeSuggestions;
        hook.includeSummary = includeSummary;
      }
    }

    // Configure test-first development hook
    else if (hookId === 'test-first-development') {
      const { blockingMode, fileExtensions, testFramework, suggestWithClaude } = await inquirer.prompt([
        {
          type: 'list',
          name: 'blockingMode',
          message: 'How should the hook respond when files are missing tests?',
          choices: [
            { name: 'Block - Prevent commit until tests are created', value: 'block' },
            { name: 'Warn - Show warnings but allow commit to proceed', value: 'warn' },
            { name: 'None - Just provide suggestions, no warnings', value: 'none' }
          ],
          default: 'warn'
        },
        {
          type: 'checkbox',
          name: 'fileExtensions',
          message: 'Which file types should require tests?',
          choices: [
            { name: 'JavaScript (.js)', value: '.js', checked: true },
            { name: 'TypeScript (.ts)', value: '.ts', checked: true },
            { name: 'JSX React (.jsx)', value: '.jsx', checked: true },
            { name: 'TSX React (.tsx)', value: '.tsx', checked: true },
            { name: 'Python (.py)', value: '.py', checked: true },
            { name: 'Ruby (.rb)', value: '.rb', checked: false }
          ],
          validate: input => input.length > 0 ? true : 'Please select at least one file type'
        },
        {
          type: 'list',
          name: 'testFramework',
          message: 'Which test framework are you using?',
          choices: [
            { name: 'Auto-detect from project', value: 'auto' },
            { name: 'Jest', value: 'jest' },
            { name: 'Mocha', value: 'mocha' },
            { name: 'Pytest', value: 'pytest' },
            { name: 'Jasmine', value: 'jasmine' },
            { name: 'Vitest', value: 'vitest' },
            { name: 'React Testing Library', value: 'rtl' }
          ],
          default: 'auto'
        },
        {
          type: 'confirm',
          name: 'suggestWithClaude',
          message: 'Use Claude to suggest test cases for new files?',
          default: true
        }
      ]);

      hook.blockingMode = blockingMode;
      hook.fileExtensions = fileExtensions;
      hook.testFramework = testFramework;
      hook.suggestWithClaude = suggestWithClaude;

      // Ask about test directories and patterns
      const { customizeTestLocations } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'customizeTestLocations',
          message: 'Do you want to customize where tests should be located?',
          default: false
        }
      ]);

      if (customizeTestLocations) {
        const { testDirectories } = await inquirer.prompt([
          {
            type: 'input',
            name: 'testDirectories',
            message: 'Enter comma-separated list of test directories:',
            default: hook.testDirectories.join(','),
            filter: value => value.split(',').map(d => d.trim()).filter(d => d)
          }
        ]);

        hook.testDirectories = testDirectories;
      }

      // Ask about excluded patterns
      const { customizeExcludes } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'customizeExcludes',
          message: 'Do you want to customize patterns to exclude from test checks?',
          default: false
        }
      ]);

      if (customizeExcludes) {
        const { excludePatterns } = await inquirer.prompt([
          {
            type: 'input',
            name: 'excludePatterns',
            message: 'Enter comma-separated exclude patterns (e.g., node_modules/**,dist/**):',
            default: hook.excludePatterns ? hook.excludePatterns.join(',') : '**/node_modules/**,**/dist/**,**/build/**,**/coverage/**,**/.git/**',
            filter: value => value.split(',').map(p => p.trim()).filter(p => p)
          }
        ]);

        hook.excludePatterns = excludePatterns;
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

/**
 * Configure code quality hooks
 * @param {string} hookId The hook ID ('type-check', 'lint', 'format', 'commit-lint')
 * @param {Object} options Configuration options
 * @returns {Promise<void>}
 */
async function configureCodeQualityHook(hookId, options) {
  const {
    projectRoot,
    logger,
    dryRun,
    typeScriptInfo,
    linterInfo,
    formatterInfo,
    commitlintInfo,
    projectDetector
  } = options;

  console.log(chalk.blue(`\nConfiguring ${HOOK_DESCRIPTIONS[hookId].title}...\n`));
  console.log(chalk.gray(HOOK_DESCRIPTIONS[hookId].details || ''));

  try {
    // Handle TypeScript type checking
    if (hookId === 'type-check' && typeScriptInfo.isTypeScriptProject) {
      let scriptName = typeScriptInfo.scriptName;

      // If no script exists, offer to create one
      if (!scriptName) {
        const { shouldCreate } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldCreate',
            message: 'No TypeScript type checking script found. Would you like to create one?',
            default: true
          }
        ]);

        if (shouldCreate && projectDetector) {
          const { scriptName: recommendedName, scriptCommand } =
            await projectDetector.getRecommendedTypeCheckScript(projectRoot);

          const added = await projectDetector.addNpmScript(projectRoot, recommendedName, scriptCommand);

          if (added) {
            console.log(chalk.green(`Added "${recommendedName}" script to package.json: "${scriptCommand}"`));
            scriptName = recommendedName;
          } else {
            console.log(chalk.red('Failed to add type check script to package.json'));
          }
        }
      }

      if (scriptName) {
        // Configure the pre-commit hook to run type checking
        await configurePreCommitExtension('typeCheck', {
          enabled: true,
          scriptName
        }, projectRoot, dryRun, logger);
      }
    }

    // Handle linting
    else if (hookId === 'lint' && linterInfo.linter) {
      let scriptName = linterInfo.scriptName;

      // If no script exists, offer to create one
      if (!scriptName) {
        const { shouldCreate } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldCreate',
            message: `No ${linterInfo.linter} script found. Would you like to create one?`,
            default: true
          }
        ]);

        if (shouldCreate && projectDetector) {
          const { scriptName: recommendedName, scriptCommand } =
            await projectDetector.getRecommendedLintScript(projectRoot, linterInfo.linter);

          const added = await projectDetector.addNpmScript(projectRoot, recommendedName, scriptCommand);

          if (added) {
            console.log(chalk.green(`Added "${recommendedName}" script to package.json: "${scriptCommand}"`));
            scriptName = recommendedName;
          } else {
            console.log(chalk.red(`Failed to add ${linterInfo.linter} script to package.json`));
          }
        }
      }

      if (scriptName) {
        // Configure the pre-commit hook to run linting
        await configurePreCommitExtension('linting', {
          enabled: true,
          linter: linterInfo.linter,
          scriptName
        }, projectRoot, dryRun, logger);
      }
    }

    // Handle formatting
    else if (hookId === 'format' && formatterInfo.formatter) {
      let scriptName = formatterInfo.scriptName;

      // If no script exists, offer to create one
      if (!scriptName) {
        const { shouldCreate } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldCreate',
            message: `No ${formatterInfo.formatter} script found. Would you like to create one?`,
            default: true
          }
        ]);

        if (shouldCreate && projectDetector) {
          const { scriptName: recommendedName, scriptCommand } =
            await projectDetector.getRecommendedFormatScript(projectRoot, formatterInfo.formatter);

          const added = await projectDetector.addNpmScript(projectRoot, recommendedName, scriptCommand);

          if (added) {
            console.log(chalk.green(`Added "${recommendedName}" script to package.json: "${scriptCommand}"`));
            scriptName = recommendedName;
          } else {
            console.log(chalk.red(`Failed to add ${formatterInfo.formatter} script to package.json`));
          }
        }
      }

      if (scriptName) {
        // Configure the pre-commit hook to run formatting
        await configurePreCommitExtension('formatting', {
          enabled: true,
          formatter: formatterInfo.formatter,
          scriptName
        }, projectRoot, dryRun, logger);
      }
    }

    // Handle commitlint
    else if (hookId === 'commit-lint' && commitlintInfo.hasCommitlint) {
      // Configure the commit-msg hook to run commitlint
      await configureCommitMsgExtension('commitlint', {
        enabled: true
      }, projectRoot, dryRun, logger);
    }
  } catch (err) {
    console.log(chalk.red(`Error configuring ${hookId} hook: ${err.message}`));
    if (logger) {
      logger.error(`Error configuring ${hookId} hook: ${err.stack}`);
    }
  }
}

/**
 * Configure pre-commit hook extension
 * @param {string} extensionName Name of the extension ('typeCheck', 'linting', 'formatting')
 * @param {Object} config Configuration object
 * @param {string} projectRoot Project root directory
 * @param {boolean} dryRun Whether to perform a dry run
 * @param {Object} logger Logger instance
 * @returns {Promise<boolean>} Whether the operation succeeded
 */
async function configurePreCommitExtension(extensionName, config, projectRoot, dryRun, logger) {
  try {
    // Get the pre-commit hook configuration file path
    const hooksDir = path.join(projectRoot, '.claude', 'hooks');
    const configFile = path.join(hooksDir, 'pre-commit.json');

    // Create directory if it doesn't exist
    if (!dryRun) {
      await fs.ensureDir(hooksDir);
    }

    // Load existing configuration if available
    let hookConfig = {};
    try {
      if (await fs.pathExists(configFile)) {
        hookConfig = JSON.parse(await fs.readFile(configFile, 'utf8'));
      }
    } catch (err) {
      console.log(chalk.yellow(`Could not read existing pre-commit configuration: ${err.message}`));
    }

    // Update configuration
    hookConfig[extensionName] = config;

    // Save configuration
    if (!dryRun) {
      await fs.writeFile(configFile, JSON.stringify(hookConfig, null, 2), 'utf8');
      console.log(chalk.green(`Updated pre-commit hook configuration with ${extensionName} settings`));
    } else {
      console.log(chalk.blue(`[DRY RUN] Would update pre-commit hook configuration with ${extensionName} settings`));
    }

    return true;
  } catch (err) {
    console.log(chalk.red(`Failed to configure pre-commit ${extensionName}: ${err.message}`));
    if (logger) {
      logger.error(`Failed to configure pre-commit ${extensionName}: ${err.stack}`);
    }
    return false;
  }
}

/**
 * Configure commit-msg hook extension
 * @param {string} extensionName Name of the extension ('commitlint')
 * @param {Object} config Configuration object
 * @param {string} projectRoot Project root directory
 * @param {boolean} dryRun Whether to perform a dry run
 * @param {Object} logger Logger instance
 * @returns {Promise<boolean>} Whether the operation succeeded
 */
async function configureCommitMsgExtension(extensionName, config, projectRoot, dryRun, logger) {
  try {
    // Get the commit-msg hook configuration file path
    const hooksDir = path.join(projectRoot, '.claude', 'hooks');
    const configFile = path.join(hooksDir, 'commit-msg.json');

    // Create directory if it doesn't exist
    if (!dryRun) {
      await fs.ensureDir(hooksDir);
    }

    // Load existing configuration if available
    let hookConfig = {};
    try {
      if (await fs.pathExists(configFile)) {
        hookConfig = JSON.parse(await fs.readFile(configFile, 'utf8'));
      }
    } catch (err) {
      console.log(chalk.yellow(`Could not read existing commit-msg configuration: ${err.message}`));
    }

    // Update configuration
    hookConfig[extensionName] = config;

    // Save configuration
    if (!dryRun) {
      await fs.writeFile(configFile, JSON.stringify(hookConfig, null, 2), 'utf8');
      console.log(chalk.green(`Updated commit-msg hook configuration with ${extensionName} settings`));
    } else {
      console.log(chalk.blue(`[DRY RUN] Would update commit-msg hook configuration with ${extensionName} settings`));
    }

    return true;
  } catch (err) {
    console.log(chalk.red(`Failed to configure commit-msg ${extensionName}: ${err.message}`));
    if (logger) {
      logger.error(`Failed to configure commit-msg ${extensionName}: ${err.stack}`);
    }
    return false;
  }
}

export default {
  getHookRegistry,
  initializeHooks,
  setupHooks,
  removeHooks
};