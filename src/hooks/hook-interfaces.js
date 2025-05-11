/**
 * Git Hook Interfaces
 * 
 * This file defines formal interfaces for Git hooks in the AI Coding Assistants setup.
 * These interfaces establish a consistent contract that all hook implementations must follow.
 */

/**
 * Hook Lifecycle Phases
 * 
 * Defines the standard lifecycle phases for Git hooks
 */
export const HookLifecycle = {
  // Before the hook's main logic is executed
  BEFORE_EXECUTION: 'before_execution',
  
  // During the hook's main execution phase
  EXECUTION: 'execution',
  
  // After the hook's main logic has been executed
  AFTER_EXECUTION: 'after_execution',
  
  // If an error occurs during any phase
  ERROR: 'error',
  
  // After the hook has been set up
  AFTER_SETUP: 'after_setup',
  
  // Before the hook is removed
  BEFORE_REMOVE: 'before_remove'
};

/**
 * Hook Result Status Codes
 * 
 * Standard result status codes that hooks should return
 */
export const HookResultStatus = {
  // The hook completed successfully with no issues
  SUCCESS: 'success',
  
  // The hook completed with warnings, but the Git operation can proceed
  WARNING: 'warning',
  
  // The hook completed but found issues that should block the Git operation
  ERROR: 'error',
  
  // The hook execution was skipped
  SKIPPED: 'skipped',
  
  // The hook encountered an unexpected error
  FAILURE: 'failure'
};

/**
 * Hook Execution Context
 * 
 * A standard context object passed to hooks during execution
 * @typedef {Object} HookExecutionContext
 * @property {string} gitHookName The Git hook name (e.g., 'pre-commit')
 * @property {Array<string>} args Command-line arguments passed to the hook
 * @property {string} projectRoot The root directory of the Git repository
 * @property {Object} environment Environment variables and other contextual information
 * @property {Object} logger Logger instance
 * @property {Function} next Function to call the next middleware in the pipeline
 */

/**
 * Hook Result
 * 
 * A standard result object that hooks should return
 * @typedef {Object} HookResult
 * @property {string} status Result status code (from HookResultStatus)
 * @property {string} message Human-readable result message
 * @property {Object} data Additional data produced by the hook
 * @property {boolean} shouldBlock Whether this result should block the Git operation
 * @property {Array<Object>} issues Any issues found by the hook
 */

/**
 * Hook Configuration Schema
 * 
 * A standard schema for hook configuration
 * @typedef {Object} HookConfigSchema
 * @property {Object} properties Schema properties as JSON Schema
 * @property {Array<string>} required Required properties
 * @property {Object} defaults Default values for properties
 */

/**
 * Hook Interface
 * 
 * Defines the standard methods that all hooks must implement.
 * This is an abstract interface - actual implementations will be classes.
 */
export const HookInterface = {
  /**
   * Initialize the hook with the provided configuration
   * @param {Object} config Hook configuration
   */
  initialize(config) {},
  
  /**
   * Execute the hook with the provided context
   * @param {HookExecutionContext} context The hook execution context
   * @returns {Promise<HookResult>} The hook execution result
   */
  async execute(context) {},
  
  /**
   * Generate the hook script content
   * @returns {string} Hook script content
   */
  generateScript() {},
  
  /**
   * Set up the hook in the Git hooks directory
   * @returns {Promise<boolean>} Whether setup was successful
   */
  async setup() {},
  
  /**
   * Remove the hook from the Git hooks directory
   * @returns {Promise<boolean>} Whether removal was successful
   */
  async remove() {},
  
  /**
   * Check if the hook is enabled
   * @returns {boolean} Whether the hook is enabled
   */
  isEnabled() {},
  
  /**
   * Get the hook's configuration schema
   * @returns {HookConfigSchema} The hook's configuration schema
   */
  getConfigSchema() {},
  
  /**
   * Validate the hook's configuration against its schema
   * @param {Object} config Configuration to validate
   * @returns {boolean} Whether the configuration is valid
   */
  validateConfig(config) {},
  
  /**
   * Register a middleware function for a specific lifecycle phase
   * @param {string} phase Lifecycle phase (from HookLifecycle)
   * @param {Function} middleware Middleware function
   */
  use(phase, middleware) {},
  
  /**
   * Handle events from other hooks
   * @param {string} eventName Name of the event
   * @param {Function} handler Event handler function
   */
  on(eventName, handler) {},
  
  /**
   * Emit an event to other hooks
   * @param {string} eventName Name of the event
   * @param {Object} data Event data
   */
  emit(eventName, data) {}
};

/**
 * Hook Middleware Function
 * 
 * @typedef {Function} HookMiddleware
 * @param {HookExecutionContext} context The hook execution context
 * @param {Function} next Function to call the next middleware
 * @returns {Promise<void>}
 */

/**
 * Hook Utility Interface
 * 
 * Utility methods that should be available to all hooks
 */
export const HookUtilityInterface = {
  /**
   * Get the current Git branch
   * @returns {Promise<string>} Current branch name
   */
  async getCurrentBranch() {},
  
  /**
   * Get staged files
   * @returns {Promise<Array<string>>} Array of staged files
   */
  async getStagedFiles() {},
  
  /**
   * Get the diff between two refs
   * @param {string} from From ref
   * @param {string} to To ref
   * @returns {Promise<string>} Git diff output
   */
  async getDiff(from, to) {},
  
  /**
   * Get recent commits
   * @param {number} limit Number of commits to retrieve
   * @returns {Promise<Array<Object>>} Array of commits
   */
  async getRecentCommits(limit) {},
  
  /**
   * Call Claude API with the given prompt
   * @param {Object} options API call options
   * @returns {Promise<Object>} Claude API response
   */
  async callClaude(options) {},
  
  /**
   * Load configuration from file
   * @param {string} path Path to configuration file
   * @returns {Promise<Object>} Configuration object
   */
  async loadConfig(path) {},
  
  /**
   * Save configuration to file
   * @param {string} path Path to configuration file
   * @param {Object} config Configuration object
   * @returns {Promise<boolean>} Whether save was successful
   */
  async saveConfig(path, config) {}
};