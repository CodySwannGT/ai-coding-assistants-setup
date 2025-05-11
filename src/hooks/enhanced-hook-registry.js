/**
 * Enhanced Hook Registry
 * 
 * An enhanced version of the HookRegistry class that supports the new hook framework
 * with middleware, event handling, and dynamic loading.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';
import { HookLifecycle, HookResultStatus } from './hook-interfaces.js';
import { registerCommonMiddleware } from './hook-middleware.js';
import { 
  HookSchemas, 
  _validateConfig,
  _applyDefaults,
  _loadHookConfig,
  _saveHookConfig
} from './hook-config.js';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedHookRegistry {
  constructor(config = {}) {
    this.hooks = {};
    this.projectRoot = config.projectRoot || process.cwd();
    this.logger = config.logger || this.createDefaultLogger();
    this.dryRun = config.dryRun || false;
    this.configDir = path.join(this.projectRoot, '.claude');
    this.configFile = path.join(this.configDir, 'hooks.json');
    
    // Add event emitter for registry events
    this.events = new EventEmitter();
    
    // Legacy hooks storage for backward compatibility
    this.legacyHooks = {};
    
    // Track hook dependencies
    this.hookDependencies = {};
  }
  
  /**
   * Create a default logger if none provided
   * @returns {Object} Logger object
   */
  createDefaultLogger() {
    return {
      debug: (msg) => console.log(chalk.gray(msg)),
      info: (msg) => console.log(chalk.blue(msg)),
      warn: (msg) => console.warn(chalk.yellow(msg)),
      error: (msg) => console.error(chalk.red(msg)),
      success: (msg) => console.log(chalk.green(msg))
    };
  }
  
  /**
   * Register a hook with the registry
   * @param {string} id Unique hook identifier
   * @param {Object} hookClass The hook class to register
   * @param {Object} defaults Default configuration for the hook
   * @returns {Object} The registered hook
   */
  registerHook(id, hookClass, defaults = {}) {
    if (this.hooks[id]) {
      this.warn(`Hook with ID ${id} already registered, overwriting`);
    }
    
    // Determine if this is a modern hook (implements the enhanced interface)
    const isModernHook = hookClass.prototype.on && 
                          hookClass.prototype.emit && 
                          hookClass.prototype.use &&
                          hookClass.prototype.getConfigSchema;
    
    // Get the configuration schema
    let configSchema = HookSchemas[id] || HookSchemas.BaseHookSchema;
    
    // Merge defaults with schema defaults
    const mergedDefaults = {
      ...configSchema.defaults,
      ...defaults,
      projectRoot: this.projectRoot,
      logger: this.logger,
      dryRun: this.dryRun
    };
    
    // Create hook instance with merged defaults
    const hook = new hookClass(mergedDefaults);
    
    // Store in the appropriate collection
    if (isModernHook) {
      this.hooks[id] = hook;
      
      // Register common middleware
      registerCommonMiddleware(hook);
      
      // Subscribe to hook events
      this.subscribeToHookEvents(hook);
    } else {
      // Legacy hook handling
      this.legacyHooks[id] = hook;
      this.hooks[id] = this.createEnhancedWrapper(hook, id);
    }
    
    // Emit hook registration event
    this.events.emit('hook:registered', { 
      id,
      name: hook.name,
      gitHookName: hook.gitHookName,
      description: hook.description,
      isModern: isModernHook
    });
    
    return this.hooks[id];
  }
  
  /**
   * Subscribe to events from a hook
   * @param {Object} hook Hook instance
   */
  subscribeToHookEvents(hook) {
    // Forward all hook events to registry events
    hook.on('*', (eventData) => {
      this.events.emit(eventData.event, {
        ...eventData,
        hookId: hook.gitHookName,
        hookName: hook.name
      });
    });
  }
  
  /**
   * Create an enhanced wrapper for a legacy hook
   * @param {Object} legacyHook Legacy hook instance
   * @param {string} id Hook ID
   * @returns {Object} Enhanced hook wrapper
   */
  createEnhancedWrapper(legacyHook, _id) {
    // Import needed modules
    const EnhancedBaseHook = require('./enhanced-base-hook.js').default;
    
    // Create an enhanced hook that delegates to the legacy hook
    const enhancedHook = new EnhancedBaseHook({
      name: legacyHook.name,
      description: legacyHook.description,
      gitHookName: legacyHook.gitHookName,
      projectRoot: this.projectRoot,
      logger: this.logger,
      dryRun: this.dryRun,
      enabled: legacyHook.isEnabled()
    });
    
    // Override methods to delegate to legacy hook
    enhancedHook.generateHookScript = () => legacyHook.generateHookScript();
    enhancedHook.setup = () => legacyHook.setup();
    enhancedHook.remove = () => legacyHook.remove();
    enhancedHook.isEnabled = () => legacyHook.isEnabled();
    enhancedHook.enable = () => { legacyHook.enable(); };
    enhancedHook.disable = () => { legacyHook.disable(); };
    
    // Override execute to call legacy hook execute
    const _originalExecute = enhancedHook.execute.bind(enhancedHook);
    enhancedHook.execute = async (args) => {
      // Create context for middleware
      const context = {
        gitHookName: legacyHook.gitHookName,
        args,
        projectRoot: this.projectRoot,
        environment: process.env,
        logger: this.logger,
        legacyHook,
        hook: enhancedHook
      };
      
      try {
        // Run before execution middleware
        await enhancedHook.runMiddleware(HookLifecycle.BEFORE_EXECUTION, context);
        
        // Execute the legacy hook
        await legacyHook.execute(args);
        
        // Set success result
        context.result = {
          status: HookResultStatus.SUCCESS,
          message: `Hook ${legacyHook.name} executed successfully`,
          data: {},
          shouldBlock: false,
          issues: []
        };
        
        // Run after execution middleware
        await enhancedHook.runMiddleware(HookLifecycle.AFTER_EXECUTION, context);
        
        return context.result;
      } catch (err) {
        // Set error in context
        context.error = err;
        
        // Create error result
        context.result = {
          status: HookResultStatus.FAILURE,
          message: `Error executing hook ${legacyHook.name}: ${err.message}`,
          data: {},
          shouldBlock: legacyHook.blockingMode === 'block',
          issues: [{
            severity: 'high',
            description: err.message,
            file: '',
            line: ''
          }]
        };
        
        // Run error middleware
        await enhancedHook.runMiddleware(HookLifecycle.ERROR, context);
        
        return context.result;
      }
    };
    
    // Register common middleware
    registerCommonMiddleware(enhancedHook);
    
    return enhancedHook;
  }
  
  /**
   * Get a hook by its ID
   * @param {string} id The hook ID
   * @returns {Object|null} The hook instance or null if not found
   */
  getHook(id) {
    return this.hooks[id] || null;
  }
  
  /**
   * Get a hook by its Git hook name
   * @param {string} gitHookName Git hook name
   * @returns {Object|null} The hook instance or null if not found
   */
  getHookByGitHookName(gitHookName) {
    return Object.values(this.hooks).find(hook => hook.gitHookName === gitHookName) || null;
  }
  
  /**
   * Get all registered hooks
   * @returns {Object} Map of all registered hooks
   */
  getAllHooks() {
    return this.hooks;
  }
  
  /**
   * Get all registered hooks as an array
   * @returns {Array} Array of all registered hooks
   */
  getHooksList() {
    return Object.values(this.hooks);
  }
  
  /**
   * Get enabled hooks
   * @returns {Array} Array of enabled hooks
   */
  getEnabledHooks() {
    return Object.values(this.hooks).filter(hook => hook.isEnabled());
  }
  
  /**
   * Enable a hook by ID
   * @param {string} id The hook ID
   * @returns {boolean} Whether the hook was successfully enabled
   */
  enableHook(id) {
    const hook = this.getHook(id);
    if (hook) {
      hook.enable();
      
      // Emit event
      this.events.emit('hook:enabled', { id, name: hook.name });
      
      return true;
    }
    return false;
  }
  
  /**
   * Enable hooks by IDs
   * @param {Array<string>} ids Array of hook IDs to enable
   * @returns {Array<string>} Array of successfully enabled hook IDs
   */
  enableHooks(ids) {
    const enabledIds = [];
    
    for (const id of ids) {
      if (this.enableHook(id)) {
        enabledIds.push(id);
      }
    }
    
    return enabledIds;
  }
  
  /**
   * Disable a hook by ID
   * @param {string} id The hook ID
   * @returns {boolean} Whether the hook was successfully disabled
   */
  disableHook(id) {
    const hook = this.getHook(id);
    if (hook) {
      hook.disable();
      
      // Emit event
      this.events.emit('hook:disabled', { id, name: hook.name });
      
      return true;
    }
    return false;
  }
  
  /**
   * Disable hooks by IDs
   * @param {Array<string>} ids Array of hook IDs to disable
   * @returns {Array<string>} Array of successfully disabled hook IDs
   */
  disableHooks(ids) {
    const disabledIds = [];
    
    for (const id of ids) {
      if (this.disableHook(id)) {
        disabledIds.push(id);
      }
    }
    
    return disabledIds;
  }
  
  /**
   * Set hook dependencies
   * @param {string} id Hook ID
   * @param {Array<string>} dependencies Array of hook IDs this hook depends on
   */
  setHookDependencies(id, dependencies) {
    this.hookDependencies[id] = dependencies;
  }
  
  /**
   * Get hook dependencies
   * @param {string} id Hook ID
   * @returns {Array<string>} Array of hook IDs this hook depends on
   */
  getHookDependencies(id) {
    return this.hookDependencies[id] || [];
  }
  
  /**
   * Set up all enabled hooks
   * @returns {Promise<Object>} Object with setup results
   */
  async setupHooks() {
    const results = {
      success: [],
      failed: []
    };
    
    const enabledHooks = this.getEnabledHooks();
    
    if (enabledHooks.length === 0) {
      this.logger.info('No hooks enabled, skipping setup');
      return results;
    }
    
    this.logger.info(`Setting up ${enabledHooks.length} enabled hooks...`);
    
    // Setup hooks in dependency order
    const orderedHooks = this.orderHooksByDependencies(enabledHooks);
    
    for (const hook of orderedHooks) {
      try {
        this.logger.info(`Setting up hook: ${hook.name} (${hook.gitHookName})`);
        const success = await hook.setup();
        
        if (success) {
          results.success.push(hook.name);
          this.logger.success(`Hook ${hook.name} set up successfully`);
        } else {
          results.failed.push(hook.name);
          this.logger.error(`Failed to set up hook ${hook.name}`);
        }
      } catch (err) {
        this.logger.error(`Error setting up hook ${hook.name}: ${err.message}`);
        results.failed.push(hook.name);
      }
    }
    
    // Save the configuration
    await this.saveConfig();
    
    // Emit setup completed event
    this.events.emit('hooks:setup', { 
      success: results.success,
      failed: results.failed
    });
    
    return results;
  }
  
  /**
   * Order hooks by dependencies
   * @param {Array<Object>} hooks Array of hooks to order
   * @returns {Array<Object>} Ordered array of hooks
   */
  orderHooksByDependencies(hooks) {
    const hookMap = {};
    hooks.forEach(hook => {
      hookMap[hook.gitHookName] = hook;
    });
    
    const visited = new Set();
    const temp = new Set();
    const result = [];
    
    const visit = (hookId) => {
      if (temp.has(hookId)) {
        throw new Error(`Circular dependency detected: ${hookId}`);
      }
      
      if (visited.has(hookId)) {
        return;
      }
      
      temp.add(hookId);
      
      const dependencies = this.getHookDependencies(hookId);
      for (const depId of dependencies) {
        if (hookMap[depId]) {
          visit(depId);
        }
      }
      
      temp.delete(hookId);
      visited.add(hookId);
      
      if (hookMap[hookId]) {
        result.push(hookMap[hookId]);
      }
    };
    
    for (const hook of hooks) {
      try {
        if (!visited.has(hook.gitHookName)) {
          visit(hook.gitHookName);
        }
      } catch (err) {
        this.logger.warn(`Error ordering hook ${hook.name}: ${err.message}`);
        // Include the hook anyway, but emit a warning
        if (!result.includes(hook)) {
          result.push(hook);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Remove all hooks
   * @returns {Promise<Object>} Object with removal results
   */
  async removeHooks() {
    const results = {
      success: [],
      failed: []
    };
    
    const allHooks = this.getHooksList();
    
    if (allHooks.length === 0) {
      this.logger.info('No hooks registered, nothing to remove');
      return results;
    }
    
    this.logger.info(`Removing ${allHooks.length} hooks...`);
    
    for (const hook of allHooks) {
      try {
        this.logger.info(`Removing hook: ${hook.name} (${hook.gitHookName})`);
        const success = await hook.remove();
        
        if (success) {
          results.success.push(hook.name);
          this.logger.success(`Hook ${hook.name} removed successfully`);
        } else {
          results.failed.push(hook.name);
          this.logger.error(`Failed to remove hook ${hook.name}`);
        }
      } catch (err) {
        this.logger.error(`Error removing hook ${hook.name}: ${err.message}`);
        results.failed.push(hook.name);
      }
    }
    
    // Emit remove completed event
    this.events.emit('hooks:removed', { 
      success: results.success,
      failed: results.failed
    });
    
    return results;
  }
  
  /**
   * Add event listener for registry events
   * @param {string} eventName Event name
   * @param {Function} listener Event listener function
   */
  on(eventName, listener) {
    this.events.on(eventName, listener);
  }
  
  /**
   * Save hook configurations to file
   * @returns {Promise<boolean>} Whether the save was successful
   */
  async saveConfig() {
    if (this.dryRun) {
      this.logger.info('Dry run, skipping config save');
      return true;
    }
    
    try {
      // Create config directory if it doesn't exist
      await fs.ensureDir(this.configDir);
      
      // Create config object
      const config = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        hooks: {}
      };
      
      // Add hook configurations
      for (const [id, hook] of Object.entries(this.hooks)) {
        // Get hook configuration schema
        const schema = hook.getConfigSchema ? hook.getConfigSchema() : HookSchemas[id];
        
        if (!schema) {
          this.logger.warn(`No schema found for hook ${id}, using default`);
          continue;
        }
        
        // Extract configuration properties based on schema
        const hookConfig = {};
        for (const key in schema.properties) {
          if (key in hook) {
            hookConfig[key] = hook[key];
          }
        }
        
        config.hooks[id] = hookConfig;
      }
      
      // Write config file
      await fs.writeJson(this.configFile, config, { spaces: 2 });
      this.logger.debug(`Hook configuration saved to ${this.configFile}`);
      
      return true;
    } catch (err) {
      this.logger.error(`Failed to save hook configuration: ${err.message}`);
      return false;
    }
  }
  
  /**
   * Load hook configurations from file
   * @returns {Promise<Object>} The loaded configuration
   */
  async loadConfig() {
    try {
      if (await fs.pathExists(this.configFile)) {
        const config = await fs.readJson(this.configFile);
        this.logger.debug(`Loaded hook configuration from ${this.configFile}`);
        
        // Apply configuration to registered hooks
        if (config.hooks) {
          for (const [id, hookConfig] of Object.entries(config.hooks)) {
            const hook = this.getHook(id);
            if (hook) {
              // Check if the hook has an initialize method
              if (typeof hook.initialize === 'function') {
                hook.initialize(hookConfig);
              } else {
                // Manually apply configuration
                for (const [key, value] of Object.entries(hookConfig)) {
                  if (key in hook) {
                    hook[key] = value;
                  }
                }
                
                // Enable/disable based on config
                if (hookConfig.enabled) {
                  hook.enable();
                } else {
                  hook.disable();
                }
              }
            }
          }
        }
        
        return config;
      } else {
        this.logger.debug('No hook configuration file found, using defaults');
        return { hooks: {} };
      }
    } catch (err) {
      this.logger.error(`Failed to load hook configuration: ${err.message}`);
      return { hooks: {} };
    }
  }
  
  /**
   * Load all hook implementations from the hooks directory
   * @returns {Promise<void>}
   */
  async loadHookImplementations() {
    try {
      const hooksDir = path.join(__dirname);
      const files = await fs.readdir(hooksDir);
      
      // Find all hook implementation files
      const hookFiles = files.filter(file => 
        file !== 'base-hook.js' && 
        file !== 'enhanced-base-hook.js' && 
        file !== 'hook-registry.js' && 
        file !== 'enhanced-hook-registry.js' && 
        file !== 'hook-interfaces.js' && 
        file !== 'hook-middleware.js' && 
        file !== 'hook-config.js' && 
        file.endsWith('.js')
      );
      
      // Load each hook implementation
      for (const file of hookFiles) {
        try {
          const module = await import(path.join(hooksDir, file));
          const hookClass = module.default;
          
          // Skip if no default export
          if (!hookClass) {
            this.logger.warn(`No default export found in ${file}, skipping`);
            continue;
          }
          
          // Create a temporary instance to get hook information
          const tempHook = new hookClass({ 
            projectRoot: this.projectRoot,
            logger: this.logger
          });
          
          // Register the hook using the gitHookName as the ID
          this.registerHook(
            tempHook.gitHookName, 
            hookClass, 
            { 
              projectRoot: this.projectRoot,
              logger: this.logger,
              dryRun: this.dryRun
            }
          );
          
          this.logger.debug(`Loaded hook implementation: ${tempHook.name} (${file})`);
        } catch (err) {
          this.logger.error(`Failed to load hook implementation ${file}: ${err.message}`);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to load hook implementations: ${err.message}`);
    }
  }
  
  /**
   * Run a specific hook by its ID
   * @param {string} id Hook ID to run
   * @param {Array<string>} args Command-line arguments
   * @returns {Promise<Object>} Hook execution result
   */
  async runHook(id, args = []) {
    const hook = this.getHook(id);
    if (!hook) {
      throw new Error(`Hook with ID ${id} not found`);
    }
    
    if (!hook.isEnabled()) {
      this.logger.info(`Hook ${hook.name} is disabled, skipping execution`);
      return {
        status: HookResultStatus.SKIPPED,
        message: `Hook ${hook.name} is disabled, skipping execution`,
        data: {},
        shouldBlock: false,
        issues: []
      };
    }
    
    try {
      return await hook.execute(args);
    } catch (err) {
      this.logger.error(`Error running hook ${hook.name}: ${err.message}`);
      
      return {
        status: HookResultStatus.FAILURE,
        message: `Error running hook ${hook.name}: ${err.message}`,
        data: {},
        shouldBlock: hook.blockingMode === 'block',
        issues: [{
          severity: 'high',
          description: err.message,
          file: '',
          line: ''
        }]
      };
    }
  }
  
  /**
   * Log a debug message
   * @param {string} message The message to log
   */
  debug(message) {
    if (this.logger && this.logger.debug) {
      this.logger.debug(`[HookRegistry] ${message}`);
    }
  }
  
  /**
   * Log an info message
   * @param {string} message The message to log
   */
  info(message) {
    if (this.logger && this.logger.info) {
      this.logger.info(`[HookRegistry] ${message}`);
    } else {
      console.log(chalk.blue(`[HookRegistry] ${message}`));
    }
  }
  
  /**
   * Log a warning message
   * @param {string} message The message to log
   */
  warn(message) {
    if (this.logger && this.logger.warn) {
      this.logger.warn(`[HookRegistry] ${message}`);
    } else {
      console.warn(chalk.yellow(`[HookRegistry] ⚠ ${message}`));
    }
  }
  
  /**
   * Log an error message
   * @param {string} message The message to log
   */
  error(message) {
    if (this.logger && this.logger.error) {
      this.logger.error(`[HookRegistry] ${message}`);
    } else {
      console.error(chalk.red(`[HookRegistry] ✗ ${message}`));
    }
  }
  
  /**
   * Log a success message
   * @param {string} message The message to log
   */
  success(message) {
    if (this.logger && this.logger.success) {
      this.logger.success(`[HookRegistry] ${message}`);
    } else if (this.logger && this.logger.info) {
      this.logger.info(`[HookRegistry] ✓ ${message}`);
    } else {
      console.log(chalk.green(`[HookRegistry] ✓ ${message}`));
    }
  }
}

export default EnhancedHookRegistry;