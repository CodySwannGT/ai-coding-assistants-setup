/**
 * Claude Code Configuration
 * 
 * Functions for configuring Claude Code settings.
 */

import path from 'path';
import { fileExists, safeReadJson, safeWriteJson, ensureDirectory, isMonorepo, writeTextFile } from '../utils/file.js';
import { getClaudeConfigPath } from '../config/paths.js';
import { getEncryptionKey, encryptValue } from '../utils/encryption.js';
import { printHeader, printInfo, printSuccess } from '../utils/logger.js';
import { detectGitHubCopilot } from './vscode.js';

/**
 * Create or update CLAUDE.md file
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {Object} [options.vscodeSettings={}] VS Code settings object to check Copilot configuration
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @param {boolean} [options.forceOverwrite=false] Whether to force overwrite of existing configurations
 * @returns {Promise<void>}
 */
export async function setupClaudeMd(options) {
  const { 
    projectRoot,
    vscodeSettings = {},
    dryRun = false,
    forceOverwrite = false
  } = options;
  
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
    printInfo(`Could not read package.json: ${err.message}`);
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
` : ''}`;

  await writeTextFile(claudeMdPath, claudeMdContent, dryRun);
  printSuccess('Created CLAUDE.md file');
}

/**
 * Setup Claude Code configuration
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @param {boolean} [options.nonInteractive=false] Whether to run in non-interactive mode
 * @param {Function} [options.password] Function to prompt for password
 * @param {Function} [options.input] Function to prompt for input
 * @param {Function} [options.confirm] Function to confirm user choices
 * @returns {Promise<void>}
 */
export async function setupClaudeCode(options) {
  const { 
    projectRoot, 
    dryRun = false, 
    nonInteractive = false,
    password = async () => '',
    input = async () => '',
    confirm = async () => true
  } = options;
  
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
  await ensureDirectory(projectClaudeDir, dryRun);
  
  // Save the configuration
  if (apiKey) {
    const encryptionKey = await getEncryptionKey(dryRun);
    const encryptedKey = encryptValue(apiKey, encryptionKey, dryRun);

    // Store credentials in project-specific encrypted file
    await safeWriteJson(
      path.join(projectClaudeDir, 'credentials.json.enc'),
      { apiKey: encryptedKey },
      dryRun
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
    version: '1.0.0',
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

  await safeWriteJson(path.join(projectClaudeDir, 'settings.json'), projectSettings, dryRun);

  // Get current VSCode settings to check Copilot config status
  const vscodeSettingsPath = path.join(projectRoot, '.vscode', 'settings.json');
  const vscodeSettings = await safeReadJson(vscodeSettingsPath) || {};

  // Create or update CLAUDE.md file
  await setupClaudeMd({
    projectRoot,
    vscodeSettings,
    dryRun,
    forceOverwrite: false
  });

  // Save system config
  if (!dryRun) {
    await safeWriteJson(configPath, claudeConfig);
  }

  printSuccess('Claude Code configuration completed!');
  
  return { apiKey };
}

export default {
  setupClaudeCode,
  setupClaudeMd
};