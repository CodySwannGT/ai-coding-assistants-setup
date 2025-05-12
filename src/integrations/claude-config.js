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

  // Check for test-first development preference
  const sharedPrefsPath = path.join(projectRoot, '.ai-assistants', 'shared-preferences.json');
  let testFirstEnabled = false;

  if (await fileExists(sharedPrefsPath)) {
    try {
      const sharedPrefs = await safeReadJson(sharedPrefsPath);
      testFirstEnabled = sharedPrefs?.codingPreferences?.testFirstDevelopment === true;
    } catch (err) {
      printInfo(`Could not read shared preferences: ${err.message}`);
    }
  }

  // Check for available Roo modes
  const roomodesPath = path.join(projectRoot, '.roomodes');
  let availableRooModes = [];

  if (await fileExists(roomodesPath)) {
    try {
      const roomodes = await safeReadJson(roomodesPath);
      if (roomodes?.customModes && Array.isArray(roomodes.customModes)) {
        availableRooModes = roomodes.customModes.map(mode => ({
          slug: mode.slug,
          name: mode.name
        }));
      }
    } catch (err) {
      printInfo(`Could not read Roo modes: ${err.message}`);
    }
  }

  // Generate mode sections based on available Roo modes
  const generateModeSection = async (mode) => {
    const modePath = path.join(projectRoot, '.roo', `rules-${mode.slug}`, '01-instructions.md');
    const modeExists = await fileExists(modePath);

    if (modeExists) {
      return `## ${mode.name} Mode
When the user requests ${mode.slug.replace('tdd', 'test-driven development').replace('docs', 'documentation')} related tasks, use these instructions:
@/.roo/rules-${mode.slug}/01-instructions.md to ./CLAUDE.md
`;
    }
    return '';
  };

  // Generate mode sections
  const modeInstructions = await Promise.all(
    availableRooModes.map(mode => generateModeSection(mode))
  );

  // Create basic CLAUDE.md content
  const claudeMdContent = `# ${projectName} Project

## Overview
This is a ${projectType} project.

## MCP Tool Usage
Always check for available MCP tools before attempting to solve a problem directly.
Prioritize using MCP tools when they can help with a task - they provide enhanced
capabilities beyond your base functionality.
@/.roo/rules/03-mcp-tools.md to ./CLAUDE.md

## Key Files
@/package.json to ./CLAUDE.md
@/README.md to ./CLAUDE.md
${await fileExists(path.join(projectRoot, 'tsconfig.json')) ? '@/tsconfig.json to ./CLAUDE.md' : ''}
${isMonorepoProject && await fileExists(path.join(projectRoot, 'turbo.json')) ? '@/turbo.json to ./CLAUDE.md' : ''}

## Coding Standards
@/.roo/rules/01-coding-standards.md to ./CLAUDE.md

## Architecture Guide
@/.roo/rules/02-architecture-guide.md to ./CLAUDE.md

${testFirstEnabled && !modeInstructions.some(s => s.includes('TDD Developer')) ? `
## Test-First Development
This project uses test-first development practices:
- Always ask if the user wants to write tests first for new code
- Suggest writing failing tests before implementation code
- Prioritize test coverage for all new features and bug fixes
- When implementing a feature, first discuss the testing approach
` : ''}

${modeInstructions.join('\n')}

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
  
  // Get API key from environment or options
  let apiKey = options.env?.ANTHROPIC_API_KEY || '';

  // Only prompt if not present in environment and not in non-interactive mode
  if (!apiKey && !nonInteractive) {
    printInfo('No Anthropic API key found in environment, prompting for input');
    apiKey = await password({
      message: 'Enter your Anthropic API key:',
      validate: input => input.trim() ? true : 'API key is required'
    });
  } else if (nonInteractive) {
    printInfo('Non-interactive mode: Using existing API key or environment variable');
    apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
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

    // Make sure we return the API key so other components can use it
    if (!options.env) {
      options.env = {};
    }
    options.env.ANTHROPIC_API_KEY = apiKey;
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
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**',
      '.env',
      '*.log',
      '*.lock',
      '.next/**',
      'coverage/**'
    ],
    mcpPreferences: {
      useMcpWhenAvailable: true,
      preferMcpOverInternal: true
    }
  };

  // Check for shared preferences to include
  const sharedPrefsPath = path.join(projectRoot, '.ai-assistants', 'shared-preferences.json');
  if (await fileExists(sharedPrefsPath)) {
    try {
      const sharedPrefs = await safeReadJson(sharedPrefsPath);
      if (sharedPrefs?.codingPreferences?.testFirstDevelopment) {
        projectSettings.codingPreferences = {
          ...projectSettings.codingPreferences,
          testFirstDevelopment: true,
          askAboutTestsWhenCoding: true
        };
      }
    } catch (err) {
      printInfo(`Could not read shared preferences: ${err.message}`);
    }
  }

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

  return {
    apiKey,
    env: options.env
  };
}

export default {
  setupClaudeCode,
  setupClaudeMd
};