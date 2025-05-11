/**
 * Hook Compatibility Layer
 * 
 * Provides backward compatibility for existing hooks to work with the new framework.
 * Adapts legacy hooks to the new interface and ensures smooth transition.
 */

import EventEmitter from 'events';
import { BaseHook } from './base-hook.js';
import EnhancedBaseHook from './enhanced-base-hook.js';
import { HookLifecycle, HookResultStatus } from './hook-interfaces.js';
import { registerCommonMiddleware } from './hook-middleware.js';
import { HookSchemas, validateConfig, applyDefaults } from './hook-config.js';

/**
 * Create an enhanced wrapper for a legacy hook
 * @param {Object} legacyHook Legacy hook instance
 * @param {string} id Hook ID
 * @returns {Object} Enhanced hook wrapper
 */
export function createEnhancedWrapper(legacyHook, id) {
  // Create an enhanced hook that delegates to the legacy hook
  const enhancedHook = new EnhancedBaseHook({
    name: legacyHook.name,
    description: legacyHook.description,
    gitHookName: legacyHook.gitHookName,
    projectRoot: legacyHook.projectRoot,
    logger: legacyHook.logger,
    dryRun: legacyHook.dryRun,
    enabled: legacyHook.isEnabled()
  });
  
  // Transfer properties from legacy hook
  for (const key in legacyHook) {
    if (
      typeof legacyHook[key] !== 'function' && 
      !['name', 'description', 'gitHookName', 'projectRoot', 'logger', 'dryRun', 'enabled'].includes(key)
    ) {
      enhancedHook[key] = legacyHook[key];
    }
  }
  
  // Override methods to delegate to legacy hook
  enhancedHook.generateHookScript = () => legacyHook.generateHookScript();
  enhancedHook.setup = () => legacyHook.setup();
  enhancedHook.remove = () => legacyHook.remove();
  enhancedHook.isEnabled = () => legacyHook.isEnabled();
  enhancedHook.enable = () => { legacyHook.enable(); };
  enhancedHook.disable = () => { legacyHook.disable(); };
  
  // Override execute to call legacy hook execute
  const originalExecute = enhancedHook.execute.bind(enhancedHook);
  enhancedHook.execute = async (args) => {
    // Create context for middleware
    const context = {
      gitHookName: legacyHook.gitHookName,
      args,
      projectRoot: legacyHook.projectRoot,
      environment: process.env,
      logger: legacyHook.logger,
      legacyHook,
      hook: enhancedHook
    };
    
    try {
      // Run before execution middleware
      await enhancedHook.runMiddleware(HookLifecycle.BEFORE_EXECUTION, context);
      
      // Check if the hook should execute
      if (!(await enhancedHook.shouldExecute())) {
        context.result = {
          status: HookResultStatus.SKIPPED,
          message: `Hook ${legacyHook.name} was skipped`,
          data: {},
          shouldBlock: false,
          issues: []
        };
        
        await enhancedHook.runMiddleware(HookLifecycle.AFTER_EXECUTION, context);
        return context.result;
      }
      
      // Run execution middleware
      await enhancedHook.runMiddleware(HookLifecycle.EXECUTION, context);
      
      // If middleware has already set a result, return it
      if (context.result) {
        await enhancedHook.runMiddleware(HookLifecycle.AFTER_EXECUTION, context);
        return context.result;
      }
      
      // Execute the legacy hook
      const legacyResult = await legacyHook.execute(args);
      
      // Create result from legacy execution
      if (!context.result) {
        context.result = {
          status: HookResultStatus.SUCCESS,
          message: `Hook ${legacyHook.name} executed successfully`,
          data: legacyResult || {},
          shouldBlock: false,
          issues: []
        };
      }
      
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
 * Create a legacy wrapper for an enhanced hook
 * @param {Object} enhancedHook Enhanced hook instance
 * @returns {Object} Legacy hook wrapper
 */
export function createLegacyWrapper(enhancedHook) {
  // Create a legacy hook that delegates to the enhanced hook
  const legacyHook = new BaseHook({
    name: enhancedHook.name,
    description: enhancedHook.description,
    gitHookName: enhancedHook.gitHookName,
    projectRoot: enhancedHook.projectRoot,
    logger: enhancedHook.logger,
    dryRun: enhancedHook.dryRun,
    enabled: enhancedHook.isEnabled()
  });
  
  // Transfer properties from enhanced hook
  for (const key in enhancedHook) {
    if (
      typeof enhancedHook[key] !== 'function' && 
      !['name', 'description', 'gitHookName', 'projectRoot', 'logger', 'dryRun', 'enabled', 'middleware', 'events'].includes(key)
    ) {
      legacyHook[key] = enhancedHook[key];
    }
  }
  
  // Override methods to delegate to enhanced hook
  legacyHook.generateHookScript = () => enhancedHook.generateHookScript();
  legacyHook.setup = () => enhancedHook.setup();
  legacyHook.remove = () => enhancedHook.remove();
  legacyHook.isEnabled = () => enhancedHook.isEnabled();
  legacyHook.enable = () => { enhancedHook.enable(); };
  legacyHook.disable = () => { enhancedHook.disable(); };
  
  // Override execute to call enhanced hook execute
  legacyHook.execute = async (args) => {
    // Call enhanced hook execute
    const result = await enhancedHook.execute(args);
    
    // Convert result to legacy format (which often doesn't return a value)
    return result.data;
  };
  
  return legacyHook;
}

/**
 * Adapt an existing class to the enhanced hook interface
 * @param {Function} LegacyHookClass Legacy hook class
 * @returns {Function} Enhanced hook class
 */
export function adaptLegacyHookClass(LegacyHookClass) {
  // Create a new class that extends the legacy class
  return class EnhancedAdapter extends LegacyHookClass {
    constructor(config) {
      super(config);
      
      // Add enhanced properties
      this.events = new EventEmitter();
      this.middleware = {};
      
      // Initialize middleware for each lifecycle phase
      for (const phase in HookLifecycle) {
        this.middleware[HookLifecycle[phase]] = [];
      }
      
      // Add configuration schema based on hook type
      this.configSchema = HookSchemas[this.gitHookName] || HookSchemas.BaseHookSchema;
    }
    
    /**
     * Register a middleware function for a lifecycle phase
     * @param {string} phase Lifecycle phase
     * @param {Function} middleware Middleware function
     */
    use(phase, middleware) {
      if (!this.middleware[phase]) {
        this.middleware[phase] = [];
      }
      this.middleware[phase].push(middleware);
    }
    
    /**
     * Run middleware for a specific phase
     * @param {string} phase Lifecycle phase
     * @param {Object} context Execution context
     */
    async runMiddleware(phase, context) {
      if (!this.middleware[phase] || !this.middleware[phase].length) {
        return;
      }
      
      for (const middleware of this.middleware[phase]) {
        await middleware(context, async () => {});
      }
    }
    
    /**
     * Register an event handler
     * @param {string} event Event name
     * @param {Function} handler Event handler
     */
    on(event, handler) {
      this.events.on(event, handler);
    }
    
    /**
     * Emit an event
     * @param {string} event Event name
     * @param {Object} data Event data
     */
    emit(event, data) {
      this.events.emit(event, { ...data, source: this.name, event });
    }
    
    /**
     * Get configuration schema
     * @returns {Object} Configuration schema
     */
    getConfigSchema() {
      return this.configSchema;
    }
    
    /**
     * Initialize with configuration
     * @param {Object} config Configuration object
     */
    initialize(config) {
      // Validate configuration
      const validConfig = validateConfig(config, this.configSchema);
      if (!validConfig.isValid) {
        for (const error of validConfig.errors) {
          if (this.logger) {
            this.logger.warn(`Configuration error: ${error}`);
          }
        }
        
        // Apply defaults
        const defaults = applyDefaults({}, this.configSchema);
        for (const [key, value] of Object.entries(defaults)) {
          if (key in this) {
            this[key] = value;
          }
        }
        
        return;
      }
      
      // Apply configuration
      for (const [key, value] of Object.entries(config)) {
        if (key in this) {
          this[key] = value;
        }
      }
    }
    
    /**
     * Override execute to run middleware
     * @param {Array<string>} args Command-line arguments
     */
    async execute(args) {
      // Create context for middleware
      const context = {
        gitHookName: this.gitHookName,
        args,
        projectRoot: this.projectRoot,
        environment: process.env,
        logger: this.logger,
        hook: this
      };
      
      try {
        // Run before execution middleware
        await this.runMiddleware(HookLifecycle.BEFORE_EXECUTION, context);
        
        // Check if the hook should execute
        if (!(await this.shouldExecute())) {
          context.result = {
            status: HookResultStatus.SKIPPED,
            message: `Hook ${this.name} was skipped`,
            data: {},
            shouldBlock: false,
            issues: []
          };
          
          await this.runMiddleware(HookLifecycle.AFTER_EXECUTION, context);
          return context.result;
        }
        
        // Run execution middleware
        await this.runMiddleware(HookLifecycle.EXECUTION, context);
        
        // If middleware has already set a result, return it
        if (context.result) {
          await this.runMiddleware(HookLifecycle.AFTER_EXECUTION, context);
          return context.result;
        }
        
        // Call the original execute method
        const legacyResult = await super.execute(args);
        
        // Create result from legacy execution
        context.result = {
          status: HookResultStatus.SUCCESS,
          message: `Hook ${this.name} executed successfully`,
          data: legacyResult || {},
          shouldBlock: false,
          issues: []
        };
        
        // Run after execution middleware
        await this.runMiddleware(HookLifecycle.AFTER_EXECUTION, context);
        
        return context.result;
      } catch (err) {
        // Set error in context
        context.error = err;
        
        // Create error result
        context.result = {
          status: HookResultStatus.FAILURE,
          message: `Error executing hook ${this.name}: ${err.message}`,
          data: {},
          shouldBlock: this.blockingMode === 'block',
          issues: [{
            severity: 'high',
            description: err.message,
            file: '',
            line: ''
          }]
        };
        
        // Run error middleware
        await this.runMiddleware(HookLifecycle.ERROR, context);
        
        return context.result;
      }
    }
  };
}

/**
 * Check if a hook class is compatible with the enhanced interface
 * @param {Function} HookClass Hook class to check
 * @returns {boolean} Whether the hook class is compatible
 */
export function isEnhancedCompatible(HookClass) {
  // Check if the class has the expected enhanced methods
  return (
    HookClass.prototype.on &&
    HookClass.prototype.emit &&
    HookClass.prototype.use &&
    HookClass.prototype.runMiddleware &&
    HookClass.prototype.getConfigSchema &&
    HookClass.prototype.initialize
  );
}

/**
 * Ensure a hook class is compatible with the enhanced interface
 * @param {Function} HookClass Hook class to ensure compatibility for
 * @returns {Function} Enhanced compatible hook class
 */
export function ensureEnhancedCompatible(HookClass) {
  // If already compatible, return as is
  if (isEnhancedCompatible(HookClass)) {
    return HookClass;
  }
  
  // Otherwise, adapt the legacy class
  return adaptLegacyHookClass(HookClass);
}

export default {
  createEnhancedWrapper,
  createLegacyWrapper,
  adaptLegacyHookClass,
  isEnhancedCompatible,
  ensureEnhancedCompatible
};