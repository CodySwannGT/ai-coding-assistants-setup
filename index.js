#!/usr/bin/env node

/**
 * AI Coding Assistants Setup Script
 * =================================
 * 
 * This script automates the setup and configuration of AI coding assistants
 * (Claude Code and Roo Code) within VS Code for JavaScript projects.
 * 
 * Features:
 * - Automatic project structure detection
 * - Configuration of Claude Code and Roo Code
 * - MCP server setup and synchronization
 * - Ignore file management
 * - Custom mode configuration for Roo Code
 * - VS Code settings optimization
 * - Secure credential management
 * 
 * @author Cody Swann
 * @license MIT
 */

import { checkbox, confirm, input, password, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { program } from 'commander';
import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Script version
const VERSION = '1.0.0';

// Global variables
let projectRoot;
let isWindows = process.platform === 'win32';
let isMac = process.platform === 'darwin';
let isLinux = !isWindows && !isMac;
let dryRun = false;
let verbose = 1; // 0=quiet, 1=normal, 2=verbose, 3=debug
let nonInteractive = false;
let forceOverwrite = false;

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Configuration paths for Claude Code
const claudeConfigPaths = {
  mac: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
  windows: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
  linux: path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json')
};

// VS Code user configuration paths
const vsCodeUserConfigPaths = {
  mac: path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User'),
  windows: path.join(process.env.APPDATA || '', 'Code', 'User'),
  linux: path.join(os.homedir(), '.config', 'Code', 'User')
};

// VS Code extensions paths
const vsCodeExtensionsPaths = {
  mac: path.join(os.homedir(), '.vscode', 'extensions'),
  windows: path.join(process.env.USERPROFILE || '', '.vscode', 'extensions'),
  linux: path.join(os.homedir(), '.vscode', 'extensions')
};

/**
 * Get the appropriate Claude config path based on OS
 * @returns {string} Path to Claude config file
 */
function getClaudeConfigPath() {
  if (isMac) return claudeConfigPaths.mac;
  if (isWindows) return claudeConfigPaths.windows;
  return claudeConfigPaths.linux;
}

/**
 * Get the VS Code user configuration path
 * @returns {string} Path to VS Code user configuration
 */
function getVSCodeUserConfigPath() {
  if (isMac) return vsCodeUserConfigPaths.mac;
  if (isWindows) return vsCodeUserConfigPaths.windows;
  return vsCodeUserConfigPaths.linux;
}

/**
 * Get the VS Code extensions path
 * @returns {string} Path to VS Code extensions
 */
function getVSCodeExtensionsPath() {
  if (isMac) return vsCodeExtensionsPaths.mac;
  if (isWindows) return vsCodeExtensionsPaths.windows;
  return vsCodeExtensionsPaths.linux;
}

/**
 * Print a styled header
 * @param {string} text Header text
 */
function printHeader(text) {
  if (verbose >= 1) {
    console.log('\n' + chalk.bold.blue('='.repeat(80)));
    console.log(chalk.bold.blue(`  ${text}`));
    console.log(chalk.bold.blue('='.repeat(80)) + '\n');
  }
}

/**
 * Print a success message
 * @param {string} text Success message
 */
function printSuccess(text) {
  if (verbose >= 1) {
    console.log(chalk.green('✓ ') + text);
  }
}

/**
 * Print an error message
 * @param {string} text Error message
 */
function printError(text) {
  console.error(chalk.red('✗ ') + text);
}

/**
 * Print a warning message
 * @param {string} text Warning message
 */
function printWarning(text) {
  if (verbose >= 1) {
    console.warn(chalk.yellow('⚠ ') + text);
  }
}

/**
 * Print info message
 * @param {string} text Info message
 */
function printInfo(text) {
  if (verbose >= 1) {
    console.log(chalk.blue('ℹ ') + text);
  }
}

/**
 * Print debug message (only in debug mode)
 * @param {string} text Debug message
 */
function printDebug(text) {
  if (verbose >= 3) {
    console.log(chalk.gray('🔍 ') + text);
  }
}

/**
 * Find the project root (searches for package.json)
 * @returns {Promise<string>} Project root path
 */
async function findProjectRoot() {
  let currentDir = process.cwd();
  const root = path.parse(currentDir).root;
  
  while (currentDir !== root) {
    try {
      const packageJsonPath = path.join(currentDir, 'package.json');
      await fs.access(packageJsonPath);
      return currentDir;
    } catch (err) {
      // Continue searching upward
    }
    
    currentDir = path.dirname(currentDir);
  }
  
  throw new Error('Could not find a project root. Make sure you are inside a JavaScript project with a package.json file.');
}

/**
 * Detect if this is a monorepo
 * @param {string} projectRoot Project root path
 * @returns {Promise<boolean>} Whether this is a monorepo
 */
async function isMonorepo(projectRoot) {
  try {
    // Check for various monorepo indicators
    const hasTurbo = await fileExists(path.join(projectRoot, 'turbo.json'));
    const hasPnpmWorkspace = await fileExists(path.join(projectRoot, 'pnpm-workspace.yaml'));
    
    let hasWorkspacesInPackageJson = false;
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (await fileExists(packageJsonPath)) {
      const packageJson = await safeReadJson(packageJsonPath);
      hasWorkspacesInPackageJson = !!packageJson?.workspaces;
    }
    
    return hasTurbo || hasPnpmWorkspace || hasWorkspacesInPackageJson;
  } catch (err) {
    printWarning(`Error detecting monorepo: ${err.message}`);
    return false;
  }
}

/**
 * Ensure a directory exists
 * @param {string} dirPath Directory path to ensure
 */
async function ensureDirectory(dirPath) {
  if (dryRun) {
    printDebug(`Would create directory: ${dirPath}`);
    return;
  }
  
  try {
    await fs.ensureDir(dirPath);
    printDebug(`Ensured directory exists: ${dirPath}`);
  } catch (err) {
    throw new Error(`Failed to create directory ${dirPath}: ${err.message}`);
  }
}

/**
 * Check if a file exists
 * @param {string} filePath File path to check
 * @returns {Promise<boolean>} Whether the file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Safely read a JSON file, returns null if file doesn't exist
 * @param {string} filePath Path to JSON file
 * @returns {Promise<Object|null>} Parsed JSON or null
 */
async function safeReadJson(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Safely write JSON to a file
 * @param {string} filePath Path to write JSON file
 * @param {Object} data Data to write
 */
async function safeWriteJson(filePath, data) {
  if (dryRun) {
    printDebug(`Would write JSON to: ${filePath}`);
    printDebug(JSON.stringify(data, null, 2));
    return;
  }
  
  const dirPath = path.dirname(filePath);
  await ensureDirectory(dirPath);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  printDebug(`Wrote JSON to: ${filePath}`);
}

/**
 * Write text to a file
 * @param {string} filePath Path to write file
 * @param {string} content Text content to write
 */
async function writeTextFile(filePath, content) {
  if (dryRun) {
    printDebug(`Would write text to: ${filePath}`);
    return;
  }
  
  const dirPath = path.dirname(filePath);
  await ensureDirectory(dirPath);
  await fs.writeFile(filePath, content, 'utf8');
  printDebug(`Wrote text to: ${filePath}`);
}

/**
 * Safely read a text file, returns empty string if file doesn't exist
 * @param {string} filePath Path to text file
 * @returns {Promise<string>} File content or empty string
 */
async function safeReadTextFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return '';
    }
    throw err;
  }
}

