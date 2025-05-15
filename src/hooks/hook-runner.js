#!/usr/bin/env node --no-warnings
/**
 * Claude Hook Runner
 * 
 * This script is installed as a command-line executable and is called by the Git hooks.
 * It loads the hook registry and executes the appropriate hook based on the command-line arguments.
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import HookRegistry from './hook-registry.js';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a basic logger
const logger = {
  debug: (msg) => console.log(chalk.gray(msg)),
  info: (msg) => console.log(chalk.blue(msg)),
  warn: (msg) => console.warn(chalk.yellow(msg)),
  error: (msg) => console.error(chalk.red(msg))
};

/**
 * Find the Git repository root directory
 * @returns {string} Git repository root path
 */
function findGitRoot() {
  let currentDir = process.cwd();
  const root = path.parse(currentDir).root;
  
  while (currentDir !== root) {
    const gitDir = path.join(currentDir, '.git');
    if (fs.existsSync(gitDir)) {
      return currentDir;
    }
    
    currentDir = path.dirname(currentDir);
  }
  
  throw new Error('Not in a Git repository');
}

/**
 * Main function
 */
async function main() {
  try {
    // Get the hook name from command-line arguments
    const hookName = process.argv[2];
    if (!hookName) {
      console.error('No hook name specified');
      process.exit(1);
    }
    
    // Find the Git repository root
    const projectRoot = findGitRoot();
    
    // Create the hook registry
    const registry = new HookRegistry({
      projectRoot,
      logger
    });
    
    // Load hook implementations
    await registry.loadHookImplementations();
    
    // Get the hook
    const hook = registry.getHook(hookName);
    if (!hook) {
      console.error(`Hook '${hookName}' not found`);
      process.exit(1);
    }
    
    // Load configuration
    await registry.loadConfig();
    
    // Check if the hook is enabled
    if (!hook.isEnabled()) {
      logger.info(`Hook '${hookName}' is disabled, skipping execution`);
      process.exit(0);
    }
    
    // Execute the hook
    await hook.execute(process.argv.slice(3));
    
    // Exit successfully
    process.exit(0);
  } catch (err) {
    console.error(`Hook runner error: ${err.message}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(err => {
  console.error(`Unhandled error: ${err.message}`);
  process.exit(1);
});