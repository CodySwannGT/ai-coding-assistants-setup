/**
 * Hook Configuration Manager
 * 
 * Provides functions for managing Git hook configurations.
 */

import fs from 'fs-extra';
import path from 'path';
import { getHookRegistry } from './index.js';

/**
 * Get hook configuration for a project
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<Object>} Hook configuration
 */
export async function getHookConfig({ projectRoot, logger }) {
  const configPath = path.join(projectRoot, '.claude', 'hooks.json');
  let config = { hooks: {} };
  
  if (await fs.pathExists(configPath)) {
    try {
      config = await fs.readJson(configPath);
    } catch (err) {
      logger?.error?.(`Failed to read hook configuration: ${err.message}`);
    }
  }
  
  return config;
}

/**
 * Set hook configuration for a project
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {Object} options.config Hook configuration
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<boolean>} Whether the configuration was successfully saved
 */
export async function setHookConfig({ projectRoot, config, logger }) {
  const configDir = path.join(projectRoot, '.claude');
  const configPath = path.join(configDir, 'hooks.json');
  
  try {
    await fs.ensureDir(configDir);
    await fs.writeJson(configPath, config, { spaces: 2 });
    return true;
  } catch (err) {
    logger?.error?.(`Failed to save hook configuration: ${err.message}`);
    return false;
  }
}

/**
 * Update a specific hook's configuration
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {string} options.hookId Hook ID
 * @param {Object} options.hookConfig Hook configuration
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<boolean>} Whether the configuration was successfully updated
 */
export async function updateHookConfig({ projectRoot, hookId, hookConfig, logger }) {
  const config = await getHookConfig({ projectRoot, logger });
  
  if (!config.hooks) {
    config.hooks = {};
  }
  
  config.hooks[hookId] = {
    ...config.hooks[hookId],
    ...hookConfig
  };
  
  return setHookConfig({ projectRoot, config, logger });
}

/**
 * Get a specific hook's configuration
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {string} options.hookId Hook ID
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<Object|null>} Hook configuration or null if not found
 */
export async function getHookConfigById({ projectRoot, hookId, logger }) {
  const config = await getHookConfig({ projectRoot, logger });
  return config.hooks?.[hookId] || null;
}

/**
 * Apply configuration to registered hooks
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<Object>} Hook registry with applied configuration
 */
export async function applyHookConfig({ projectRoot, logger }) {
  const config = await getHookConfig({ projectRoot, logger });
  const registry = getHookRegistry({ projectRoot, logger });
  
  await registry.loadConfig();
  
  return registry;
}

/**
 * Enable a specific hook
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {string} options.hookId Hook ID
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<boolean>} Whether the hook was successfully enabled
 */
export async function enableHook({ projectRoot, hookId, logger }) {
  return updateHookConfig({
    projectRoot,
    hookId,
    hookConfig: { enabled: true },
    logger
  });
}

/**
 * Disable a specific hook
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {string} options.hookId Hook ID
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<boolean>} Whether the hook was successfully disabled
 */
export async function disableHook({ projectRoot, hookId, logger }) {
  return updateHookConfig({
    projectRoot,
    hookId,
    hookConfig: { enabled: false },
    logger
  });
}

/**
 * Set up a configuration template for hooks
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {string} options.template Template name ('minimal', 'standard', 'strict')
 * @param {Object} [options.logger] Logger instance
 * @returns {Promise<boolean>} Whether the template was successfully applied
 */
export async function applyHookTemplate({ projectRoot, template, logger }) {
  let config = await getHookConfig({ projectRoot, logger });
  
  switch (template) {
    case 'minimal':
      // Enable only commit-msg hook with basic validation
      config.hooks = {
        'commit-msg': {
          enabled: true,
          blockingMode: 'warn',
          conventionalCommits: true,
          checkSpelling: false,
          checkGrammar: false,
          preferCli: true
        }
      };
      break;
      
    case 'standard':
      // Enable common hooks with standard configuration
      config.hooks = {
        'prepare-commit-msg': {
          enabled: true,
          mode: 'suggest',
          conventionalCommits: true,
          messageStyle: 'detailed',
          preferCli: true
        },
        'commit-msg': {
          enabled: true,
          blockingMode: 'warn',
          conventionalCommits: true,
          checkSpelling: true,
          checkGrammar: true,
          preferCli: true
        },
        'post-merge': {
          enabled: true,
          summaryFormat: 'detailed',
          includeStats: true,
          includeDependencies: true,
          notifyMethod: 'terminal',
          preferCli: true
        },
        'post-checkout': {
          enabled: true,
          summaryFormat: 'detailed',
          includeStats: true,
          includeDependencies: true,
          notifyMethod: 'terminal',
          skipInitialCheckout: true,
          preferCli: true
        }
      };
      break;
      
    case 'strict':
      // Enable all hooks with strict configuration
      config.hooks = {
        'prepare-commit-msg': {
          enabled: true,
          mode: 'suggest',
          conventionalCommits: true,
          includeScope: true,
          includeBreaking: true,
          messageStyle: 'detailed',
          preferCli: true
        },
        'commit-msg': {
          enabled: true,
          blockingMode: 'block',
          conventionalCommits: true,
          checkSpelling: true,
          checkGrammar: true,
          suggestImprovements: true,
          preferCli: true
        },
        'pre-push': {
          enabled: true,
          blockingMode: 'block',
          auditTypes: ['security', 'credentials', 'sensitive-data', 'dependencies'],
          excludePatterns: ['node_modules/**', 'dist/**', 'build/**', '**/*.lock'],
          preferCli: true
        },
        'post-merge': {
          enabled: true,
          summaryFormat: 'detailed',
          includeStats: true,
          includeDependencies: true,
          includeBreakingChanges: true,
          notifyMethod: 'terminal',
          preferCli: true
        },
        'post-checkout': {
          enabled: true,
          summaryFormat: 'detailed',
          includeStats: true,
          includeDependencies: true,
          includeBreakingChanges: true,
          notifyMethod: 'terminal',
          skipInitialCheckout: true,
          preferCli: true
        },
        'post-rewrite': {
          enabled: true,
          summaryFormat: 'detailed',
          includeStats: true,
          includeDependencies: true,
          includeBreakingChanges: true,
          notifyMethod: 'terminal',
          preferCli: true
        },
        'pre-rebase': {
          enabled: true,
          blockingMode: 'warn',
          checkConflicts: true,
          checkDependencies: true,
          blockOnSeverity: 'high',
          preferCli: true
        },
        'branch-strategy': {
          enabled: true,
          strategyType: 'gitflow',
          blockingMode: 'warn',
          validateWithClaude: true,
          preferCli: true
        }
      };
      break;
      
    default:
      logger?.warn?.(`Unknown template: ${template}`);
      return false;
  }
  
  return setHookConfig({ projectRoot, config, logger });
}

export default {
  getHookConfig,
  setHookConfig,
  updateHookConfig,
  getHookConfigById,
  applyHookConfig,
  enableHook,
  disableHook,
  applyHookTemplate
};