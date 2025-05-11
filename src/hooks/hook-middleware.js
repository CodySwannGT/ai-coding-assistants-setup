/**
 * Hook Middleware System
 * 
 * Defines and implements a middleware pattern for Git hooks.
 * Middleware can be registered for specific lifecycle phases of hook execution,
 * allowing for modular, extensible hook behavior.
 */

import { HookLifecycle, HookResultStatus } from './hook-interfaces.js';

/**
 * Common middleware for all hooks
 */
export const CommonMiddleware = {
  /**
   * Log execution start
   * @param {Object} context Execution context
   * @param {Function} next Next middleware function
   */
  logExecution: async (context, next) => {
    const { logger, gitHookName } = context;
    if (logger) {
      logger.info(`Executing ${gitHookName} hook...`);
    }
    await next();
  },

  /**
   * Log execution time
   * @param {Object} context Execution context
   * @param {Function} next Next middleware function
   */
  logExecutionTime: async (context, next) => {
    const { logger, gitHookName } = context;
    const startTime = Date.now();
    
    await next();
    
    const executionTime = Date.now() - startTime;
    if (logger) {
      logger.debug(`${gitHookName} hook execution time: ${executionTime}ms`);
    }
  },

  /**
   * Catch and handle errors
   * @param {Object} context Execution context
   * @param {Function} next Next middleware function
   */
  errorHandler: async (context, next) => {
    const { logger, gitHookName } = context;
    
    try {
      await next();
    } catch (error) {
      if (logger) {
        logger.error(`Error in ${gitHookName} hook: ${error.message}`);
      }
      
      context.error = error;
      context.result = {
        status: HookResultStatus.FAILURE,
        message: `Error in ${gitHookName} hook: ${error.message}`,
        shouldBlock: false,
        issues: []
      };
    }
  }
};

/**
 * Middleware for Claude API interactions
 */
export const ClaudeMiddleware = {
  /**
   * Ensure Claude API key is available
   * @param {Object} context Execution context
   * @param {Function} next Next middleware function
   */
  ensureClaudeApiKey: async (context, next) => {
    const { hook } = context;
    
    if (!hook.claudeApiKey) {
      // Try to load API key from environment
      const env = hook.loadEnv();
      hook.setClaudeApiKey(env.ANTHROPIC_API_KEY || '');
    }
    
    await next();
  },

  /**
   * Cache Claude API responses
   * @param {Object} context Execution context
   * @param {Function} next Next middleware function
   */
  cacheResponses: async (context, next) => {
    // Store original callClaudeApi function
    const originalCallClaudeApi = context.hook.callClaudeApi;
    
    // Override with caching version
    context.hook.callClaudeApi = async (options) => {
      // Add caching to all Claude API calls
      return originalCallClaudeApi.call(context.hook, { 
        ...options, 
        cacheResponse: true 
      });
    };
    
    await next();
    
    // Restore original function
    context.hook.callClaudeApi = originalCallClaudeApi;
  }
};

/**
 * Middleware for Git operations
 */
export const GitMiddleware = {
  /**
   * Add repository information to context
   * @param {Object} context Execution context
   * @param {Function} next Next middleware function
   */
  addRepositoryInfo: async (context, next) => {
    const { hook } = context;
    
    // Add repository information to context
    context.repository = {
      branch: await hook.getCurrentBranch(),
      recentCommits: await hook.getRecentCommits(5)
    };
    
    // If this is a commit-related hook, add staged files
    if (['pre-commit', 'prepare-commit-msg', 'commit-msg'].includes(context.gitHookName)) {
      context.repository.stagedFiles = await hook.getStagedFiles();
      context.repository.stagedDiff = await hook.getStagedDiff();
    }
    
    await next();
  }
};

/**
 * Middleware Factory
 * 
 * Creates middleware functions for specific hooks or tasks
 */
