/**
 * Hook Configuration System
 * 
 * Provides standardized configuration management and validation for git hooks.
 * Supports schema-based validation, serialization, merging, and dynamic loading.
 */

import fs from 'fs-extra';
import path from 'path';
import { HookLifecycle } from './hook-interfaces.js';

/**
 * Base schema for all hook configurations
 */
export const BaseHookSchema = {
  properties: {
    enabled: { 
      type: 'boolean',
      description: 'Whether the hook is enabled'
    },
    strictness: { 
      type: 'string', 
      enum: ['low', 'medium', 'high'],
      description: 'Level of strictness for hook validation'
    },
    blockingMode: { 
      type: 'string', 
      enum: ['block', 'warn', 'none'],
      description: 'How to respond to issues detected by the hook'
    },
    preferCli: { 
      type: 'boolean',
      description: 'Whether to prefer Claude CLI over API when available'
    }
  },
  required: ['enabled'],
  defaults: {
    enabled: false,
    strictness: 'medium',
    blockingMode: 'warn',
    preferCli: true
  }
};

/**
 * Schema for prepare-commit-msg hook
 */
export const PrepareCommitMsgSchema = {
  properties: {
    ...BaseHookSchema.properties,
    mode: { 
      type: 'string', 
      enum: ['suggest', 'insert'],
      description: 'Whether to suggest or automatically insert commit messages'
    },
    conventionalCommits: { 
      type: 'boolean',
      description: 'Whether to use conventional commits format'
    },
    includeScope: { 
      type: 'boolean',
      description: 'Whether to include scope in conventional commits'
    },
    includeBreaking: { 
      type: 'boolean',
      description: 'Whether to check for breaking changes'
    },
    messageStyle: { 
      type: 'string', 
      enum: ['concise', 'detailed'],
      description: 'Style of commit messages to generate'
    }
  },
  required: [...BaseHookSchema.required, 'mode'],
  defaults: {
    ...BaseHookSchema.defaults,
    mode: 'suggest',
    conventionalCommits: true,
    includeScope: true,
    includeBreaking: true,
    messageStyle: 'detailed'
  }
};

/**
 * Schema for commit-msg hook
 */
export const CommitMsgSchema = {
  properties: {
    ...BaseHookSchema.properties,
    conventionalCommits: { 
      type: 'boolean',
      description: 'Whether to enforce conventional commits format'
    },
    checkSpelling: { 
      type: 'boolean',
      description: 'Whether to check for spelling errors'
    },
    checkGrammar: { 
      type: 'boolean',
      description: 'Whether to check for grammar errors'
    },
    maxLength: { 
      type: 'object',
      properties: {
        subject: { type: 'number' },
        body: { type: 'number' }
      },
      description: 'Maximum length for subject/body'
    },
    suggestImprovements: { 
      type: 'boolean',
      description: 'Whether to suggest improvements'
    }
  },
  required: [...BaseHookSchema.required],
  defaults: {
    ...BaseHookSchema.defaults,
    conventionalCommits: true,
    checkSpelling: true,
    checkGrammar: true,
    maxLength: { subject: 72, body: 100 },
    suggestImprovements: true
  }
};

/**
 * Schema for pre-push hook
 */
export const PrePushSchema = {
  properties: {
    ...BaseHookSchema.properties,
    auditTypes: { 
      type: 'array',
      items: { 
        type: 'string', 
        enum: ['security', 'credentials', 'sensitive-data', 'dependencies'] 
      },
      description: 'Types of audits to perform'
    },
    excludePatterns: { 
      type: 'array',
      items: { type: 'string' },
      description: 'File patterns to exclude from audits'
    },
    maxCommits: { 
      type: 'number',
      description: 'Maximum number of commits to audit'
    },
    maxDiffSize: { 
      type: 'number',
      description: 'Maximum diff size to analyze'
    },
    blockOnSeverity: { 
      type: 'string', 
      enum: ['critical', 'high', 'medium', 'low', 'none'],
      description: 'Minimum severity to block push'
    }
  },
  required: [...BaseHookSchema.required],
  defaults: {
    ...BaseHookSchema.defaults,
    auditTypes: ['security', 'credentials', 'sensitive-data', 'dependencies'],
    excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.lock'],
    maxCommits: 10,
    maxDiffSize: 100000,
    blockOnSeverity: 'high'
  }
};

/**
 * Schema for post hooks (post-merge, post-checkout, post-rewrite)
 */