/**
 * Get or generate encryption key
 * @returns {Promise<string>} Encryption key
 */
async function getEncryptionKey() {
  const keyPath = path.join(os.homedir(), '.ai-assist-key');
  try {
    const exists = await fileExists(keyPath);
    if (exists) {
      return (await fs.readFile(keyPath, 'utf8')).trim();
    } else {
      if (dryRun) {
        printDebug('Would generate new encryption key');
        return 'dry-run-encryption-key';
      }
      
      const key = crypto.randomBytes(16).toString('hex');
      await fs.writeFile(keyPath, key, { mode: 0o600 });
      return key;
    }
  } catch (err) {
    printWarning(`Failed to read or write encryption key. Using fallback method.`);
    // Fallback to a hash of the hostname and username
    return crypto.createHash('sha256')
      .update(`${os.hostname()}-${os.userInfo().username}-aiAssistKeys`)
      .digest('hex');
  }
}

/**
 * Encrypt sensitive value
 * @param {string} value Value to encrypt
 * @param {string} key Encryption key
 * @returns {string} Encrypted value
 */
function encryptValue(value, key) {
  if (dryRun) {
    return `encrypted:${value}`;
  }
  
  // This is a basic encryption for example purposes
  // In production, use a more secure method
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive value
 * @param {string} encrypted Encrypted value
 * @param {string} key Encryption key
 * @returns {string} Decrypted value
 */
function decryptValue(encrypted, key) {
  if (encrypted.startsWith('encrypted:')) {
    // Handle dry run pseudo-encryption
    return encrypted.substring(10);
  }
  
  try {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    printWarning('Failed to decrypt value. Using empty string instead.');
    return '';
  }
}

/**
 * Setup Claude Code configuration
 */
async function setupClaudeCode() {
  printHeader('Claude Code Setup');
  
  // Get Claude configuration path
  const configPath = getClaudeConfigPath();
  const configExists = await fileExists(configPath);
  
  // Read existing config or create new
  let claudeConfig = configExists 
    ? await safeReadJson(configPath) 
    : { mcpServers: {} };
  
  // Ensure basic structure
  claudeConfig.mcpServers = claudeConfig.mcpServers || {};
  
  // Get API key
  let apiKey = '';
  if (nonInteractive) {
    printInfo('Non-interactive mode: Using existing API key or environment variable');
    apiKey = process.env.ANTHROPIC_API_KEY || '';
  } else {
    const useExistingKey = configExists && await confirm({
      message: 'Use existing Anthropic API key (if available)?',
      default: true
    });
    
    if (!useExistingKey) {
      apiKey = await password({
        message: 'Enter your Anthropic API key:',
        validate: input => input.trim() ? true : 'API key is required'
      });
    }
  }
  
  // Configure memory settings
  let memoryLimit = '2048';
  if (nonInteractive) {
    memoryLimit = process.env.CLAUDE_MEMORY_LIMIT || '2048';
  } else {
    memoryLimit = await input({
      message: 'Maximum memory limit for Claude Code (in MB):',
      default: '2048'
    });
  }
  
  // Create .claude directory in project for project-specific settings
  const projectClaudeDir = path.join(projectRoot, '.claude');
  await ensureDirectory(projectClaudeDir);
  
  // Save the configuration
  if (apiKey) {
    const encryptionKey = await getEncryptionKey();
    const encryptedKey = encryptValue(apiKey, encryptionKey);

    // Store credentials in project-specific encrypted file
    await safeWriteJson(
      path.join(projectClaudeDir, 'credentials.json.enc'),
      { apiKey: encryptedKey }
    );

    // Update system config if needed
    if (!claudeConfig.apiKey) {
      claudeConfig.apiKey = encryptedKey;
    }
  }

  // Update additional settings
  claudeConfig.memoryLimit = parseInt(memoryLimit, 10);
  claudeConfig.mcpPreferences = {
    useMcpWhenAvailable: true,
    preferMcpOverInternal: true
  };

  // Create project-specific settings
  const projectSettings = {
    version: VERSION,
    projectRoot: projectRoot,
    memoryLimit: parseInt(memoryLimit, 10),
    ignoredPatterns: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".git/**",
      ".env",
      "*.log",
      "*.lock",
      ".next/**",
      "coverage/**"
    ],
    mcpPreferences: {
      useMcpWhenAvailable: true,
      preferMcpOverInternal: true
    }
  };

  await safeWriteJson(path.join(projectClaudeDir, 'settings.json'), projectSettings);

  // Get current VSCode settings to check Copilot config status
  const vscodeSettingsPath = path.join(projectRoot, '.vscode', 'settings.json');
  const vscodeSettings = await safeReadJson(vscodeSettingsPath) || {};

  // Create or update CLAUDE.md file
  await setupClaudeMd(vscodeSettings);

  // Save system config
  if (!dryRun) {
    await safeWriteJson(configPath, claudeConfig);
  }

  printSuccess('Claude Code configuration completed!');
}

/**
 * Create or update CLAUDE.md file
 * @param {Object} [vscodeSettings={}] VS Code settings object to check Copilot configuration
 */
async function setupClaudeMd(vscodeSettings = {}) {
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  const exists = await fileExists(claudeMdPath);
  
  if (exists && !forceOverwrite) {
    printInfo('CLAUDE.md already exists. Skipping creation.');
    return;
  }
  
  // Get project name from package.json
  const packageJsonPath = path.join(projectRoot, 'package.json');
  let projectName = path.basename(projectRoot);
  try {
    const packageJson = await safeReadJson(packageJsonPath);
    if (packageJson?.name) {
      projectName = packageJson.name;
    }
  } catch (err) {
    printWarning(`Could not read package.json: ${err.message}`);
  }
  
  const isMonorepoProject = await isMonorepo(projectRoot);
  const projectType = isMonorepoProject ? 'Monorepo' : 'Standard Repository';
  
  // Check if Copilot is installed
  const { installed: copilotInstalled } = await detectGitHubCopilot();

  // Create basic CLAUDE.md content
  const claudeMdContent = `# ${projectName} Project

## Overview
This is a ${projectType} project.

## MCP Tool Usage
Always check for available MCP tools before attempting to solve a problem directly.
Prioritize using MCP tools when they can help with a task - they provide enhanced
capabilities beyond your base functionality.

## Key Files
@/package.json to ./CLAUDE.md
${await fileExists(path.join(projectRoot, 'tsconfig.json')) ? '@/tsconfig.json to ./CLAUDE.md' : ''}
${isMonorepoProject && await fileExists(path.join(projectRoot, 'turbo.json')) ? '@/turbo.json to ./CLAUDE.md' : ''}

## Coding Standards
@/.roo/rules/01-coding-standards.md to ./CLAUDE.md

## Architecture Guide
@/.roo/rules/02-architecture-guide.md to ./CLAUDE.md

${copilotInstalled ? `
## GitHub Copilot Compatibility
This project is configured to ${vscodeSettings?.['github.copilot.enable'] === false ? 'disable' : 'work alongside'} GitHub Copilot.
${vscodeSettings?.['github.copilot.enable'] === false ?
  'Copilot has been disabled for this workspace to avoid conflicts with Claude and Roo.' :
  'Copilot and Claude/Roo are both active; be aware of potential conflicts with inline suggestions.'}
` : ''}
`;

  await writeTextFile(claudeMdPath, claudeMdContent);
  printSuccess('Created CLAUDE.md file');
}

