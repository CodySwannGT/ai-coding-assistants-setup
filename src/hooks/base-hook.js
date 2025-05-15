/**
 * Base Hook Class
 * 
 * This is the foundation for all Git hooks in the AI Coding Assistants setup.
 * It provides common functionality and a consistent interface for all hooks.
 */

import fs from 'fs-extra';
import path from 'path';
import _os from 'os';
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
   * @param {string} config.blockingMode How to respond to issues ('block', 'warn', 'none')
   * @param {string} config.strictness Level of strictness ('low', 'medium', 'high')
   * @param {boolean} config.preferCli Whether to prefer Claude CLI over API when available
   */
  constructor(config) {
    this.name = config.name;
    this.description = config.description;
    this.gitHookName = config.gitHookName;
    this.projectRoot = config.projectRoot;
    this.logger = config.logger;
    this.dryRun = config.dryRun || false;
    this.enabled = config.enabled || false;
    this.claudeApiKey = null;
    this.claudeBaseUrl = 'https://api.anthropic.com';
    this.strictness = config.strictness || 'medium'; // low, medium, high
    this.blockingMode = config.blockingMode || 'warn'; // block, warn, none
    this.configFile = null; // Will store path to hook-specific config file
    this.promptTemplates = {}; // For storing hook-specific Claude prompt templates
    this.claudeAvailable = null; // Will track Claude availability
    this.claudeCliAvailable = null; // Will track Claude CLI availability
    this.preferCli = config.preferCli !== undefined ? config.preferCli : true; // Whether to prefer Claude CLI over API
    this.nonInteractive = config.nonInteractive || false; // Whether to run in non-interactive mode
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
   * Set non-interactive mode
   * @param {boolean} nonInteractive Whether to run in non-interactive mode
   */
  setNonInteractive(nonInteractive) {
    this.nonInteractive = nonInteractive;
  }

  /**
   * Check if non-interactive mode is enabled
   * @returns {boolean} Whether non-interactive mode is enabled
   */
  isNonInteractive() {
    return this.nonInteractive || process.env.CLAUDE_NON_INTERACTIVE === 'true';
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
   * @param {number} [options.temperature=0.7] Temperature for generation
   * @param {boolean} [options.cacheResponse=false] Whether to cache the response
   * @param {boolean} [options.preferCli=true] Whether to prefer Claude CLI over the API when available
   * @returns {Promise<Object>} The API response
   */
  async callClaudeApi({
    prompt,
    model = 'claude-3-opus-20240229',
    maxTokens = 2000,
    temperature = 0.7,
    cacheResponse = false,
    preferCli = this.preferCli
  }) {
    // Check if Claude is available
    if (this.claudeAvailable === null) {
      await this.checkClaudeAvailability();
    }

    if (!this.claudeAvailable) {
      throw new Error('Claude API is not available');
    }

    // Create a cache key if caching is enabled
    let cacheKey = null;
    if (cacheResponse) {
      cacheKey = `${model}:${temperature}:${JSON.stringify(prompt)}`.slice(0, 100);
      const cachedResponse = await this.getFromCache(cacheKey);
      if (cachedResponse) {
        this.debug('Using cached Claude response');
        return cachedResponse;
      }
    }

    // Check if we should try using the CLI first
    if (preferCli && this.claudeCliAvailable) {
      try {
        const cliResponse = await this.callClaudeCli({
          prompt,
          model,
          maxTokens,
          temperature
        });

        // Cache the response if caching is enabled
        if (cacheResponse && cacheKey) {
          await this.saveToCache(cacheKey, cliResponse);
        }

        return cliResponse;
      } catch (err) {
        this.debug(`Failed to call Claude CLI: ${err.message}`);
        this.claudeCliAvailable = false; // Mark CLI as unavailable after an error
        // Fall back to the API
      }
    }

    // If CLI is not available or failed, use the API
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
          temperature,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error (${response.status}): ${errorText}`);
      }

      const responseData = await response.json();

      // Cache the response if caching is enabled
      if (cacheResponse && cacheKey) {
        await this.saveToCache(cacheKey, responseData);
      }

      return responseData;
    } catch (err) {
      this.error(`Failed to call Claude API: ${err.message}`);
      this.claudeAvailable = false; // Mark as unavailable after an error
      throw err;
    }
  }

  /**
   * Call Claude CLI
   * @param {Object} options CLI call options
   * @param {string} options.prompt The prompt to send to Claude
   * @param {string} [options.model='claude-3-opus-20240229'] The Claude model to use
   * @param {number} [options.maxTokens=2000] Maximum number of tokens to generate
   * @param {number} [options.temperature=0.7] Temperature for generation
   * @returns {Promise<Object>} The Claude CLI response
   */
  async callClaudeCli({
    prompt,
    model = 'claude-3-opus-20240229',
    maxTokens = 2000,
    temperature = 0.7
  }) {
    try {
      // Import the Claude CLI integration dynamically to avoid circular dependencies
      const { callClaudeCli } = await import('../integrations/claude-cli.js');

      const response = await callClaudeCli({
        prompt,
        model,
        maxTokens,
        temperature,
        format: 'json'
      });

      // Format the response to match the API response structure
      return {
        id: response.id || `claude-cli-${Date.now()}`,
        content: [{ type: 'text', text: response.content || response }]
      };
    } catch (err) {
      this.debug(`Failed to call Claude CLI: ${err.message}`);
      this.claudeCliAvailable = false; // Mark CLI as unavailable after an error
      throw err;
    }
  }

  /**
   * Check if Claude API or CLI is available
   * @returns {Promise<boolean>} Whether Claude is available
   */
  async checkClaudeAvailability() {
    // Check if Claude CLI is available
    try {
      const { isClaudeCliAvailable } = await import('../integrations/claude-cli.js');
      this.claudeCliAvailable = await isClaudeCliAvailable();

      if (this.claudeCliAvailable) {
        this.debug('Claude CLI is available');
        this.claudeAvailable = true;
        return true;
      }
    } catch (err) {
      this.debug(`Claude CLI check failed: ${err.message}`);
      this.claudeCliAvailable = false;
    }

    // If CLI is not available, check the API
    if (!this.claudeApiKey) {
      // Try to load API key from environment
      const env = this.loadEnv();
      this.setClaudeApiKey(env.ANTHROPIC_API_KEY || '');

      if (!this.claudeApiKey) {
        this.debug('Claude API key not found in environment');
        this.claudeAvailable = false;
        return false;
      }
    }

    try {
      // Simple ping to check if API is reachable
      const response = await fetch(`${this.claudeBaseUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      if (response.ok) {
        this.debug('Claude API is available');
        this.claudeAvailable = true;
        return true;
      } else {
        this.debug(`Claude API returned status ${response.status}`);
        this.claudeAvailable = false;
        return false;
      }
    } catch (err) {
      this.debug(`Claude API check failed: ${err.message}`);
      this.claudeAvailable = false;
      return false;
    }
  }

  /**
   * Get cached response for Claude API
   * @param {string} cacheKey Cache key
   * @returns {Promise<Object|null>} Cached response or null if not found
   */
  async getFromCache(cacheKey) {
    try {
      const cacheDir = path.join(this.projectRoot, '.claude', 'cache');
      const cacheFile = path.join(cacheDir, `${cacheKey.replace(/[^a-zA-Z0-9]/g, '_')}.json`);

      if (await fs.pathExists(cacheFile)) {
        const cacheData = await fs.readJson(cacheFile);
        const now = Date.now();
        const cacheAge = now - cacheData.timestamp;

        // Cache expires after 24 hours
        if (cacheAge < 24 * 60 * 60 * 1000) {
          return cacheData.response;
        } else {
          // Remove expired cache
          await fs.remove(cacheFile);
        }
      }
    } catch (err) {
      this.debug(`Cache read error: ${err.message}`);
    }

    return null;
  }

  /**
   * Save response to cache for Claude API
   * @param {string} cacheKey Cache key
   * @param {Object} response Response to cache
   * @returns {Promise<void>}
   */
  async saveToCache(cacheKey, response) {
    try {
      const cacheDir = path.join(this.projectRoot, '.claude', 'cache');
      await fs.ensureDir(cacheDir);

      const cacheFile = path.join(cacheDir, `${cacheKey.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
      await fs.writeJson(cacheFile, {
        timestamp: Date.now(),
        response
      });
    } catch (err) {
      this.debug(`Cache write error: ${err.message}`);
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
   * @param {Array<string>} _args Command-line arguments
   * @returns {Promise<void>} Promise that resolves when the hook execution is complete
   */
  async execute(_args) {
    throw new Error('Hook.execute() must be implemented by subclasses');
  }

  /**
   * Set the hook configuration file path
   * @param {string} configFilePath Path to the configuration file
   */
  setConfigFile(configFilePath) {
    this.configFile = configFilePath;
  }

  /**
   * Get the current branch name
   * @returns {Promise<string>} The current branch name
   */
  async getCurrentBranch() {
    try {
      const output = this.executeCommand('git symbolic-ref --short HEAD').trim();
      return output || null;
    } catch (err) {
      this.debug(`Failed to get current branch: ${err.message}`);
      return null;
    }
  }

  /**
   * Get the diff of staged changes
   * @returns {Promise<string>} The diff of staged changes
   */
  async getStagedDiff() {
    try {
      return this.executeCommand('git diff --cached').trim();
    } catch (err) {
      this.debug(`Failed to get staged diff: ${err.message}`);
      return '';
    }
  }

  /**
   * Get the diff between two commits or refs
   * @param {string} from From commit or ref
   * @param {string} to To commit or ref
   * @returns {Promise<string>} The diff between commits
   */
  async getDiff(from, to) {
    try {
      return this.executeCommand(`git diff ${from} ${to}`).trim();
    } catch (err) {
      this.debug(`Failed to get diff between ${from} and ${to}: ${err.message}`);
      return '';
    }
  }

  /**
   * Get the list of files changed between two commits or refs
   * @param {string} from From commit or ref
   * @param {string} to To commit or ref
   * @returns {Promise<Array<string>>} The list of changed files
   */
  async getChangedFiles(from, to) {
    try {
      const output = this.executeCommand(`git diff --name-only ${from} ${to}`).trim();
      return output ? output.split('\n') : [];
    } catch (err) {
      this.debug(`Failed to get changed files between ${from} and ${to}: ${err.message}`);
      return [];
    }
  }

  /**
   * Get the list of staged files
   * @returns {Promise<Array<string>>} The list of staged files
   */
  async getStagedFiles() {
    try {
      const output = this.executeCommand('git diff --cached --name-only').trim();
      return output ? output.split('\n') : [];
    } catch (err) {
      this.debug(`Failed to get staged files: ${err.message}`);
      return [];
    }
  }

  /**
   * Get the content of a commit message from a file
   * @param {string} filePath Path to the commit message file
   * @returns {Promise<string>} The commit message
   */
  async getCommitMessage(filePath) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (err) {
      this.debug(`Failed to read commit message from ${filePath}: ${err.message}`);
      return '';
    }
  }

  /**
   * Set the content of a commit message file
   * @param {string} filePath Path to the commit message file
   * @param {string} message The commit message
   * @returns {Promise<boolean>} Whether the message was successfully written
   */
  async setCommitMessage(filePath, message) {
    try {
      await fs.writeFile(filePath, message);
      return true;
    } catch (err) {
      this.debug(`Failed to write commit message to ${filePath}: ${err.message}`);
      return false;
    }
  }

  /**
   * Get recent commits
   * @param {number} count Number of commits to retrieve
   * @returns {Promise<Array<Object>>} List of recent commits
   */
  async getRecentCommits(count = 5) {
    try {
      const output = this.executeCommand(`git log -${count} --format="%H|%an|%s"`).trim();

      if (!output) {
        return [];
      }

      return output.split('\n').map(line => {
        const [hash, author, subject] = line.split('|');
        return { hash, author, subject };
      });
    } catch (err) {
      this.debug(`Failed to get recent commits: ${err.message}`);
      return [];
    }
  }

  /**
   * Check if a hook is active for a given operation
   * @returns {Promise<boolean>} Whether the hook should execute
   */
  async shouldExecute() {
    // Base implementation always allows execution if enabled
    return this.enabled;
  }

  /**
   * Load prompt templates for this hook
   * @returns {Promise<void>}
   */
  async loadPromptTemplates() {
    try {
      const templatesPath = path.join(this.projectRoot, '.claude', 'templates', `${this.gitHookName}.json`);

      if (await fs.pathExists(templatesPath)) {
        this.promptTemplates = await fs.readJson(templatesPath);
        this.debug(`Loaded prompt templates from ${templatesPath}`);
      } else {
        this.debug(`No prompt templates found at ${templatesPath}, using defaults`);
      }
    } catch (err) {
      this.debug(`Failed to load prompt templates: ${err.message}`);
    }
  }

  /**
   * Get a prompt template for this hook
   * @param {string} templateName The template name
   * @returns {string|null} The prompt template or null if not found
   */
  getPromptTemplate(templateName) {
    return this.promptTemplates[templateName] || null;
  }

  /**
   * Format a prompt template with variables
   * @param {string} templateName The template name
   * @param {Object} variables Variables to substitute in the template
   * @returns {string} The formatted prompt
   */
  formatPrompt(templateName, variables) {
    let template = this.getPromptTemplate(templateName);

    if (!template) {
      this.debug(`Prompt template '${templateName}' not found, using fallback`);
      return this.getFallbackPrompt(templateName, variables);
    }

    // Replace template variables
    for (const [key, value] of Object.entries(variables)) {
      template = template.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return template;
  }

  /**
   * Get a fallback prompt template
   * @param {string} templateName The template name
   * @param {Object} variables Variables for the template
   * @returns {string} The fallback prompt
   */
  getFallbackPrompt(templateName, variables) {
    // Subclasses should override this to provide fallback prompts
    return `You are a Git expert. Please provide advice about ${templateName}.\n\nContext:\n${JSON.stringify(variables, null, 2)}`;
  }

  /**
   * Handle blocking based on severity and blocking mode
   * @param {string} severity The severity of the issue ('critical', 'high', 'medium', 'low')
   * @param {string} message The message to display
   * @returns {boolean} Whether to block execution
   */
  handleBlocking(severity, message) {
    const severityLevel = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    const blockLevel = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1, 'none': 0 };

    // Display the message
    if (severityLevel[severity] >= 3) {
      this.error(message);
    } else if (severityLevel[severity] >= 2) {
      this.warn(message);
    } else {
      this.info(message);
    }

    // Determine if we should block
    if (this.blockingMode === 'block' && blockLevel[severity] >= blockLevel[this.blockOnSeverity || 'high']) {
      return true;
    }

    return false;
  }
}

export default BaseHook;