export const PostHookSchema = {
  properties: {
    ...BaseHookSchema.properties,
    summaryFormat: { 
      type: 'string', 
      enum: ['concise', 'detailed'],
      description: 'How detailed summaries should be'
    },
    includeStats: { 
      type: 'boolean',
      description: 'Whether to include statistics in summaries'
    },
    includeDependencies: { 
      type: 'boolean',
      description: 'Whether to highlight dependency changes in summaries'
    },
    includeBreakingChanges: { 
      type: 'boolean',
      description: 'Whether to highlight potential breaking changes in summaries'
    },
    notifyMethod: { 
      type: 'string', 
      enum: ['terminal', 'file', 'notification'],
      description: 'How to deliver summaries'
    },
    outputFile: { 
      type: 'string',
      description: 'File to write summaries to if notifyMethod is file'
    },
    maxDiffSize: { 
      type: 'number',
      description: 'Maximum diff size to analyze'
    }
  },
  required: [...BaseHookSchema.required],
  defaults: {
    ...BaseHookSchema.defaults,
    summaryFormat: 'detailed',
    includeStats: true,
    includeDependencies: true,
    includeBreakingChanges: true,
    notifyMethod: 'terminal',
    maxDiffSize: 100000
  }
};

/**
 * Schema for pre-rebase hook
 */
export const PreRebaseSchema = {
  properties: {
    ...BaseHookSchema.properties,
    checkConflicts: { 
      type: 'boolean',
      description: 'Whether to check for potential merge conflicts'
    },
    checkTestImpact: { 
      type: 'boolean',
      description: 'Whether to check for impact on tests'
    },
    checkDependencies: { 
      type: 'boolean',
      description: 'Whether to check for dependency changes'
    },
    blockOnSeverity: { 
      type: 'string', 
      enum: ['critical', 'high', 'medium', 'low', 'none'],
      description: 'Minimum severity to block rebase'
    },
    maxDiffSize: { 
      type: 'number',
      description: 'Maximum diff size to analyze'
    }
  },
  required: [...BaseHookSchema.required],
  defaults: {
    ...BaseHookSchema.defaults,
    checkConflicts: true,
    checkTestImpact: false,
    checkDependencies: true,
    blockOnSeverity: 'high',
    maxDiffSize: 100000
  }
};

/**
 * Schema for branch-strategy hook
 */
export const BranchStrategySchema = {
  properties: {
    ...BaseHookSchema.properties,
    strategyType: { 
      type: 'string', 
      enum: ['gitflow', 'trunk', 'github-flow', 'custom'],
      description: 'Type of branching strategy to enforce'
    },
    branchPrefixes: { 
      type: 'object',
      properties: {
        feature: { type: 'string' },
        bugfix: { type: 'string' },
        hotfix: { type: 'string' },
        release: { type: 'string' },
        support: { type: 'string' }
      },
      description: 'Prefixes for different types of branches'
    },
    mainBranches: { 
      type: 'array',
      items: { type: 'string' },
      description: 'List of main branches'
    },
    protectedBranches: { 
      type: 'array',
      items: { type: 'string' },
      description: 'List of protected branches'
    },
    releasePattern: { 
      type: 'string',
      description: 'Regex pattern for release branches'
    },
    validateWithClaude: { 
      type: 'boolean',
      description: 'Whether to use Claude to validate branch purposes'
    },
    jiraIntegration: { 
      type: 'boolean',
      description: 'Whether to enforce JIRA ticket IDs in branch names'
    },
    jiraPattern: { 
      type: 'string',
      description: 'Regex pattern for JIRA ticket IDs'
    }
  },
  required: [...BaseHookSchema.required, 'strategyType'],
  defaults: {
    ...BaseHookSchema.defaults,
    strategyType: 'gitflow',
    branchPrefixes: {
      feature: 'feature/',
      bugfix: 'bugfix/',
      hotfix: 'hotfix/',
      release: 'release/',
      support: 'support/'
    },
    mainBranches: ['main', 'master', 'dev', 'staging'],
    protectedBranches: ['main', 'master', 'staging', 'dev', 'release/*'],
    releasePattern: '^release\\/v?(\\d+\\.\\d+\\.\\d+)$',
    validateWithClaude: true,
    jiraIntegration: false,
    jiraPattern: '[A-Z]+-\\d+'
  }
};

/**
 * Schema for test-first-development hook has been removed
 */

/**
 * Schema for diff-explain feature
 */