/**
 * Setup Roo Code configuration
 */
async function setupRooCode() {
  printHeader('Roo Code Setup');
  
  // Roo Code stores configurations in project directories
  const rooDir = path.join(projectRoot, '.roo');
  const rooRulesDir = path.join(rooDir, 'rules');
  await ensureDirectory(rooRulesDir);
  
  // Check for existing config
  const rooConfigPath = path.join(rooDir, 'settings.json');
  const rooConfigExists = await fileExists(rooConfigPath);
  
  // Get API configurations
  let providers = ['anthropic', 'openai'];
  if (!nonInteractive) {
    providers = await checkbox({
      message: 'Select AI providers to configure:',
      choices: [
        { name: 'OpenAI (GPT-4o, etc.)', value: 'openai' },
        { name: 'Anthropic (Claude)', value: 'anthropic' },
        { name: 'Local models', value: 'local' }
      ]
    });
  }
  
  // Initialize config
  let rooConfig = {
    version: VERSION,
    providers: {}
  };
  
  // If config exists, try to load it
  if (rooConfigExists) {
    try {
      const existingConfig = await safeReadJson(rooConfigPath);
      if (existingConfig) {
        rooConfig = { ...existingConfig, version: VERSION };
      }
    } catch (err) {
      printWarning(`Could not read existing Roo config: ${err.message}`);
    }
  }
  
  // Initialize providers object if it doesn't exist
  rooConfig.providers = rooConfig.providers || {};
  
  // Get encryption key for storing API keys
  const encryptionKey = await getEncryptionKey();
  
  // Configure selected providers
  for (const provider of providers) {
    let apiKey = '';
    
    if (nonInteractive) {
      // In non-interactive mode, try to get API keys from environment variables
      if (provider === 'openai') {
        apiKey = process.env.OPENAI_API_KEY || '';
      } else if (provider === 'anthropic') {
        apiKey = process.env.ANTHROPIC_API_KEY || '';
      }
    } else {
      // In interactive mode, prompt for API keys
      apiKey = await password({
        message: `Enter your ${provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Local'} API key:`,
        validate: input => input.trim() ? true : 'API key is required'
      });
    }
    
    // Only update configuration if we have an API key
    if (apiKey) {
      const encryptedKey = encryptValue(apiKey, encryptionKey);
      
      switch (provider) {
        case 'openai':
          rooConfig.providers.openai = {
            apiKey: encryptedKey,
            models: ['gpt-4o', 'gpt-4-turbo'],
            baseUrl: 'https://api.openai.com/v1'
          };
          break;
          
        case 'anthropic':
          rooConfig.providers.anthropic = {
            apiKey: encryptedKey,
            models: ['claude-3-opus', 'claude-3-sonnet'],
            baseUrl: 'https://api.anthropic.com'
          };
          break;
          
        case 'local':
          rooConfig.providers.local = {
            baseUrl: 'http://localhost:8000',
            requiresAuth: false
          };
          break;
      }
    }
  }
  
  // Configure memory settings
  let maxTokens = '16000';
  if (nonInteractive) {
    maxTokens = process.env.ROO_MAX_TOKENS || '16000';
  } else {
    maxTokens = await input({
      message: 'Maximum tokens for Roo Code context window:',
      default: '16000'
    });
  }
  
  // Configure autoApprove settings
  let autoApprove = ['read'];
  if (!nonInteractive) {
    autoApprove = await checkbox({
      message: 'Select operations to auto-approve:',
      choices: [
        { name: 'File reads', value: 'read' },
        { name: 'File writes', value: 'write' },
        { name: 'Terminal commands', value: 'terminal' }
      ],
      default: ['read']
    });
  }
  
  // Add settings to config
  rooConfig.maxTokens = parseInt(maxTokens, 10);
  rooConfig.autoApprove = autoApprove;
  rooConfig.mcpSettings = {
    autoDetectAndUse: true,
    alwaysSuggestTools: true
  };
  
  // Save configuration
  await safeWriteJson(rooConfigPath, rooConfig);
  
  // Create standard rules files
  const createRules = nonInteractive || await confirm({
    message: 'Create standard rules for Roo Code?',
    default: true
  });
  
  if (createRules) {
    await setupRooRules(rooRulesDir);
  }
  
  // Create .rooignore file
  await setupRooIgnore();
  
  // Setup Roo MCP configuration
  await setupRooMcp();
  
  // Setup Roo modes
  await setupRooModes();
  
  printSuccess('Roo Code configuration completed!');
}

/**
 * Setup Roo Code rules
 * @param {string} rooRulesDir Path to Roo rules directory
 */
async function setupRooRules(rooRulesDir) {
  // Project coding standards
  const codingStandards = `# Coding Standards

- Always use consistent formatting across the codebase
- Follow the established naming conventions in each package
- Write clear, descriptive comments for complex logic
- Include appropriate error handling
- Write unit tests for new functionality
`;
  
  // Project architecture guide
  const architectureGuide = `# Project Architecture Guide

This project is organized as follows:

- Follow the repository's established patterns
- Use absolute imports with module aliases when available
- Keep files focused on a single responsibility
- Limit file size to maintain readability (aim for under 500 lines)
`;

  // MCP tool usage guidelines
  const mcpToolGuidelines = `# MCP Tool Usage Guidelines

1. Always check for and use MCP tools when available
2. Prioritize MCP tools over built-in capabilities when appropriate
3. Suggest MCP tools to users when they would help solve a problem
`;
  
  await writeTextFile(path.join(rooRulesDir, '01-coding-standards.md'), codingStandards);
  await writeTextFile(path.join(rooRulesDir, '02-architecture-guide.md'), architectureGuide);
  await writeTextFile(path.join(rooRulesDir, '03-mcp-tools.md'), mcpToolGuidelines);
  
  printSuccess('Created standard rules for Roo Code');
}

