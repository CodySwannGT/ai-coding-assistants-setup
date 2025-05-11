/**
 * Hook Discovery and Loading
 * 
 * Provides functionality for discovering and dynamically loading Git hooks
 * from the project and from external sources.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { HookLifecycle } from './hook-interfaces.js';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Hook location types
 */
export const HookLocationType = {
  CORE: 'core',         // Built-in core hooks
  PROJECT: 'project',   // Project-specific hooks
  PLUGIN: 'plugin',     // Hooks from plugins/node_modules
  USER: 'user'          // User-defined hooks
};

/**
 * Discover hooks in the core hooks directory
 * @param {Object} logger Logger instance
 * @returns {Promise<Array<Object>>} Array of discovered hook modules
 */
export async function discoverCoreHooks(logger) {
  const hookModules = [];
  
  try {
    const hooksDir = __dirname;
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
      file !== 'hook-discovery.js' && 
      file.endsWith('-hook.js')
    );
    
    // Load each hook file metadata (without importing)
    for (const file of hookFiles) {
      const filePath = path.join(hooksDir, file);
      const fileStats = await fs.stat(filePath);
      
      hookModules.push({
        id: file.replace('.js', ''),
        name: file,
        path: filePath,
        type: HookLocationType.CORE,
        lastModified: fileStats.mtime,
        size: fileStats.size
      });
    }
    
    if (logger) {
      logger.debug(`Discovered ${hookModules.length} core hooks`);
    }
  } catch (err) {
    if (logger) {
      logger.error(`Failed to discover core hooks: ${err.message}`);
    }
  }
  
  return hookModules;
}

/**
 * Discover hooks in the project-specific hooks directory
 * @param {string} projectRoot Project root directory
 * @param {Object} logger Logger instance
 * @returns {Promise<Array<Object>>} Array of discovered hook modules
 */
export async function discoverProjectHooks(projectRoot, logger) {
  const hookModules = [];
  
  try {
    const projectHooksDir = path.join(projectRoot, '.claude', 'hooks');
    
    // Check if project hooks directory exists
    if (!await fs.pathExists(projectHooksDir)) {
      return hookModules;
    }
    
    const files = await fs.readdir(projectHooksDir);
    
    // Find all hook implementation files
    const hookFiles = files.filter(file => 
      file.endsWith('-hook.js')
    );
    
    // Load each hook file metadata
    for (const file of hookFiles) {
      const filePath = path.join(projectHooksDir, file);
      const fileStats = await fs.stat(filePath);
      
      hookModules.push({
        id: file.replace('.js', ''),
        name: file,
        path: filePath,
        type: HookLocationType.PROJECT,
        lastModified: fileStats.mtime,
        size: fileStats.size
      });
    }
    
    if (logger) {
      logger.debug(`Discovered ${hookModules.length} project-specific hooks`);
    }
  } catch (err) {
    if (logger) {
      logger.error(`Failed to discover project hooks: ${err.message}`);
    }
  }
  
  return hookModules;
}

/**
 * Discover hooks in plugins (node modules)
 * @param {string} projectRoot Project root directory
 * @param {Object} logger Logger instance
 * @returns {Promise<Array<Object>>} Array of discovered hook modules
 */