export const DiffExplainSchema = {
  properties: {
    ...BaseHookSchema.properties,
    verbosity: { 
      type: 'string', 
      enum: ['detailed', 'brief'],
      description: 'How detailed explanations should be'
    },
    focusAreas: { 
      type: 'array',
      items: { 
        type: 'string', 
        enum: ['functionality', 'security', 'performance', 'readability'] 
      },
      description: 'Areas to focus on in explanations'
    },
    outputFormat: { 
      type: 'string', 
      enum: ['inline', 'summary-only', 'side-by-side'],
      description: 'How to display explanations'
    },
    maxTokens: { 
      type: 'number',
      description: 'Maximum tokens for Claude response'
    },
    maxDiffSize: { 
      type: 'number',
      description: 'Maximum diff size to analyze'
    },
    highlightIssues: { 
      type: 'boolean',
      description: 'Whether to highlight potential issues in explanations'
    },
    includeSuggestions: { 
      type: 'boolean',
      description: 'Whether to include suggestions for improvements'
    },
    includeSummary: { 
      type: 'boolean',
      description: 'Whether to include summary of overall changes'
    }
  },
  required: [...BaseHookSchema.required],
  defaults: {
    ...BaseHookSchema.defaults,
    verbosity: 'detailed',
    focusAreas: ['functionality', 'security', 'performance', 'readability'],
    outputFormat: 'inline',
    maxTokens: 4000,
    maxDiffSize: 100000,
    highlightIssues: true,
    includeSuggestions: true,
    includeSummary: true
  }
};

/**
 * Map of hook names to schemas
 */
export const HookSchemas = {
  'pre-commit': BaseHookSchema,
  'prepare-commit-msg': PrepareCommitMsgSchema,
  'commit-msg': CommitMsgSchema,
  'pre-push': PrePushSchema,
  'post-merge': PostHookSchema,
  // The following hooks have been removed:
  // 'post-checkout': PostHookSchema,
  // 'post-rewrite': PostHookSchema,
  'pre-rebase': PreRebaseSchema,
  'branch-strategy': BranchStrategySchema,
  // 'test-first-development': TestFirstDevelopmentSchema,
  'diff-explain': DiffExplainSchema
};

/**
 * Validate a configuration against a schema
 * @param {Object} config Configuration to validate
 * @param {Object} schema Schema to validate against
 * @returns {Object} Validation result with isValid and errors properties
 */
export function validateConfig(config, schema) {
  const result = {
    isValid: true,
    errors: []
  };
  
  // Check required properties
  for (const required of schema.required) {
    if (config[required] === undefined) {
      result.isValid = false;
      result.errors.push(`Missing required property: ${required}`);
    }
  }
  
  // Check property types and enums
  for (const [key, value] of Object.entries(config)) {
    const propSchema = schema.properties[key];
    if (!propSchema) {
      result.errors.push(`Unknown property: ${key}`);
      continue;
    }
    
    // Check type
    if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
      result.isValid = false;
      result.errors.push(`Property ${key} should be a boolean`);
    }
    
    if (propSchema.type === 'string' && typeof value !== 'string') {
      result.isValid = false;
      result.errors.push(`Property ${key} should be a string`);
    }
    
    if (propSchema.type === 'number' && typeof value !== 'number') {
      result.isValid = false;
      result.errors.push(`Property ${key} should be a number`);
    }
    
    if (propSchema.type === 'array' && !Array.isArray(value)) {
      result.isValid = false;
      result.errors.push(`Property ${key} should be an array`);
    }
    
    if (propSchema.type === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
      result.isValid = false;
      result.errors.push(`Property ${key} should be an object`);
    }
    
    // Check enum
    if (propSchema.enum && !propSchema.enum.includes(value)) {
      result.isValid = false;
      result.errors.push(`Property ${key} should be one of: ${propSchema.enum.join(', ')}`);
    }
    
    // Check array items
    if (propSchema.type === 'array' && propSchema.items && Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        
        // Check item type
        if (propSchema.items.type === 'string' && typeof item !== 'string') {
          result.isValid = false;
          result.errors.push(`Array item ${key}[${i}] should be a string`);
        }
        
        if (propSchema.items.type === 'number' && typeof item !== 'number') {
          result.isValid = false;
          result.errors.push(`Array item ${key}[${i}] should be a number`);
        }
        
        if (propSchema.items.type === 'boolean' && typeof item !== 'boolean') {
          result.isValid = false;
          result.errors.push(`Array item ${key}[${i}] should be a boolean`);
        }
        
        // Check item enum
        if (propSchema.items.enum && !propSchema.items.enum.includes(item)) {
          result.isValid = false;
          result.errors.push(`Array item ${key}[${i}] should be one of: ${propSchema.items.enum.join(', ')}`);
        }
      }
    }
    
    // Check object properties
    if (propSchema.type === 'object' && propSchema.properties && typeof value === 'object' && value !== null) {
      const objectResult = validateConfig(value, { properties: propSchema.properties, required: [] });
      if (!objectResult.isValid) {
        result.isValid = false;
        result.errors.push(...objectResult.errors.map(error => `In property ${key}: ${error}`));
      }
    }
  }
  
  return result;
}