/**
 * Setup .rooignore file
 */
async function setupRooIgnore() {
  const rooignorePath = path.join(projectRoot, '.rooignore');
  const exists = await fileExists(rooignorePath);
  
  if (exists && !forceOverwrite) {
    printInfo('.rooignore already exists. Skipping creation.');
    return;
  }
  
  const rooignoreContent = `# Standard patterns to ignore
node_modules/
dist/
build/
.git/
.env
.env.*
*.log
.next/
.tsbuildinfo
coverage/

# Sensitive files
**/credentials.json
**/secrets.json
**/*.pem
**/*.key
`;

  await writeTextFile(rooignorePath, rooignoreContent);
  printSuccess('Created .rooignore file');
}

/**
 * Setup Roo MCP configuration
 */
async function setupRooMcp() {
  const rooMcpPath = path.join(projectRoot, '.roo', 'mcp.json');
  
  // Check if main MCP config exists
  const mcpPath = path.join(projectRoot, '.mcp.json');
  const mcpExists = await fileExists(mcpPath);

  let mcpConfig;
  if (mcpExists) {
    // Use main MCP config as a base
    mcpConfig = await safeReadJson(mcpPath);
    if (!mcpConfig) {
      mcpConfig = {
        mcpServers: {}
      };
    }
  } else {
    // Create a default config
    mcpConfig = {
      mcpServers: {}
    };
  }

  // Match Roo format to Claude format, ensuring proper formatting for memory and other servers
  const rooMcpConfig = {
    mcpServers: {}
  };

  // Clone the servers with updated formatting
  Object.entries(mcpConfig.mcpServers).forEach(([key, server]) => {
    // Create a base copy
    rooMcpConfig.mcpServers[key] = {...server};

    // Special handling for memory server to use compact args format
    if (key === 'memory' && Array.isArray(server.args)) {
      rooMcpConfig.mcpServers[key].args = ["-y", "mcp-knowledge-graph", "--memory-path", "${MEMORY_PATH}"];
    }

    // Ensure GitHub has proper env structure
    if (key === 'github') {
      rooMcpConfig.mcpServers[key].env = {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      };
    }
  });

  await safeWriteJson(rooMcpPath, rooMcpConfig);
  printSuccess('Created Roo MCP configuration');
}

/**
 * Detect if GitHub Copilot is installed in VS Code
 * @returns {Promise<{installed: boolean, path: string|null}>} Object indicating if Copilot is installed and its path
 */
async function detectGitHubCopilot() {
  printDebug('Checking for GitHub Copilot installation...');

  try {
    // Get the VS Code extensions directory
    const extensionsPath = getVSCodeExtensionsPath();

    // Check for different Copilot extension patterns
    const copilotPatterns = [
      // Main GitHub Copilot extension
      'github.copilot-*',
      // GitHub Copilot Chat
      'github.copilot-chat-*',
      // Other Copilot variants
      '*copilot*'
    ];

    // Check for Copilot in extensions directory
    for (const pattern of copilotPatterns) {
      const extensionPath = path.join(extensionsPath, pattern);
      printDebug(`Checking for Copilot extensions matching: ${extensionPath}`);

      try {
        // Use glob-like pattern to find matching directories
        const matches = await fs.readdir(extensionsPath);
        const copilotMatches = matches.filter(dir => {
          return dir.toLowerCase().includes('copilot') && dir.toLowerCase().includes('github');
        });

        if (copilotMatches.length > 0) {
          const copilotPath = path.join(extensionsPath, copilotMatches[0]);
          printDebug(`Found GitHub Copilot at: ${copilotPath}`);
          return { installed: true, path: copilotPath };
        }
      } catch (err) {
        printDebug(`Error searching for Copilot with pattern ${pattern}: ${err.message}`);
        // Continue checking other patterns
      }
    }

    // Also check in VS Code integrated extensions
    // This location is used for extensions installed directly via VS Code
    const integratedExtPaths = [
      // Possible locations for integrated extensions
      path.join(getVSCodeUserConfigPath(), '..', 'extensions'),
      // For VS Code Insiders
      path.join(getVSCodeUserConfigPath(), '..', '..', 'Code - Insiders', 'User', 'extensions')
    ];

    for (const extPath of integratedExtPaths) {
      try {
        if (await fileExists(extPath)) {
          const matches = await fs.readdir(extPath);
          const copilotMatches = matches.filter(dir => {
            return dir.toLowerCase().includes('copilot') && dir.toLowerCase().includes('github');
          });

          if (copilotMatches.length > 0) {
            const copilotPath = path.join(extPath, copilotMatches[0]);
            printDebug(`Found GitHub Copilot at integrated location: ${copilotPath}`);
            return { installed: true, path: copilotPath };
          }
        }
      } catch (err) {
        printDebug(`Error checking integrated extension path ${extPath}: ${err.message}`);
        // Continue checking other locations
      }
    }

    printDebug('GitHub Copilot not found');
    return { installed: false, path: null };
  } catch (err) {
    printWarning(`Error detecting GitHub Copilot: ${err.message}`);
    return { installed: false, path: null };
  }
}

/**
 * Setup Roo modes
 */
