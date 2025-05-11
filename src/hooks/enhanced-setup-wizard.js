/**
 * Enhanced Hook Setup Wizard
 * 
 * Provides an interactive wizard for setting up Git hooks with code quality
 * checks like TypeScript type checking, linting, and formatting.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { getHookRegistry, initializeHooks, setupHooks } from './index.js';
import { applyHookTemplate } from './config-manager.js';
import { isClaudeCliAvailable } from '../integrations/claude-cli.js';
import projectDetector from '../utils/project-detector.js';
import codeQualityHooks from './code-quality-hooks.js';

/**
 * Run the enhanced hook setup wizard
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {Object} [options.logger] Logger instance
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @param {boolean} [options.nonInteractive=false] Whether to run in non-interactive mode
 * @returns {Promise<Object>} Setup results
 */
export async function runEnhancedSetupWizard({ 
  projectRoot, 
  logger,
  dryRun = false,
  nonInteractive = false
}) {
  const printInfo = message => logger?.info?.(message) || console.log(chalk.blue(message));
  const printSuccess = message => logger?.success?.(message) || console.log(chalk.green(message));
  const printWarning = message => logger?.warn?.(message) || console.warn(chalk.yellow(message));
  
  printInfo('Starting Enhanced Claude Git Hooks Setup Wizard');
  
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
  
  // Detect project capabilities
  printInfo('Detecting project capabilities...');
  
  // Check for TypeScript
  const isTypeScriptProject = await projectDetector.isTypeScriptProject(projectRoot);
  if (isTypeScriptProject) {
    printInfo('TypeScript detected in project');
  }
  
  // Check for existing type check script
  const typeCheckInfo = await projectDetector.hasTypeScriptTypeChecking(projectRoot);
  if (typeCheckInfo.hasTypesCheck) {
    printInfo(`TypeScript type checking script found: ${typeCheckInfo.scriptName}`);
  } else if (isTypeScriptProject) {
    printInfo('No TypeScript type checking script found (will offer to add one)');
  }
  
  // Check for linter
  const linterInfo = await projectDetector.detectLinter(projectRoot);
  if (linterInfo.linter) {
    printInfo(`Linter detected: ${linterInfo.linter}${linterInfo.scriptName ? ` (${linterInfo.scriptName})` : ''}`);
  }
  
  // Check for formatter
  const formatterInfo = await projectDetector.detectFormatter(projectRoot);
  if (formatterInfo.formatter) {
    printInfo(`Formatter detected: ${formatterInfo.formatter}${formatterInfo.scriptName ? ` (${formatterInfo.scriptName})` : ''}`);
  }
  
  // Check for commitlint
  const commitlintInfo = await projectDetector.hasCommitlint(projectRoot);
  if (commitlintInfo.hasCommitlint) {
    printInfo(`commitlint detected${commitlintInfo.configType ? ` (${commitlintInfo.configType})` : ''}`);
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
  
  // Handle code quality setup
  let setupTypeScript = false;
  let setupLinting = false;
  let setupFormatting = false;
  let setupCommitlint = false;
  
  // If TypeScript is detected, ask about adding type checking
  if (isTypeScriptProject && !typeCheckInfo.hasTypesCheck) {
    const { shouldAddTypeScript } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldAddTypeScript',
        message: 'Would you like to add a TypeScript type checking script to your pre-commit hook?',
        default: true
      }
    ]);
    
    setupTypeScript = shouldAddTypeScript;
  }
  
  // If linter is detected but no script, ask about adding it
  if (linterInfo.linter && !linterInfo.scriptName) {
    const { shouldAddLinting } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldAddLinting',
        message: `Would you like to add a ${linterInfo.linter} linting script to your pre-commit hook?`,
        default: true
      }
    ]);
    
    setupLinting = shouldAddLinting;
  }
  
  // If formatter is detected but no script, ask about adding it
  if (formatterInfo.formatter && !formatterInfo.scriptName) {
    const { shouldAddFormatting } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldAddFormatting',
        message: `Would you like to add a ${formatterInfo.formatter} formatting script to your pre-commit hook?`,
        default: true
      }
    ]);
    
    setupFormatting = shouldAddFormatting;
  }
  
  // If commitlint is detected, ask about adding it to commit-msg hook
  if (commitlintInfo.hasCommitlint) {
    const { shouldAddCommitlint } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldAddCommitlint',
        message: 'Would you like to add commitlint validation to your commit-msg hook?',
        default: true
      }
    ]);
    
    setupCommitlint = shouldAddCommitlint;
  }
  
  // Set up the scripts if needed
  let typeScriptScriptName = typeCheckInfo.scriptName;
  if (setupTypeScript) {
    printInfo('Setting up TypeScript type checking script...');
    const result = await codeQualityHooks.setupTypeCheckScript({ projectRoot, logger });
    if (result.added) {
      printSuccess(`Added TypeScript type checking script: ${result.scriptName}`);
      typeScriptScriptName = result.scriptName;
    }
  }
  
  let lintingScriptName = linterInfo.scriptName;
  if (setupLinting) {
    printInfo(`Setting up ${linterInfo.linter} linting script...`);
    const result = await codeQualityHooks.setupLintingScript({ projectRoot, logger });
    if (result.added) {
      printSuccess(`Added ${result.linter} linting script: ${result.scriptName}`);
      lintingScriptName = result.scriptName;
    }
  }
  
  let formattingScriptName = formatterInfo.scriptName;
  if (setupFormatting) {
    printInfo(`Setting up ${formatterInfo.formatter} formatting script...`);
    const result = await codeQualityHooks.setupFormattingScript({ projectRoot, logger });
    if (result.added) {
      printSuccess(`Added ${result.formatter} formatting script: ${result.scriptName}`);
      formattingScriptName = result.scriptName;
    }
  }
  
  // If using a template, apply it
  if (approach !== 'custom') {
    printInfo(`Applying ${approach} configuration template...`);
    await applyHookTemplate({
      projectRoot,
      template: approach,
      logger
    });
    
    // If TypeScript type checking is available, add it to pre-commit hook
    if (isTypeScriptProject && typeScriptScriptName) {
      printInfo('Adding TypeScript type checking to pre-commit hook...');
      await codeQualityHooks.addTypeCheckHook({
        projectRoot,
        scriptName: typeScriptScriptName,
        logger
      });
    }
    
    // If linting is available, add it to pre-commit hook
    if (linterInfo.linter && lintingScriptName) {
      printInfo(`Adding ${linterInfo.linter} linting to pre-commit hook...`);
      await codeQualityHooks.addLintingHook({
        projectRoot,
        linter: linterInfo.linter,
        scriptName: lintingScriptName,
        logger
      });
    }
    
    // If formatting is available, add it to pre-commit hook
    if (formatterInfo.formatter && formattingScriptName) {
      printInfo(`Adding ${formatterInfo.formatter} formatting to pre-commit hook...`);
      await codeQualityHooks.addFormattingHook({
        projectRoot,
        formatter: formatterInfo.formatter,
        scriptName: formattingScriptName,
        logger
      });
    }
    
    // If commitlint is available and user wants to add it, add it to commit-msg hook
    if (commitlintInfo.hasCommitlint && setupCommitlint) {
      printInfo('Adding commitlint validation to commit-msg hook...');
      await codeQualityHooks.addCommitlintHook({
        projectRoot,
        logger
      });
    }
    
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

export default runEnhancedSetupWizard;