export async function discoverPluginHooks(projectRoot, logger) {
  const hookModules = [];
  
  try {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    
    // Check if package.json exists
    if (!await fs.pathExists(packageJsonPath)) {
      return hookModules;
    }
    
    // Read package.json
    const packageJson = await fs.readJson(packageJsonPath);
    
    // Look for dependencies that are Claude hooks
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    // Find hooks from plugins (packages with claude-hook in their name)
    for (const [name, version] of Object.entries(allDependencies)) {
      if (name.includes('claude-hook') || name.includes('claude-git-hook')) {
        try {
          // Try to import the package to check if it exports hooks
          const packagePath = path.join(projectRoot, 'node_modules', name);
          const packageInfo = await fs.readJson(path.join(packagePath, 'package.json'));
          
          // Check if package has a hooks entry point
          if (packageInfo.main && packageInfo.claudeHooks) {
            const hooksList = Array.isArray(packageInfo.claudeHooks) ?
              packageInfo.claudeHooks : [packageInfo.claudeHooks];
            
            // Add each hook
            for (const hookInfo of hooksList) {
              const hookPath = path.join(packagePath, hookInfo.path || 'index.js');
              
              hookModules.push({
                id: hookInfo.id || name.replace(/[^a-zA-Z0-9-]/g, '-'),
                name: hookInfo.name || name,
                path: hookPath,
                type: HookLocationType.PLUGIN,
                gitHookName: hookInfo.gitHookName,
                description: hookInfo.description || `Hook from ${name} package`,
                version: packageInfo.version
              });
            }
          }
        } catch (err) {
          if (logger) {
            logger.warn(`Failed to discover hooks from plugin ${name}: ${err.message}`);
          }
        }
      }
    }
    
    if (logger) {
      logger.debug(`Discovered ${hookModules.length} hooks from plugins`);
    }
  } catch (err) {
    if (logger) {
      logger.error(`Failed to discover plugin hooks: ${err.message}`);
    }
  }
  
  return hookModules;
}

/**
 * Discover user-defined hooks
 * @param {string} projectRoot Project root directory
 * @param {Object} logger Logger instance
 * @returns {Promise<Array<Object>>} Array of discovered hook modules
 */
export async function discoverUserHooks(projectRoot, logger) {
  const hookModules = [];
  
  try {
    const userHooksDir = path.join(projectRoot, '.claude', 'user-hooks');
    
    // Check if user hooks directory exists
    if (!await fs.pathExists(userHooksDir)) {
      return hookModules;
    }
    
    const files = await fs.readdir(userHooksDir);
    
    // Find all hook implementation files
    const hookFiles = files.filter(file => 
      file.endsWith('-hook.js')
    );
    
    // Load each hook file metadata
    for (const file of hookFiles) {
      const filePath = path.join(userHooksDir, file);
      const fileStats = await fs.stat(filePath);
      
      hookModules.push({
        id: file.replace('.js', ''),
        name: file,
        path: filePath,
        type: HookLocationType.USER,
        lastModified: fileStats.mtime,
        size: fileStats.size
      });
    }
    
    if (logger) {
      logger.debug(`Discovered ${hookModules.length} user-defined hooks`);
    }
  } catch (err) {
    if (logger) {
      logger.error(`Failed to discover user hooks: ${err.message}`);
    }
  }
  
  return hookModules;
}

/**
 * Discover all hooks from all sources
 * @param {string} projectRoot Project root directory
 * @param {Object} logger Logger instance
 * @returns {Promise<Array<Object>>} Array of all discovered hook modules
 */
export async function discoverAllHooks(projectRoot, logger) {
  // Discover hooks from all sources
  const coreHooks = await discoverCoreHooks(logger);
  const projectHooks = await discoverProjectHooks(projectRoot, logger);
  const pluginHooks = await discoverPluginHooks(projectRoot, logger);
  const userHooks = await discoverUserHooks(projectRoot, logger);
  
  // Combine all hooks
  const allHooks = [
    ...coreHooks,
    ...projectHooks,
    ...pluginHooks,
    ...userHooks
  ];
  
  if (logger) {
    logger.info(`Discovered ${allHooks.length} hooks in total`);
  }
  
  return allHooks;
}

/**
 * Load a hook module
 * @param {Object} hookModule Hook module information
 * @param {Object} logger Logger instance
 * @returns {Promise<Object|null>} Loaded hook module or null if loading failed
 */
export async function loadHookModule(hookModule, logger) {
  try {
    // Load the module
    const moduleUrl = new URL(hookModule.path, import.meta.url);
    const module = await import(moduleUrl);
    
    if (!module.default) {
      if (logger) {
        logger.warn(`Hook module ${hookModule.name} does not export a default class`);
      }
      return null;
    }
    
    return {
      id: hookModule.id,
      name: hookModule.name,
      class: module.default,
      type: hookModule.type,
      gitHookName: hookModule.gitHookName,
      path: hookModule.path
    };
  } catch (err) {
    if (logger) {
      logger.error(`Failed to load hook module ${hookModule.name}: ${err.message}`);
    }
    return null;
  }
}