async function setupRooModes() {
  const roomodesPath = path.join(projectRoot, '.roomodes');
  const exists = await fileExists(roomodesPath);
  
  if (exists && !forceOverwrite) {
    printInfo('.roomodes already exists. Skipping creation.');
    return;
  }
  
  // Available modes
  const availableModes = [
    { 
      name: '🏗️ Architect (System design and architecture)',
      value: 'architect',
      config: {
        slug: "architect",
        name: "🏗️ Architect",
        roleDefinition: "You are an expert software architect specializing in designing scalable, maintainable systems. You excel at creating clear architectural diagrams, defining interfaces, and planning project structure.",
        groups: ["read", "edit", "command"],
        customInstructions: "Focus on modular design principles, separation of concerns, and clear documentation of interfaces between components."
      }
    },
    { 
      name: '🧪 TDD Developer (Test-driven development)',
      value: 'tdd',
      config: {
        slug: "tdd",
        name: "🧪 TDD Developer",
        roleDefinition: "You are a test-driven development specialist who follows a strict red-green-refactor workflow. You always write tests before implementation code.",
        groups: [
          "read", 
          ["edit", { 
            fileRegex: "\\.(test|spec)\\.(js|ts|jsx|tsx)$", 
            description: "Test files only" 
          }]
        ],
        customInstructions: "Follow the TDD workflow: 1) Write a failing test, 2) Write minimal code to make the test pass, 3) Refactor while keeping tests green. Never write implementation before tests."
      }
    },
    { 
      name: '🔒 Security Reviewer (Security audits)',
      value: 'security',
      config: {
        slug: "security",
        name: "🔒 Security Reviewer",
        roleDefinition: "You are a cybersecurity expert specializing in code review for security vulnerabilities. You analyze code for potential security issues and suggest secure alternatives.",
        groups: ["read"],
        customInstructions: "Focus on identifying: 1) Injection vulnerabilities, 2) Authentication flaws, 3) Sensitive data exposure, 4) Cross-site scripting (XSS), 5) Insecure dependencies, 6) Hard-coded credentials."
      }
    },
    { 
      name: '📝 Documentation Writer (Creating documentation)',
      value: 'docs',
      config: {
        slug: "docs",
        name: "📝 Documentation Writer",
        roleDefinition: "You are a technical writer who specializes in creating clear, comprehensive documentation for developers and users.",
        groups: [
          "read",
          ["edit", { 
            fileRegex: "\\.(md|txt|mdx)$", 
            description: "Documentation files only" 
          }]
        ],
        customInstructions: "Create documentation that is: 1) Clear and concise, 2) Well-structured with headings, 3) Includes examples, 4) Explains both 'how' and 'why', 5) Uses consistent terminology."
      }
    },
    { 
      name: '📊 Data Analyst (Data processing and visualization)',
      value: 'data',
      config: {
        slug: "data",
        name: "📊 Data Analyst",
        roleDefinition: "You are a data analyst specializing in processing, analyzing, and visualizing data to extract meaningful insights.",
        groups: ["read", "edit", "command"],
        customInstructions: "Focus on: 1) Data cleaning and preparation, 2) Statistical analysis, 3) Data visualization, 4) Interpreting results, 5) Communicating insights clearly."
      }
    },
    { 
      name: '🚀 DevOps Engineer (Infrastructure and deployment)',
      value: 'devops',
      config: {
        slug: "devops",
        name: "🚀 DevOps Engineer",
        roleDefinition: "You are a DevOps engineer specializing in infrastructure, CI/CD pipelines, and deployment automation.",
        groups: ["read", "edit", "command"],
        customInstructions: "Focus on: 1) Infrastructure as code, 2) CI/CD pipeline optimization, 3) Containerization, 4) Security best practices, 5) Monitoring and observability."
      }
    },
    { 
      name: '🔍 Code Reviewer (Code quality and standards)',
      value: 'reviewer',
      config: {
        slug: "reviewer",
        name: "🔍 Code Reviewer",
        roleDefinition: "You are a meticulous code reviewer focused on maintaining high code quality, consistency, and adherence to best practices.",
        groups: ["read"],
        customInstructions: "Focus on: 1) Code quality and readability, 2) Design patterns and architecture, 3) Performance considerations, 4) Potential bugs or edge cases, 5) Adherence to project standards."
      }
    }
  ];

  // Select modes to create
  let selectedModes = ['architect', 'tdd', 'security', 'docs'];
  if (!nonInteractive) {
    printHeader('Setting up Roo Code Custom Modes');
    
    selectedModes = await checkbox({
      message: 'Which custom modes would you like to create?',
      choices: availableModes.map(mode => ({
        name: mode.name,
        value: mode.value
      })),
      default: ['architect', 'tdd', 'security', 'docs']
    });
  }
  
  // Create modes configuration
  const modes = {
    customModes: availableModes
      .filter(mode => selectedModes.includes(mode.value))
      .map(mode => mode.config)
  };
  
  await safeWriteJson(roomodesPath, modes);
  printSuccess('Created Roo custom modes configuration');
  
  // Create mode-specific rules directories
  for (const modeValue of selectedModes) {
    const mode = availableModes.find(m => m.value === modeValue);
    if (mode) {
      const modeRulesDir = path.join(projectRoot, '.roo', `rules-${mode.value}`);
      await ensureDirectory(modeRulesDir);
      
      // Create a basic instruction file for the mode
      const instructionsContent = `# ${mode.config.name} Mode Instructions

${mode.config.customInstructions}

## Mode-Specific Guidelines

1. Follow the role definition as the primary guide for your behavior
2. Adhere to project-wide rules and coding standards
3. Use the specific tools and permissions granted to this mode
`;
      
      await writeTextFile(path.join(modeRulesDir, '01-instructions.md'), instructionsContent);
      printSuccess(`Created mode-specific rules for ${mode.config.name}`);
    }
  }
}

/**
 * Setup .gitignore for AI assistant files
 */
