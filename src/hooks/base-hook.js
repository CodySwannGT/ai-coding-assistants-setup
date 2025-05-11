/**
 * Base Hook Class
 * 
 * This is the foundation for all Git hooks in the AI Coding Assistants setup.
 * It provides common functionality and a consistent interface for all hooks.
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { execSync } from 'child_process';

export class BaseHook {
  /**
   * Creates a new hook instance
   * @param {Object} config Hook configuration
   * @param {string} config.name The name of the hook
   * @param {string} config.description A short description of what the hook does
   * @param {string} config.gitHookName The Git hook name (e.g., 'pre-commit', 'post-merge')
   * @param {string} config.projectRoot Path to the project root
   * @param {Object} config.logger The logger instance to use
   * @param {boolean} config.dryRun Whether to perform a dry run
   */
  constructor(config) {
    this.name = config.name;
    this.description = config.description;
    this.gitHookName = config.gitHookName;
    this.projectRoot = config.projectRoot;
    this.logger = config.logger;
    this.dryRun = config.dryRun || false;
    this.enabled = false;
    this.claudeApiKey = null;
    this.claudeBaseUrl = 'https://api.anthropic.com';
    this.strictness = 'medium'; // low, medium, high
  }

  /**
   * Log a debug message
   * @param {string} message The message to log
   */
  debug(message) {
    if (this.logger && this.logger.debug) {
      this.logger.debug(`[${this.name}] ${message}`);
    }
  }

  /**
   * Log an info message
   * @param {string} message The message to log
   */
  info(message) {
    if (this.logger && this.logger.info) {
      this.logger.info(`[${this.name}] ${message}`);
    } else {
      console.log(chalk.blue(`[${this.name}] ${message}`));
    }
  }

  /**
   * Log a warning message
   * @param {string} message The message to log
   */
  warn(message) {
    if (this.logger && this.logger.warn) {
      this.logger.warn(`[${this.name}] ${message}`);
    } else {
      console.warn(chalk.yellow(`[${this.name}] ⚠ ${message}`));
    }
  }

  /**
   * Log an error message
   * @param {string} message The message to log
   */
  error(message) {
    if (this.logger && this.logger.error) {
      this.logger.error(`[${this.name}] ${message}`);
    } else {
      console.error(chalk.red(`[${this.name}] ✗ ${message}`));
    }
  }

  /**
   * Log a success message
   * @param {string} message The message to log
   */
  success(message) {
    if (this.logger && this.logger.info) {
      this.logger.info(`[${this.name}] ✓ ${message}`);
    } else {
      console.log(chalk.green(`[${this.name}] ✓ ${message}`));
    }
  }

  /**
   * Enable this hook
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable this hook
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Check if this hook is enabled
   * @returns {boolean} Whether this hook is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Set the Claude API key
   * @param {string} apiKey The Claude API key
   */
  setClaudeApiKey(apiKey) {
    this.claudeApiKey = apiKey;
  }

  /**
   * Set the strictness level for this hook
   * @param {string} level The strictness level ('low', 'medium', 'high')
   */
  setStrictness(level) {
    this.strictness = level;
  }

  /**
   * Get the Git hook path
   * @returns {string} The path to the Git hook file
   */
  getGitHookPath() {
    return path.join(this.projectRoot, '.git', 'hooks', this.gitHookName);
  }

  /**
   * Setup this hook in the Git hooks directory
   * @returns {Promise<boolean>} Whether the hook was successfully set up
   */
  async setup() {
    if (!this.enabled) {
      this.debug(`Hook ${this.name} is disabled, skipping setup`);
      return false;
    }

    if (this.dryRun) {
      this.info(`Would set up hook ${this.name} (${this.gitHookName})`);
      return true;
    }

    try {
      // Create the hooks directory if it doesn't exist
      const hooksDir = path.join(this.projectRoot, '.git', 'hooks');
      await fs.ensureDir(hooksDir);

      const hookPath = this.getGitHookPath();

      // Check if hook already exists and backup if needed
      if (await fs.pathExists(hookPath)) {
        const stats = await fs.stat(hookPath);
        
        // Only backup if it's not a symlink and has content (actual size > 0)
        if (!stats.isSymbolicLink() && stats.size > 0) {
          const backupPath = `${hookPath}.bak.${Date.now()}`;
          this.info(`Backing up existing hook to ${backupPath}`);
          await fs.copy(hookPath, backupPath);
        }
      }

      // Create the hook script
      const hookScript = this.generateHookScript();
      await fs.writeFile(hookPath, hookScript);
      await fs.chmod(hookPath, 0o755); // Make executable
      
      this.success(`Hook ${this.name} (${this.gitHookName}) installed at ${hookPath}`);
      return true;
    } catch (err) {
      this.error(`Failed to set up hook ${this.name}: ${err.message}`);
      return false;
    }
  }

  /**
   * Remove this hook from the Git hooks directory
   * @returns {Promise<boolean>} Whether the hook was successfully removed
   */
  async remove() {
    if (this.dryRun) {
      this.info(`Would remove hook ${this.name} (${this.gitHookName})`);
      return true;
    }

    try {
      const hookPath = this.getGitHookPath();
      
      // Check if the hook exists and is our hook
      if (await fs.pathExists(hookPath)) {
        const content = await fs.readFile(hookPath, 'utf8');
        
        // Only remove if it's our hook
        if (content.includes('AI Coding Assistants Hook')) {
          await fs.remove(hookPath);
          this.success(`Hook ${this.name} (${this.gitHookName}) removed`);
          
          // Restore backup if available
          const backups = await fs.readdir(path.dirname(hookPath));
          const backupFiles = backups.filter(file => file.startsWith(`${this.gitHookName}.bak.`));
          
          if (backupFiles.length > 0) {
            // Use the most recent backup
            const mostRecent = backupFiles.sort().pop();
            const backupPath = path.join(path.dirname(hookPath), mostRecent);
            
            this.info(`Restoring backup hook from ${backupPath}`);
            await fs.copy(backupPath, hookPath);
            await fs.chmod(hookPath, 0o755); // Make executable
          }
          
          return true;
        } else {
          this.warn(`Hook ${this.gitHookName} exists but wasn't created by AI Coding Assistants. Skipping removal.`);
          return false;
        }
      } else {
        this.info(`Hook ${this.gitHookName} doesn't exist, nothing to remove`);
        return true;
      }
    } catch (err) {
      this.error(`Failed to remove hook ${this.name}: ${err.message}`);
      return false;
    }
  }

  /**
   * Generate the hook script content
   * @returns {string} The hook script content
   */
  generateHookScript() {
    // The base script should be overridden by specific hook implementations
    return `#!/bin/sh
# AI Coding Assistants Hook: ${this.name}
# Description: ${this.description}
# Generated: ${new Date().toISOString()}

echo "This is a placeholder hook script for ${this.name}"
exit 0
`;
  }

  /**
   * Execute a command and return its output
   * @param {string} command The command to execute
   * @returns {string} The command output
   */
  executeCommand(command) {
    try {
      return execSync(command, { encoding: 'utf8', cwd: this.projectRoot });
    } catch (err) {
      this.error(`Failed to execute command "${command}": ${err.message}`);
      return '';
    }
  }

  /**
   * Call the Claude API
   * @param {Object} options API call options
   * @param {string} options.prompt The prompt to send to Claude
   * @param {string} [options.model='claude-3-opus-20240229'] The Claude model to use
   * @param {number} [options.maxTokens=2000] Maximum number of tokens to generate
   * @returns {Promise<Object>} The API response
   */
  async callClaudeApi({ prompt, model = 'claude-3-opus-20240229', maxTokens = 2000 }) {
    if (!this.claudeApiKey) {
      throw new Error('Claude API key not set');
    }

    try {
      const response = await fetch(`${this.claudeBaseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (err) {
      this.error(`Failed to call Claude API: ${err.message}`);
      throw err;
    }
  }

  /**
   * Load environment variables from .env file
   * @returns {Object} The loaded environment variables
   */
  loadEnv() {
    try {
      const envPath = path.join(this.projectRoot, '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        
        envContent.split('\n').forEach(line => {
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            env[key] = value;
          }
        });
        
        return env;
      }
    } catch (err) {
      this.warn(`Failed to load .env file: ${err.message}`);
    }
    
    return {};
  }

  /**
   * Execute the hook logic
   * @param {Array<string>} args Command-line arguments
   * @returns {Promise<void>} Promise that resolves when the hook execution is complete
   */
  async execute(args) {
    throw new Error('Hook.execute() must be implemented by subclasses');
  }
}

export default BaseHook;