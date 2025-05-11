/**
 * Hook Registry
 * 
 * Manages the collection of Git hooks available in the AI Coding Assistants setup.
 * Provides registration, retrieval, and management of hook configurations.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HookRegistry {
  constructor(config = {}) {
    this.hooks = {};
    this.projectRoot = config.projectRoot || process.cwd();
    this.logger = config.logger;
    this.dryRun = config.dryRun || false;
    this.configFile = path.join(this.projectRoot, '.claude', 'hooks.json');
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

    const hookConfig = {
      ...defaults,
      projectRoot: this.projectRoot,
      logger: this.logger,
      dryRun: this.dryRun
    };

    const hook = new hookClass(hookConfig);
    this.hooks[id] = hook;
    return hook;
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
      return true;
    }
    return false;
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
      return true;
    }
    return false;
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
      this.info('No hooks enabled, skipping setup');
      return results;
    }

    this.info(`Setting up ${enabledHooks.length} enabled hooks...`);
    
    for (const hook of enabledHooks) {
      try {
        const success = await hook.setup();
        if (success) {
          results.success.push(hook.name);
        } else {
          results.failed.push(hook.name);
        }
      } catch (err) {
        this.error(`Error setting up hook ${hook.name}: ${err.message}`);
        results.failed.push(hook.name);
      }
    }

    // Save the configuration
    await this.saveConfig();

    return results;
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
      this.info('No hooks registered, nothing to remove');
      return results;
    }

    this.info(`Removing ${allHooks.length} hooks...`);
    
    for (const hook of allHooks) {
      try {
        const success = await hook.remove();
        if (success) {
          results.success.push(hook.name);
        } else {
          results.failed.push(hook.name);
        }
      } catch (err) {
        this.error(`Error removing hook ${hook.name}: ${err.message}`);
        results.failed.push(hook.name);
      }
    }

    return results;
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
   * Save the current hook configuration
   * @returns {Promise<void>}
   */
  async saveConfig() {
    if (this.dryRun) {
      this.info('Dry run, skipping config save');
      return;
    }

    try {
      // Create config directory if it doesn't exist
      await fs.ensureDir(path.dirname(this.configFile));

      // Create config object
      const config = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        hooks: {}
      };

      // Add hook configurations
      Object.entries(this.hooks).forEach(([id, hook]) => {
        config.hooks[id] = {
          name: hook.name,
          gitHookName: hook.gitHookName,
          enabled: hook.enabled,
          strictness: hook.strictness
        };
      });

      // Write config file
      await fs.writeJson(this.configFile, config, { spaces: 2 });
      this.debug(`Hook configuration saved to ${this.configFile}`);
    } catch (err) {
      this.error(`Failed to save hook configuration: ${err.message}`);
    }
  }

  /**
   * Load hook configuration from the config file
   * @returns {Promise<Object>} The loaded configuration
   */
  async loadConfig() {
    try {
      if (await fs.pathExists(this.configFile)) {
        const config = await fs.readJson(this.configFile);
        this.debug(`Loaded hook configuration from ${this.configFile}`);
        
        // Apply configuration to registered hooks
        Object.entries(config.hooks || {}).forEach(([id, hookConfig]) => {
          const hook = this.getHook(id);
          if (hook) {
            if (hookConfig.enabled) {
              hook.enable();
            } else {
              hook.disable();
            }
            
            if (hookConfig.strictness) {
              hook.setStrictness(hookConfig.strictness);
            }
          }
        });
        
        return config;
      } else {
        this.debug('No hook configuration file found, using defaults');
        return { hooks: {} };
      }
    } catch (err) {
      this.error(`Failed to load hook configuration: ${err.message}`);
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
        file !== 'hook-registry.js' && 
        file.endsWith('.js')
      );

      // Load each hook implementation
      for (const file of hookFiles) {
        try {
          const module = await import(path.join(hooksDir, file));
          const hookClass = module.default;
          
          // Create a temporary instance to get hook information
          const tempHook = new hookClass({ 
            projectRoot: this.projectRoot,
            logger: this.logger
          });
          
          // Register the hook
          this.registerHook(
            tempHook.gitHookName, 
            hookClass, 
            { 
              projectRoot: this.projectRoot,
              logger: this.logger,
              dryRun: this.dryRun
            }
          );
          
          this.debug(`Loaded hook implementation: ${tempHook.name} (${file})`);
        } catch (err) {
          this.error(`Failed to load hook implementation ${file}: ${err.message}`);
        }
      }
    } catch (err) {
      this.error(`Failed to load hook implementations: ${err.message}`);
    }
  }
}

export default HookRegistry;