async function setupGitignore() {
  printHeader('Setting up .gitignore patterns');
  
  const gitignorePath = path.join(projectRoot, '.gitignore');
  let gitignoreContent = '';
  
  // Read existing gitignore if it exists
  try {
    const exists = await fileExists(gitignorePath);
    if (exists) {
      gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
    }
  } catch (err) {
    printWarning(`Could not read .gitignore: ${err.message}`);
  }
  
  // Check for patterns that should NOT be in .gitignore
  const patternsToKeep = [
    '.roo/rules/',
    '.roo/mcp.json',
    '.mcp.json',
    'CLAUDE.md',
    '.roomodes',
    '.roo/rules-'
  ];
  
  let foundIncorrectPatterns = false;
  const incorrectPatterns = [];
  
  for (const pattern of patternsToKeep) {
    if (gitignoreContent.includes(pattern)) {
      incorrectPatterns.push(pattern);
      foundIncorrectPatterns = true;
    }
  }
  
  if (foundIncorrectPatterns) {
    printWarning('The following configuration files are currently ignored but should be shared:');
    for (const pattern of incorrectPatterns) {
      printWarning(`- "${pattern}" (team-shared configuration)`);
    }
    
    let removePatterns = false;
    if (nonInteractive) {
      removePatterns = true;
    } else {
      removePatterns = await confirm({
        message: 'Would you like to remove these from .gitignore?',
        default: true
      });
    }
    
    if (removePatterns) {
      for (const pattern of incorrectPatterns) {
        // Remove the pattern, handling various formatting possibilities
        const regex = new RegExp(`(^|\\n)${pattern}.*$`, 'gm');
        gitignoreContent = gitignoreContent.replace(regex, '');
      }
    }
  }
  
  // Check for patterns that might expose sensitive files
  const sensitivePatterns = [
    '!.env',
    '!.env.example',
    '!credentials',
    '!secrets',
    '!*.key',
    '!*.pem'
  ];
  
  let foundSensitivePatterns = false;
  const sensitivePatternsFound = [];
  
  for (const pattern of sensitivePatterns) {
    if (gitignoreContent.includes(pattern)) {
      sensitivePatternsFound.push(pattern);
      foundSensitivePatterns = true;
    }
  }
  
  if (foundSensitivePatterns) {
    printWarning('The following patterns in .gitignore may cause issues:');
    for (const pattern of sensitivePatternsFound) {
      printWarning(`- "${pattern}" (may expose sensitive files)`);
    }
    
    let removePatterns = false;
    if (nonInteractive) {
      removePatterns = true;
    } else {
      removePatterns = await confirm({
        message: 'Would you like to remove these patterns?',
        default: true
      });
    }
    
    if (removePatterns) {
      for (const pattern of sensitivePatternsFound) {
        // Remove the pattern
        const regex = new RegExp(`(^|\\n)${pattern}.*$`, 'gm');
        gitignoreContent = gitignoreContent.replace(regex, '');
      }
    }
  }
  
  // Check if AI assistant patterns already exist
  if (gitignoreContent.includes('# AI Assistant files')) {
    const updatePatterns = nonInteractive || await confirm({
      message: 'AI assistant patterns already exist in .gitignore. Update them?',
      default: false
    });
    
    if (!updatePatterns) {
      printInfo('Skipping .gitignore update.');
      return;
    }
  }
  
  // Add AI assistant patterns
  const aiPatterns = `
# AI Assistant files (shared configurations)
# DO NOT ignore these files as they should be shared with the team
# .mcp.json
# .roo/mcp.json
# .roo/rules/
# CLAUDE.md
# .roomodes
# .roo/rules-*/

# AI Assistant files (sensitive/personal configurations)
.mcp.json.local
.roo/mcp.json.local
.claude/credentials.json.enc
.roo/credentials.json.enc
.ai-credentials/
.ai-credentials.json
.env
`;
  
  // Make sure .env.example is not ignored
  if (gitignoreContent.includes(".env.example")) {
    gitignoreContent = gitignoreContent.replace(/^\.env\.example$/gm, "");
    gitignoreContent = gitignoreContent.replace(/^\.env\.\*$/gm, ".env\n!.env.example");
  }

  // Check if we need to append the patterns or if they already exist
  if (!gitignoreContent.includes('# AI Assistant files')) {
    gitignoreContent += aiPatterns;
    await writeTextFile(gitignorePath, gitignoreContent);
    printSuccess('.gitignore updated with AI assistant patterns.');
  } else {
    // Replace existing patterns
    const newContent = gitignoreContent.replace(
      /# AI Assistant files(\r?\n.*?)+?(?=\r?\n\r?\n|$)/g,
      aiPatterns.trim()
    );

    await writeTextFile(gitignorePath, newContent);
    printSuccess('.gitignore patterns for AI assistants updated.');
  }

  // Create or update .env.example file
  const envExamplePath = path.join(projectRoot, '.env.example');
  const envExampleContent = `# AI Coding Assistants Environment Variables Example
# This file contains examples of required environment variables
# Make a copy of this file named .env and fill in your own values

# GitHub MCP Server
GITHUB_PERSONAL_ACCESS_TOKEN=your-github-token-here

# Context7 MCP Server
CONTEXT7_API_KEY=your-context7-key-here

# Memory MCP Server
MEMORY_PATH=/path/to/your/memory.jsonl

# Anthropic API Key (for Claude Code and Task-Master AI)
ANTHROPIC_API_KEY=your-anthropic-key-here

# OpenAI API Key (optional, for Roo Code)
OPENAI_API_KEY=your-openai-key-here
`;

  await writeTextFile(envExamplePath, envExampleContent);
  printSuccess('Created/updated .env.example file for reference.');
}

/**
 * Setup VS Code settings for AI assistants
 */
async function setupVSCodeSettings() {
  printHeader('Setting up VS Code settings');

  const vscodeDir = path.join(projectRoot, '.vscode');
  await ensureDirectory(vscodeDir);

  const settingsPath = path.join(vscodeDir, 'settings.json');
  let settings = {};

  // Read existing settings if they exist
  const settingsExist = await fileExists(settingsPath);
  if (settingsExist) {
    settings = await safeReadJson(settingsPath) || {};
  }

  // Check for GitHub Copilot installation
  const { installed: copilotInstalled, path: copilotPath } = await detectGitHubCopilot();

  if (copilotInstalled) {
    printInfo(`GitHub Copilot detected at: ${copilotPath}`);

    // Ask user if they want to disable Copilot for this workspace
    let disableCopilot = false;
    if (!nonInteractive) {
      disableCopilot = await confirm({
        message: 'GitHub Copilot detected. Would you like to disable it for this workspace to avoid conflicts?',
        default: true
      });
    }

    if (disableCopilot || nonInteractive) {
      printInfo('Configuring settings to disable GitHub Copilot for this workspace');

      // Disable GitHub Copilot
      settings['github.copilot.enable'] = false;
      settings['github.copilot.editor.enableAutoCompletions'] = false;

      // If Copilot Chat is likely installed based on the path
      if (copilotPath && copilotPath.toLowerCase().includes('chat')) {
        settings['github.copilot.chat.enabled'] = false;
      }

      printSuccess('GitHub Copilot disabled for this workspace');
    } else {
      printInfo('GitHub Copilot will remain active alongside Claude/Roo - be aware of potential conflicts');

      // Configure settings to reduce conflicts
      settings['editor.inlineSuggest.suppressSuggestions'] = false;
      settings['editor.inlineSuggest.enabled'] = true;
      settings['editor.inlineSuggest.showToolbar'] = 'always';

      // Prioritize your preferred AI assistant
      if (await confirm({
        message: 'Would you like to prioritize Claude/Roo over GitHub Copilot?',
        default: true
      })) {
        // These settings favor Claude/Roo over Copilot
        settings['github.copilot.inlineSuggest.enable'] = true;
        settings['github.copilot.inlineSuggest.count'] = 1; // Reduce suggestions from Copilot

        printSuccess('Settings configured to prioritize Claude/Roo over GitHub Copilot');
      }
    }
  } else {
    printInfo('GitHub Copilot not detected');
  }

  // Update AI assistant settings
  settings['editor.inlineSuggest.enabled'] = true;
  settings['editor.inlineSuggest.showToolbar'] = 'always';

  // Claude settings
  settings['claude.enableAutoCompletion'] = true;

  // Roo Code settings
  settings['rooCode.useIgnoreFiles'] = true;
  settings['rooCode.autoApproveReads'] = true;

  // Git settings related to AI
  settings['git.ignoreLimitWarning'] = true;

  await safeWriteJson(settingsPath, settings);
  printSuccess('VS Code settings updated for AI assistants.');

  // Update extensions.json to recommend required extensions
  const extensionsPath = path.join(vscodeDir, 'extensions.json');
  let extensions = {};

  // Read existing extensions if they exist
  const extensionsExist = await fileExists(extensionsPath);
  if (extensionsExist) {
    extensions = await safeReadJson(extensionsPath) || {};
  }

  // Add recommended extensions
  extensions.recommendations = extensions.recommendations || [];
  const recommendedExtensions = [
    'anthropic.claude-code',
    'roo.roo-code',
    'aaron-bond.better-comments',
    'dbaeumer.vscode-eslint',
    'esbenp.prettier-vscode',
    'editorconfig.editorconfig'
  ];

  // Add extensions that aren't already recommended
  for (const ext of recommendedExtensions) {
    if (!extensions.recommendations.includes(ext)) {
      extensions.recommendations.push(ext);
    }
  }

  // If Copilot is installed, add a note about potential conflicts
  if (copilotInstalled) {
    extensions.unwantedRecommendations = extensions.unwantedRecommendations || [];
    if (!extensions.unwantedRecommendations.includes('github.copilot')) {
      extensions.unwantedRecommendations.push('github.copilot');
    }
    if (!extensions.unwantedRecommendations.includes('github.copilot-chat')) {
      extensions.unwantedRecommendations.push('github.copilot-chat');
    }
  }

  await safeWriteJson(extensionsPath, extensions);
  printSuccess('VS Code extensions recommendations updated.');
}