/**
 * Apply default values from a schema to a configuration
 * @param {Object} config Configuration to apply defaults to
 * @param {Object} schema Schema with defaults
 * @returns {Object} Configuration with defaults applied
 */
export function applyDefaults(config, schema) {
  const result = { ...config };
  
  // Apply top-level defaults
  for (const [key, value] of Object.entries(schema.defaults || {})) {
    if (result[key] === undefined) {
      result[key] = value;
    }
  }
  
  // Apply nested defaults
  for (const [key, propSchema] of Object.entries(schema.properties || {})) {
    if (propSchema.type === 'object' && propSchema.properties && typeof result[key] === 'object' && result[key] !== null) {
      result[key] = applyDefaults(result[key], { properties: propSchema.properties, defaults: {} });
    }
  }
  
  return result;
}

/**
 * Load hook configuration from file
 * @param {string} projectRoot Project root directory
 * @param {string} hookName Git hook name
 * @returns {Promise<Object>} Hook configuration
 */
export async function loadHookConfig(projectRoot, hookName) {
  try {
    const configDir = path.join(projectRoot, '.claude');
    const configFile = path.join(configDir, 'hooks.json');
    
    if (await fs.pathExists(configFile)) {
      const config = await fs.readJson(configFile);
      
      if (config.hooks && config.hooks[hookName]) {
        const hookConfig = config.hooks[hookName];
        const schema = HookSchemas[hookName] || BaseHookSchema;
        
        return applyDefaults(hookConfig, schema);
      }
    }
    
    // Return default configuration
    const schema = HookSchemas[hookName] || BaseHookSchema;
    return { ...schema.defaults };
  } catch (err) {
    console.error(`Failed to load hook configuration: ${err.message}`);
    
    // Return default configuration
    const schema = HookSchemas[hookName] || BaseHookSchema;
    return { ...schema.defaults };
  }
}

/**
 * Save hook configuration to file
 * @param {string} projectRoot Project root directory
 * @param {string} hookName Git hook name
 * @param {Object} hookConfig Hook configuration
 * @returns {Promise<boolean>} Whether the configuration was saved successfully
 */
export async function saveHookConfig(projectRoot, hookName, hookConfig) {
  try {
    const configDir = path.join(projectRoot, '.claude');
    const configFile = path.join(configDir, 'hooks.json');
    
    // Create config directory if it doesn't exist
    await fs.ensureDir(configDir);
    
    // Load existing configuration or create a new one
    let config = { hooks: {} };
    if (await fs.pathExists(configFile)) {
      config = await fs.readJson(configFile);
      if (!config.hooks) {
        config.hooks = {};
      }
    }
    
    // Update hook configuration
    config.hooks[hookName] = hookConfig;
    
    // Write configuration to file
    await fs.writeJson(configFile, config, { spaces: 2 });
    
    return true;
  } catch (err) {
    console.error(`Failed to save hook configuration: ${err.message}`);
    return false;
  }
}

/**
 * Create hook configuration middleware
 * @param {string} hookName Git hook name
 * @returns {Function} Middleware function
 */
export function createConfigMiddleware(hookName) {
  return async (context, next) => {
    const { hook } = context;
    
    // Load hook configuration
    const config = await loadHookConfig(hook.projectRoot, hookName);
    
    // Apply configuration to hook
    for (const [key, value] of Object.entries(config)) {
      if (key in hook) {
        hook[key] = value;
      }
    }
    
    await next();
  };
}

/**
 * Register configuration middleware for a hook
 * @param {Object} hook Hook instance
 */
export function registerConfigMiddleware(hook) {
  hook.use(HookLifecycle.BEFORE_EXECUTION, createConfigMiddleware(hook.gitHookName));
}

export default {
  BaseHookSchema,
  HookSchemas,
  validateConfig,
  applyDefaults,
  loadHookConfig,
  saveHookConfig,
  createConfigMiddleware,
  registerConfigMiddleware
};