/**
 * Load all discovered hooks
 * @param {Array<Object>} hookModules Array of hook module information
 * @param {Object} logger Logger instance
 * @returns {Promise<Array<Object>>} Array of loaded hook modules
 */
export async function loadAllHookModules(hookModules, logger) {
  const loadedModules = [];
  
  for (const hookModule of hookModules) {
    const loadedModule = await loadHookModule(hookModule, logger);
    if (loadedModule) {
      loadedModules.push(loadedModule);
    }
  }
  
  if (logger) {
    logger.info(`Loaded ${loadedModules.length} hook modules`);
  }
  
  return loadedModules;
}

/**
 * Register discovered hooks with the registry
 * @param {Object} registry Hook registry
 * @param {Array<Object>} hookModules Array of hook module information
 */
export async function registerDiscoveredHooks(registry, hookModules) {
  // Load all hook modules
  const loadedModules = await loadAllHookModules(hookModules, registry.logger);
  
  // Register each hook with the registry
  for (const module of loadedModules) {
    try {
      // Create a temporary instance to get hook information
      const tempHook = new module.class({ 
        projectRoot: registry.projectRoot,
        logger: registry.logger
      });
      
      // Use gitHookName as the ID, or the module ID if not available
      const hookId = tempHook.gitHookName || module.id;
      
      // Register the hook
      registry.registerHook(
        hookId, 
        module.class, 
        { 
          projectRoot: registry.projectRoot,
          logger: registry.logger,
          dryRun: registry.dryRun
        }
      );
      
      registry.logger.debug(`Registered hook: ${tempHook.name} (${hookId})`);
    } catch (err) {
      registry.logger.error(`Failed to register hook ${module.name}: ${err.message}`);
    }
  }
}

/**
 * Create hook discovery middleware
 * @returns {Function} Middleware function
 */
export function createHookDiscoveryMiddleware() {
  return async (context, next) => {
    const { hook, projectRoot, logger } = context;
    
    // Discover user-defined hooks
    const userHooks = await discoverUserHooks(projectRoot, logger);
    
    // Check if any user hooks apply to this Git hook
    const applicableHooks = userHooks.filter(userHook => {
      return userHook.gitHookName === hook.gitHookName;
    });
    
    // If we found applicable hooks, load them
    if (applicableHooks.length > 0) {
      for (const userHook of applicableHooks) {
        try {
          const loadedHook = await loadHookModule(userHook, logger);
          if (loadedHook && loadedHook.class) {
            // Create an instance of the hook
            const hookInstance = new loadedHook.class({
              projectRoot,
              logger,
              gitHookName: hook.gitHookName
            });
            
            // Add the hook to the context
            context.userHooks = context.userHooks || [];
            context.userHooks.push(hookInstance);
            
            logger.debug(`Loaded user hook: ${hookInstance.name}`);
          }
        } catch (err) {
          logger.error(`Failed to load user hook ${userHook.name}: ${err.message}`);
        }
      }
    }
    
    await next();
    
    // Execute user hooks after the main hook if any were found
    if (context.userHooks && context.userHooks.length > 0) {
      for (const userHook of context.userHooks) {
        try {
          logger.debug(`Executing user hook: ${userHook.name}`);
          await userHook.execute(context.args);
        } catch (err) {
          logger.error(`Error executing user hook ${userHook.name}: ${err.message}`);
        }
      }
    }
  };
}

/**
 * Register hook discovery middleware with a hook
 * @param {Object} hook Hook instance
 */
export function registerHookDiscoveryMiddleware(hook) {
  hook.use(HookLifecycle.BEFORE_EXECUTION, createHookDiscoveryMiddleware());
}

export default {
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
};