/**
 * Setup or update MCP configuration
 */
async function setupMcpConfig() {
  printHeader('Configuring MCP servers');
  
  const mcpPath = path.join(projectRoot, '.mcp.json');
  const exists = await fileExists(mcpPath);
  
  let mcpConfig = {};
  if (exists) {
    mcpConfig = await safeReadJson(mcpPath) || {};
  }
  
  // Default servers
  const defaultServers = ['github', 'context7', 'memory', 'taskmaster-ai'];
  
  // Available servers
  const availableServers = [
    { name: 'github (Repository awareness)', value: 'github' },
    { name: 'context7 (Code understanding)', value: 'context7' },
    { name: 'memory (Knowledge persistence)', value: 'memory' },
    { name: 'taskmaster-ai (Task management)', value: 'taskmaster-ai' },
    { name: 'jira (Task integration)', value: 'jira' },
    { name: 'playwright (Testing automation)', value: 'playwright' },
    { name: 'fetch (API communication)', value: 'fetch' },
    { name: 'browser (Web content retrieval)', value: 'browser' }
  ];
  
  // Select servers
  let selectedServers = defaultServers;
  if (!nonInteractive) {
    selectedServers = await checkbox({
      message: 'Select MCP servers to configure:',
      choices: availableServers,
      default: defaultServers
    });
  }
  
  // Get repository info if github is selected
  let github = {};
  if (selectedServers.includes('github')) {
    try {
      // Try to detect repository info from git
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)(\.git)?$/);
      
      if (match) {
        const [, owner, repo] = match;
        github = {
          owner,
          repo,
          branch: 'main'
        };
      }
    } catch (err) {
      printWarning('Could not detect GitHub repository information. Using defaults.');
      
      if (!nonInteractive) {
        const owner = await input({
          message: 'Enter GitHub repository owner/organization:',
          default: 'owner'
        });
        
        const repo = await input({
          message: 'Enter GitHub repository name:',
          default: 'repo'
        });
        
        github = {
          owner,
          repo,
          branch: 'main'
        };
      } else {
        github = {
          owner: 'owner',
          repo: 'repo',
          branch: 'main'
        };
      }
    }
  }
  
  // Build server configurations with proper MCP format
  const serverConfigs = {};

  // Save personal config values for .env or local override
  const personalConfig = { env: {} };

  // Configure github
  if (selectedServers.includes('github')) {
    // Shared config with placeholder
    serverConfigs.github = {
      command: 'docker',
      args: [
        'run',
        '-i',
        '--rm',
        '-e',
        'GITHUB_PERSONAL_ACCESS_TOKEN',
        'ghcr.io/github/github-mcp-server'
      ],
      env: {}
    };

    // Ask for personal GitHub token if in interactive mode
    if (!nonInteractive) {
      const githubToken = await password({
        message: 'Enter your GitHub Personal Access Token:',
        validate: input => input.trim() ? true : 'Token is required for GitHub MCP server'
      });

      if (githubToken) {
        personalConfig.env.GITHUB_PERSONAL_ACCESS_TOKEN = githubToken;
      }
    } else {
      // In non-interactive mode, try to get from environment
      const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
      if (token) {
        personalConfig.env.GITHUB_PERSONAL_ACCESS_TOKEN = token;
      }
    }
  }

  // Configure context7
  if (selectedServers.includes('context7')) {
    // Shared config with placeholder
    serverConfigs['context7-mcp'] = {
      command: 'npx',
      args: [
        '-y',
        '@upstash/context7-mcp@latest'
      ],
      env: {}
    };

    // Ask for Context7 API key
    if (!nonInteractive) {
      const context7Key = await password({
        message: 'Enter your Context7 API key:',
        validate: input => input.trim() ? true : 'API key is required for Context7'
      });

      if (context7Key) {
        personalConfig.env.CONTEXT7_API_KEY = context7Key;
      }
    } else {
      const key = process.env.CONTEXT7_API_KEY;
      if (key) {
        personalConfig.env.CONTEXT7_API_KEY = key;
      }
    }

    // Add the environment variable to the server config
    serverConfigs['context7-mcp'].env = {
      CONTEXT7_API_KEY: '${CONTEXT7_API_KEY}'
    };
  }

  // Configure memory
  if (selectedServers.includes('memory')) {
    // Default memory path
    const defaultMemoryPath = path.join(os.homedir(), 'workspace/db/memory.jsonl');

    // Shared config with placeholder
    serverConfigs.memory = {
      command: 'npx',
      args: [
        '-y',
        'mcp-knowledge-graph',
        '--memory-path',
        '${MEMORY_PATH}'
      ],
      autoapprove: [
        'create_entities',
        'create_relations',
        'add_observations',
        'delete_entities',
        'delete_observations',
        'delete_relations',
        'read_graph',
        'search_nodes',
        'open_nodes'
      ]
    };

    // Ask for custom memory path
    if (!nonInteractive) {
      const memoryPath = await input({
        message: 'Enter path for memory storage:',
        default: defaultMemoryPath
      });

      if (memoryPath) {
        personalConfig.env.MEMORY_PATH = memoryPath;
      }
    } else {
      personalConfig.env.MEMORY_PATH = process.env.MEMORY_PATH || defaultMemoryPath;
    }
  }

  // Configure taskmaster-ai
  if (selectedServers.includes('taskmaster-ai')) {
    // Shared config without sensitive info
    serverConfigs['task-master-ai'] = {
      command: 'npx',
      args: [
        '-y',
        '--package=task-master-ai',
        'task-master-ai'
      ],
      env: {}
    };

    // Use Anthropic API key from earlier prompt or environment
    personalConfig.env.ANTHROPIC_API_KEY = apiKey || process.env.ANTHROPIC_API_KEY || '';

    // Create personal env config for taskmaster
    if (personalConfig.env.ANTHROPIC_API_KEY) {
      if (!personalConfig.mcpServers) {
        personalConfig.mcpServers = {};
      }

      if (!personalConfig.mcpServers['task-master-ai']) {
        personalConfig.mcpServers['task-master-ai'] = {
          env: {
            ANTHROPIC_API_KEY: personalConfig.env.ANTHROPIC_API_KEY
          }
        };
      }
    }
  }

  // Configure fetch
  if (selectedServers.includes('fetch')) {
    serverConfigs.fetch = {
      command: 'uvx',
      args: ['mcp-server-fetch']
    };
  }
  
  // Set MCP configuration directly
  mcpConfig.mcpServers = { ...serverConfigs };

  await safeWriteJson(mcpPath, mcpConfig);
  printSuccess('MCP servers configured.');
  
  // Create local override file
  const createLocalOverride = nonInteractive ? false : await confirm({
    message: 'Create local MCP override file (for personal configurations)?',
    default: true
  });

  if (createLocalOverride) {
    const mcpLocalPath = path.join(projectRoot, '.mcp.json.local');
    const mcpLocalExists = await fileExists(mcpLocalPath);

    if (!mcpLocalExists || forceOverwrite) {
      // Clone the main MCP config structure for local override
      const localConfig = {
        mcpServers: JSON.parse(JSON.stringify(mcpConfig.mcpServers)) // Deep clone
      };

      // For GitHub server, add personal token to env
      if (selectedServers.includes('github') && personalConfig.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
        if (!localConfig.mcpServers.github) {
          localConfig.mcpServers.github = {
            command: 'docker',
            args: [
              'run',
              '-i',
              '--rm',
              '-e',
              'GITHUB_PERSONAL_ACCESS_TOKEN',
              'ghcr.io/github/github-mcp-server'
            ],
            env: {}
          };
        }
        localConfig.mcpServers.github.env = localConfig.mcpServers.github.env || {};
        localConfig.mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN = personalConfig.env.GITHUB_PERSONAL_ACCESS_TOKEN;
      }

      // For Context7, set the API key directly in env
      if (selectedServers.includes('context7') && personalConfig.env.CONTEXT7_API_KEY) {
        if (localConfig.mcpServers['context7-mcp']) {
          localConfig.mcpServers['context7-mcp'].env = localConfig.mcpServers['context7-mcp'].env || {};
          localConfig.mcpServers['context7-mcp'].env.CONTEXT7_API_KEY = personalConfig.env.CONTEXT7_API_KEY;
        }
      }

      // For Memory MCP, update the path
      if (selectedServers.includes('memory') && personalConfig.env.MEMORY_PATH) {
        if (localConfig.mcpServers.memory) {
          const args = localConfig.mcpServers.memory.args;
          const pathIndex = args.indexOf('--memory-path');
          if (pathIndex >= 0 && pathIndex < args.length - 1) {
            args[pathIndex + 1] = personalConfig.env.MEMORY_PATH;
          }
        }
      }

      // For Task-Master-AI, set the Anthropic API key
      if (selectedServers.includes('taskmaster-ai') && personalConfig.env.ANTHROPIC_API_KEY) {
        if (!localConfig.mcpServers['task-master-ai']) {
          localConfig.mcpServers['task-master-ai'] = {
            command: 'npx',
            args: [
              '-y',
              '--package=task-master-ai',
              'task-master-ai'
            ],
            env: {}
          };
        }
        localConfig.mcpServers['task-master-ai'].env = localConfig.mcpServers['task-master-ai'].env || {};
        localConfig.mcpServers['task-master-ai'].env.ANTHROPIC_API_KEY = personalConfig.env.ANTHROPIC_API_KEY;
      }

      // Create .env file with environment variables
      let envContent = '';
      for (const [key, value] of Object.entries(personalConfig.env)) {
        envContent += `${key}=${value}\n`;
      }

      if (envContent) {
        await writeTextFile(path.join(projectRoot, '.env'), envContent);
        printSuccess('Created .env file with personal configuration.');
      }

      await safeWriteJson(mcpLocalPath, localConfig);
      printSuccess('Created local MCP override file with personal configuration.');
    } else {
      printInfo('Local MCP override file already exists. Skipping creation.');
    }
  }
  
  // Update Roo MCP configuration
  await setupRooMcp();
}

