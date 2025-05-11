/**
 * Enhanced Git Hooks System
 * 
 * Main entry point for the enhanced Git hooks system in the AI Coding Assistants setup.
 * This module exports all components of the enhanced hooks framework.
 */

// Export hook interfaces and lifecycle
export { 
  HookLifecycle, 
  HookResultStatus, 
  HookInterface, 
  HookUtilityInterface 
} from './hook-interfaces.js';

// Export enhanced base hook
export { default as EnhancedBaseHook } from './enhanced-base-hook.js';

// Export enhanced hook registry
export { default as EnhancedHookRegistry } from './enhanced-hook-registry.js';

// Export middleware components
export { 
  CommonMiddleware,
  ClaudeMiddleware,
  GitMiddleware,
  MiddlewareFactory,
  createMiddlewarePipeline,
  registerCommonMiddleware
} from './hook-middleware.js';

// Export configuration components
export {
  BaseHookSchema,
  HookSchemas,
  validateConfig,
  applyDefaults,
  loadHookConfig,
  saveHookConfig,
  createConfigMiddleware,
  registerConfigMiddleware
} from './hook-config.js';

// Export discovery components
export {
  HookLocationType,
  discoverCoreHooks,
  discoverProjectHooks,
  discoverPluginHooks,
  discoverUserHooks,
  discoverAllHooks,
  loadHookModule,
  loadAllHookModules,
  registerDiscoveredHooks,
  createHookDiscoveryMiddleware,
  registerHookDiscoveryMiddleware
} from './hook-discovery.js';

// Export compatibility components
export {
  createEnhancedWrapper,
  createLegacyWrapper,
  adaptLegacyHookClass,
  isEnhancedCompatible,
  ensureEnhancedCompatible
} from './hook-compatibility.js';

// Export utility functions
export {
  GitUtils,
  FileUtils,
  EnvUtils,
  ResultUtils
} from './hook-utils.js';

// Import existing hooks from original hooks module
import originalHooksModule from './index.js';

/**
 * Get an enhanced hook registry for the specified project root
 * @param {Object} config Configuration object
 * @param {string} config.projectRoot Project root path
 * @param {Object} config.logger Logger instance
 * @param {boolean} config.dryRun Whether to perform a dry run
 * @returns {EnhancedHookRegistry} Enhanced hook registry instance
 */
export function getEnhancedHookRegistry(config) {
  // Import needed modules
  const EnhancedHookRegistry = require('./enhanced-hook-registry.js').default;
  const hookDiscovery = require('./hook-discovery.js');
  
  // Create enhanced registry
  const registry = new EnhancedHookRegistry(config);
  
  // Auto-discover hooks
  hookDiscovery.discoverAllHooks(config.projectRoot, config.logger)
    .then(hookModules => {
      hookDiscovery.registerDiscoveredHooks(registry, hookModules);
    })
    .catch(err => {
      if (config.logger) {
        config.logger.error(`Failed to discover hooks: ${err.message}`);
      }
    });
  
  return registry;
}

/**
 * Initialize enhanced hooks system
 * @param {Object} config Configuration object
 * @param {string} config.projectRoot Project root path
 * @param {Object} config.logger Logger instance
 * @param {boolean} config.dryRun Whether to perform a dry run
 * @returns {Promise<Object>} Enhanced hook registry and utilities
 */
export async function initializeEnhancedHooks(config) {
  const registry = getEnhancedHookRegistry(config);
  
  // Load existing configuration
  await registry.loadConfig();
  
  return {
    registry,
    GitUtils,
    FileUtils,
    EnvUtils,
    ResultUtils,
    HookLifecycle,
    HookResultStatus
  };
}

/**
 * Setup enhanced hooks based on user selection
 * Same interface as the original setupHooks function for compatibility
 */
export async function setupEnhancedHooks(config) {
  const { registry } = await initializeEnhancedHooks(config);
  return registry.setupHooks();
}

/**
 * Remove enhanced hooks
 * Same interface as the original removeHooks function for compatibility
 */
export async function removeEnhancedHooks(config) {
  const { registry } = await initializeEnhancedHooks(config);
  return registry.removeHooks();
}

// Default export with both enhanced and original exports
export default {
  // Enhanced exports
  EnhancedBaseHook,
  EnhancedHookRegistry,
  getEnhancedHookRegistry,
  initializeEnhancedHooks,
  setupEnhancedHooks,
  removeEnhancedHooks,
  
  // Original exports (for backwards compatibility)
  ...originalHooksModule
};