export const MiddlewareFactory = {
  /**
   * Create middleware for blocking hooks based on issues
   * @param {string} blockingMode How to respond to issues ('block', 'warn', 'none')
   * @param {string} blockOnSeverity Severity level to block on ('critical', 'high', 'medium', 'low')
   * @returns {Function} Middleware function
   */
  createBlockingMiddleware: (blockingMode, blockOnSeverity) => {
    return async (context, next) => {
      await next();
      
      // Only process if we have a result with issues
      if (!context.result || !context.result.issues || !context.result.issues.length) {
        return;
      }
      
      // Skip if not in blocking mode
      if (blockingMode !== 'block') {
        return;
      }
      
      const severityLevels = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1,
        'none': 0
      };
      
      const thresholdLevel = severityLevels[blockOnSeverity] || 0;
      
      // Check if any issues meet the blocking threshold
      const shouldBlock = context.result.issues.some(issue => {
        const issueSeverityLevel = severityLevels[issue.severity] || 0;
        return issueSeverityLevel >= thresholdLevel;
      });
      
      // Update result to indicate blocking
      if (shouldBlock) {
        context.result.shouldBlock = true;
        context.result.status = HookResultStatus.ERROR;
      }
    };
  },

  /**
   * Create middleware for loading custom templates
   * @param {string} templatePath Path to template files
   * @returns {Function} Middleware function
   */
  createTemplateLoaderMiddleware: (templatePath) => {
    return async (context, next) => {
      const { hook } = context;
      
      // Load custom templates if available
      try {
        const fs = await import('fs-extra');
        const path = await import('path');
        
        const customTemplatePath = path.resolve(templatePath, `${context.gitHookName}.json`);
        
        if (await fs.pathExists(customTemplatePath)) {
          const templates = await fs.readJson(customTemplatePath);
          hook.promptTemplates = { ...hook.promptTemplates, ...templates };
        }
      } catch (error) {
        if (context.logger) {
          context.logger.debug(`Failed to load custom templates: ${error.message}`);
        }
      }
      
      await next();
    };
  }
};

/**
 * Creates a middleware pipeline for executing hooks
 * @param {Array<Function>} middleware Array of middleware functions
 * @returns {Function} Middleware pipeline function
 */
export function createMiddlewarePipeline(middleware) {
  return async (context) => {
    // Create a function that recursively calls the next middleware
    const runner = async (index) => {
      // If we've run all middleware, return
      if (index >= middleware.length) {
        return;
      }
      
      // Get the current middleware
      const current = middleware[index];
      
      // Create the next function that calls the next middleware
      const next = async () => {
        await runner(index + 1);
      };
      
      // Execute the current middleware
      await current(context, next);
    };
    
    // Start executing the middleware pipeline
    await runner(0);
    
    return context;
  };
}

/**
 * Register common middleware for a hook
 * @param {Object} hook Hook instance
 */
export function registerCommonMiddleware(hook) {
  // Register middleware for all lifecycle phases
  hook.use(HookLifecycle.BEFORE_EXECUTION, CommonMiddleware.logExecution);
  hook.use(HookLifecycle.BEFORE_EXECUTION, CommonMiddleware.logExecutionTime);
  hook.use(HookLifecycle.BEFORE_EXECUTION, CommonMiddleware.errorHandler);
  hook.use(HookLifecycle.EXECUTION, GitMiddleware.addRepositoryInfo);
  
  // Register Claude middleware if needed
  if (hook.gitHookName !== 'pre-push' && hook.gitHookName !== 'post-rewrite') {
    hook.use(HookLifecycle.BEFORE_EXECUTION, ClaudeMiddleware.ensureClaudeApiKey);
    hook.use(HookLifecycle.EXECUTION, ClaudeMiddleware.cacheResponses);
  }
  
  // Register blocking middleware if appropriate
  if (['pre-commit', 'pre-push', 'pre-rebase'].includes(hook.gitHookName)) {
    hook.use(
      HookLifecycle.AFTER_EXECUTION, 
      MiddlewareFactory.createBlockingMiddleware(hook.blockingMode, hook.blockOnSeverity)
    );
  }
  
  // Register template loading middleware
  hook.use(
    HookLifecycle.BEFORE_EXECUTION,
    MiddlewareFactory.createTemplateLoaderMiddleware(
      `${hook.projectRoot}/.claude/templates`
    )
  );
}

export default {
  CommonMiddleware,
  ClaudeMiddleware,
  GitMiddleware,
  MiddlewareFactory,
  createMiddlewarePipeline,
  registerCommonMiddleware
};