/**
 * Main function to run the setup
 */
async function main() {
  try {
    console.log(chalk.bold.green('\nAI Coding Assistants Setup Script\n'));
    
    // Process command line arguments
    program
      .name('ai-assistant-setup')
      .description('Setup AI coding assistants (Claude Code and Roo Code) for your project')
      .version(VERSION)
      .option('--dry-run', 'Show what would be done without making changes', false)
      .option('-v, --verbose [level]', 'Verbosity level (0-3)', (val) => parseInt(val) || 1, 1)
      .option('-n, --non-interactive', 'Run in non-interactive mode with defaults', false)
      .option('-f, --force', 'Force overwrite of existing configurations', false)
      .parse(process.argv);
    
    const options = program.opts();
    dryRun = options.dryRun;
    verbose = options.verbose;
    nonInteractive = options.nonInteractive;
    forceOverwrite = options.force;
    
    if (dryRun) {
      printInfo('Running in dry-run mode. No changes will be made.');
    }
    
    if (nonInteractive) {
      printInfo('Running in non-interactive mode with defaults.');
    }
    
    // Find project root
    projectRoot = await findProjectRoot();
    printInfo(`Found project at: ${projectRoot}`);
    
    // Detect if this is a monorepo
    const isMonorepoProject = await isMonorepo(projectRoot);
    printInfo(`Detected project type: ${isMonorepoProject ? 'Monorepo' : 'Standard Repository'}`);
    
    // Setup logging
    const logsDir = path.join(projectRoot, '.ai-assistants', 'logs');
    await ensureDirectory(logsDir);
    
    if (!dryRun) {
      logger.add(
        new winston.transports.File({
          filename: path.join(logsDir, 'setup.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }
    
    // Get setup type
    let setupType = 'both';
    if (!nonInteractive) {
      setupType = await select({
        message: 'What would you like to do?',
        choices: [
          { value: 'both', name: 'Setup both Claude Code and Roo Code' },
          { value: 'claude', name: 'Setup only Claude Code' },
          { value: 'roo', name: 'Setup only Roo Code' },
          { value: 'update', name: 'Update existing configurations' }
        ]
      });
    }
    
    // Configure MCP servers - do this first as both assistants need it
    await setupMcpConfig();
    
    // Perform setup based on selection
    if (['both', 'claude', 'update'].includes(setupType)) {
      await setupClaudeCode();
    }
    
    if (['both', 'roo', 'update'].includes(setupType)) {
      await setupRooCode();
    }
    
    // Setup .gitignore patterns
    await setupGitignore();
    
    // Setup VS Code settings
    await setupVSCodeSettings();
    
    printHeader('Setup Complete!');
    console.log(chalk.green('Your project is now configured to use AI coding assistants.'));
    console.log(chalk.blue('\nManual steps required:'));
    console.log('1. Install the Claude extension for VS Code');
    console.log('2. Install the Roo Code extension for VS Code');
    console.log('3. Restart VS Code to apply the settings');
    
    if (setupType === 'claude' || setupType === 'both') {
      console.log('\nTo use Claude Code in terminal:');
      console.log('  $ npx @anthropic/claude-code');
    }
    
    console.log('\nThank you for using the AI Coding Assistants Setup Script!');
    
  } catch (err) {
    printError(`Error: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  }
}

// Run the main function
main();
