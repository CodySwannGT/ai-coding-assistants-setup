/**
 * Enhanced Git Hooks Framework
 * 
 * This file serves as the main entry point for the enhanced Git hooks framework.
 * It exports all components needed to create, configure, and use enhanced Git hooks.
 */

// Core interfaces and types
import { HookLifecycle, HookResultStatus, HookInterface, HookUtilityInterface } from './hook-interfaces.js';

// Enhanced base hook implementation
import EnhancedBaseHook from './enhanced-base-hook.js';

// Hook implementations
import EnhancedPrepareCommitMsgHook from './enhanced-prepare-commit-msg-hook.js';
import EnhancedCommitMsgHook from './enhanced-commit-msg-hook.js';

// Backward compatibility layer
import { adaptLegacyHook, wrapEnhancedHook } from './hook-compatibility.js';

// Configuration system
import { 
  validateHookConfig, 
  applyDefaultConfig,
  loadHookConfig, 
  saveHookConfig,
  getHookConfigSchema
} from './hook-config.js';

// Registry and discovery
import EnhancedHookRegistry from './enhanced-hook-registry.js';
import { 
  discoverHooks, 
  loadHookModule, 
  registerBuiltinHooks 
} from './hook-discovery.js';

// Middleware system
import { 
  createMiddleware, 
  composeMiddleware, 
  loggerMiddleware, 
  errorHandlerMiddleware, 
  configMiddleware,
  gitInfoMiddleware,
  claudeMiddleware
} from './hook-middleware.js';

// Utilities
import {
  createHookResult,
  isValidHookName,
  formatGitDiff,
  executeGitCommand,
  loadPromptTemplates,
  formatPrompt
} from './hook-utils.js';

/**
 * Create a new enhanced hook registry
 * @param {Object} options Options for creating the registry
 * @param {string} options.projectRoot Project root directory
 * @param {Object} options.logger Logger instance
 * @param {boolean} options.loadBuiltins Whether to load builtin hooks
 * @returns {EnhancedHookRegistry} The hook registry
 */
function createRegistry(options = {}) {
  const registry = new EnhancedHookRegistry({
    projectRoot: options.projectRoot,
    logger: options.logger
  });
  
  if (options.loadBuiltins !== false) {
    registerBuiltinHooks(registry);
  }
  
  return registry;
}

/**
 * Register built-in hooks with the registry
 * @param {EnhancedHookRegistry} registry The hook registry
 */
function registerBuiltins(registry) {
  // Register the built-in hooks
  registry.register('prepare-commit-msg', EnhancedPrepareCommitMsgHook);
  registry.register('commit-msg', EnhancedCommitMsgHook);
  // Additional hooks will be registered here as they are implemented
}

// Create and export middleware factories for common use cases
const middleware = {
  logger: loggerMiddleware,
  error: errorHandlerMiddleware,
  config: configMiddleware,
  git: gitInfoMiddleware,
  claude: claudeMiddleware,
  
  // Factory function to create custom middleware
  create: createMiddleware,
  
  // Utility to compose multiple middleware functions
  compose: composeMiddleware
};

// Export utility functions
const utils = {
  createHookResult,
  isValidHookName,
  formatGitDiff,
  executeGitCommand,
  loadPromptTemplates,
  formatPrompt,
  
  // Configuration utilities
  validateHookConfig,
  applyDefaultConfig,
  loadHookConfig,
  saveHookConfig,
  getHookConfigSchema,
  
  // Discovery utilities
  discoverHooks,
  loadHookModule
};

// Export backward compatibility utilities
const compatibility = {
  adaptLegacyHook,
  wrapEnhancedHook
};

// Export main components
export {
  // Core interfaces and types
  HookLifecycle,
  HookResultStatus,
  HookInterface,
  HookUtilityInterface,
  
  // Base implementation
  EnhancedBaseHook,
  
  // Hook implementations
  EnhancedPrepareCommitMsgHook,
  EnhancedCommitMsgHook,
  
  // Registry and factory
  EnhancedHookRegistry,
  createRegistry,
  registerBuiltins,
  
  // Middleware
  middleware,
  
  // Utilities
  utils,
  
  // Backward compatibility
  compatibility
};

// Default export for convenient importing
export default {
  HookLifecycle,
  HookResultStatus,
  EnhancedBaseHook,
  EnhancedHookRegistry,
  createRegistry,
  middleware,
  utils,
  compatibility,
  hooks: {
    EnhancedPrepareCommitMsgHook,
    EnhancedCommitMsgHook
  }
};