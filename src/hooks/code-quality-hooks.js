/**
 * Code Quality Hooks
 * 
 * Provides functions for setting up code quality hooks such as TypeScript type checking,
 * linting, formatting, and commit message validation.
 */

import _fs from 'fs-extra';
import _path from 'path';
import projectDetector from '../utils/project-detector.js';
import { updateHookConfig } from './config-manager.js';

/**
 * Add TypeScript type checking to pre-commit hook
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {string} options.scriptName npm script name to run
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<boolean>} Whether the hook was configured successfully
 */
export async function addTypeCheckHook({ projectRoot, scriptName, logger }) {
  try {
    const preCommitConfig = {
      typeCheck: {
        enabled: true,
        scriptName: scriptName
      }
    };
    
    return await updateHookConfig({
      projectRoot,
      hookId: 'pre-commit',
      hookConfig: preCommitConfig,
      logger
    });
  } catch (err) {
    logger?.error?.(`Failed to configure TypeScript type checking hook: ${err.message}`);
    return false;
  }
}

/**
 * Add linting to pre-commit hook
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {string} options.linter Name of the linter
 * @param {string} options.scriptName npm script name to run
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<boolean>} Whether the hook was configured successfully
 */
export async function addLintingHook({ projectRoot, linter, scriptName, logger }) {
  try {
    const preCommitConfig = {
      linting: {
        enabled: true,
        linter: linter,
        scriptName: scriptName
      }
    };
    
    return await updateHookConfig({
      projectRoot,
      hookId: 'pre-commit',
      hookConfig: preCommitConfig,
      logger
    });
  } catch (err) {
    logger?.error?.(`Failed to configure linting hook: ${err.message}`);
    return false;
  }
}

/**
 * Add formatting to pre-commit hook
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {string} options.formatter Name of the formatter
 * @param {string} options.scriptName npm script name to run
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<boolean>} Whether the hook was configured successfully
 */
export async function addFormattingHook({ projectRoot, formatter, scriptName, logger }) {
  try {
    const preCommitConfig = {
      formatting: {
        enabled: true,
        formatter: formatter,
        scriptName: scriptName
      }
    };
    
    return await updateHookConfig({
      projectRoot,
      hookId: 'pre-commit',
      hookConfig: preCommitConfig,
      logger
    });
  } catch (err) {
    logger?.error?.(`Failed to configure formatting hook: ${err.message}`);
    return false;
  }
}

/**
 * Add commitlint to commit-msg hook
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<boolean>} Whether the hook was configured successfully
 */
export async function addCommitlintHook({ projectRoot, logger }) {
  try {
    const commitMsgConfig = {
      commitlint: {
        enabled: true
      }
    };
    
    return await updateHookConfig({
      projectRoot,
      hookId: 'commit-msg',
      hookConfig: commitMsgConfig,
      logger
    });
  } catch (err) {
    logger?.error?.(`Failed to configure commitlint hook: ${err.message}`);
    return false;
  }
}

/**
 * Set up type checking script if it doesn't exist
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<{added: boolean, scriptName: string|null}>} Result of the operation
 */
export async function setupTypeCheckScript({ projectRoot, logger }) {
  try {
    // Check if TypeScript is used in the project
    const isTS = await projectDetector.isTypeScriptProject(projectRoot);
    if (!isTS) {
      logger?.info?.('TypeScript not detected in the project. Skipping type check script setup.');
      return { added: false, scriptName: null };
    }
    
    // Check if a type check script already exists
    const { hasTypesCheck, scriptName } = await projectDetector.hasTypeScriptTypeChecking(projectRoot);
    if (hasTypesCheck) {
      logger?.info?.(`TypeScript type check script already exists: ${scriptName}`);
      return { added: false, scriptName };
    }
    
    // Add a type check script
    const { scriptName: recommendedName, scriptCommand } = 
      await projectDetector.getRecommendedTypeCheckScript(projectRoot);
    
    const added = await projectDetector.addNpmScript(projectRoot, recommendedName, scriptCommand);
    
    if (added) {
      logger?.success?.(`Added "${recommendedName}" script to package.json: "${scriptCommand}"`);
      return { added: true, scriptName: recommendedName };
    } else {
      logger?.error?.('Failed to add type check script to package.json');
      return { added: false, scriptName: null };
    }
  } catch (err) {
    logger?.error?.(`Error setting up type check script: ${err.message}`);
    return { added: false, scriptName: null };
  }
}

/**
 * Set up linting script if it doesn't exist
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<{added: boolean, linter: string|null, scriptName: string|null}>} Result of the operation
 */
export async function setupLintingScript({ projectRoot, logger }) {
  try {
    // Detect linter
    const { linter, scriptName } = await projectDetector.detectLinter(projectRoot);
    
    if (linter && scriptName) {
      logger?.info?.(`Linting script already exists: ${linter} (${scriptName})`);
      return { added: false, linter, scriptName };
    }
    
    if (linter && !scriptName) {
      // Linter installed but no script - add a script
      const { scriptName: recommendedName, scriptCommand } = 
        await projectDetector.getRecommendedLintScript(projectRoot, linter);
      
      const added = await projectDetector.addNpmScript(projectRoot, recommendedName, scriptCommand);
      
      if (added) {
        logger?.success?.(`Added "${recommendedName}" script to package.json: "${scriptCommand}"`);
        return { added: true, linter, scriptName: recommendedName };
      } else {
        logger?.error?.(`Failed to add ${linter} script to package.json`);
        return { added: false, linter, scriptName: null };
      }
    }
    
    logger?.info?.('No linter detected in the project. Skipping linting script setup.');
    return { added: false, linter: null, scriptName: null };
  } catch (err) {
    logger?.error?.(`Error setting up linting script: ${err.message}`);
    return { added: false, linter: null, scriptName: null };
  }
}

/**
 * Set up formatting script if it doesn't exist
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<{added: boolean, formatter: string|null, scriptName: string|null}>} Result of the operation
 */
export async function setupFormattingScript({ projectRoot, logger }) {
  try {
    // Detect formatter
    const { formatter, scriptName } = await projectDetector.detectFormatter(projectRoot);
    
    if (formatter && scriptName) {
      logger?.info?.(`Formatting script already exists: ${formatter} (${scriptName})`);
      return { added: false, formatter, scriptName };
    }
    
    if (formatter && !scriptName) {
      // Formatter installed but no script - add a script
      const { scriptName: recommendedName, scriptCommand } = 
        await projectDetector.getRecommendedFormatScript(projectRoot, formatter);
      
      const added = await projectDetector.addNpmScript(projectRoot, recommendedName, scriptCommand);
      
      if (added) {
        logger?.success?.(`Added "${recommendedName}" script to package.json: "${scriptCommand}"`);
        return { added: true, formatter, scriptName: recommendedName };
      } else {
        logger?.error?.(`Failed to add ${formatter} script to package.json`);
        return { added: false, formatter, scriptName: null };
      }
    }
    
    logger?.info?.('No formatter detected in the project. Skipping formatting script setup.');
    return { added: false, formatter: null, scriptName: null };
  } catch (err) {
    logger?.error?.(`Error setting up formatting script: ${err.message}`);
    return { added: false, formatter: null, scriptName: null };
  }
}

export default {
  addTypeCheckHook,
  addLintingHook,
  addFormattingHook,
  addCommitlintHook,
  setupTypeCheckScript,
  setupLintingScript,
  setupFormattingScript
};