/**
 * Path Configuration
 * 
 * Defines standard paths used by the application for various OSes.
 */

import os from 'os';
import path from 'path';

/**
 * Configuration paths for different platforms
 */
export interface PlatformPaths {
  mac: string;
  windows: string;
  linux: string;
}

/**
 * Project-specific paths
 */
export interface ProjectPaths {
  root: string;
  claude: string;
  roo: string;
  rooRules: string;
  vscode: string;
  mcp: string;
  mcpLocal: string;
  claudeMd: string;
  roomodes: string;
  rooignore: string;
  gitignore: string;
  env: string;
  envExample: string;
  logs: string;
  git: string;
  githubDir: string;
  githubWorkflows: string;
  husky: string;
}

// Configuration paths for Claude Code
export const claudeConfigPaths: PlatformPaths = {
  mac: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
  windows: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
  linux: path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json')
};

// VS Code user configuration paths
export const vsCodeUserConfigPaths: PlatformPaths = {
  mac: path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User'),
  windows: path.join(process.env.APPDATA || '', 'Code', 'User'),
  linux: path.join(os.homedir(), '.config', 'Code', 'User')
};

// VS Code extensions paths
export const vsCodeExtensionsPaths: PlatformPaths = {
  mac: path.join(os.homedir(), '.vscode', 'extensions'),
  windows: path.join(process.env.USERPROFILE || '', '.vscode', 'extensions'),
  linux: path.join(os.homedir(), '.vscode', 'extensions')
};

// Environment variables
export const isWindows: boolean = process.platform === 'win32';
export const isMac: boolean = process.platform === 'darwin';
export const isLinux: boolean = !isWindows && !isMac;

/**
 * Get the appropriate Claude config path based on OS
 * @returns Path to Claude config file
 */
export function getClaudeConfigPath(): string {
  if (isMac) return claudeConfigPaths.mac;
  if (isWindows) return claudeConfigPaths.windows;
  return claudeConfigPaths.linux;
}

/**
 * Get the VS Code user configuration path
 * @returns Path to VS Code user configuration
 */
export function getVSCodeUserConfigPath(): string {
  if (isMac) return vsCodeUserConfigPaths.mac;
  if (isWindows) return vsCodeUserConfigPaths.windows;
  return vsCodeUserConfigPaths.linux;
}

/**
 * Get the VS Code extensions path
 * @returns Path to VS Code extensions
 */
export function getVSCodeExtensionsPath(): string {
  if (isMac) return vsCodeExtensionsPaths.mac;
  if (isWindows) return vsCodeExtensionsPaths.windows;
  return vsCodeExtensionsPaths.linux;
}

/**
 * Get project-specific configuration paths
 * @param projectRoot Path to project root
 * @returns Project-specific paths
 */
export function getProjectPaths(projectRoot: string): ProjectPaths {
  return {
    root: projectRoot,
    claude: path.join(projectRoot, '.claude'),
    roo: path.join(projectRoot, '.roo'),
    rooRules: path.join(projectRoot, '.roo', 'rules'),
    vscode: path.join(projectRoot, '.vscode'),
    mcp: path.join(projectRoot, '.mcp.json'),
    mcpLocal: path.join(projectRoot, '.mcp.json.local'),
    claudeMd: path.join(projectRoot, 'CLAUDE.md'),
    roomodes: path.join(projectRoot, '.roomodes'),
    rooignore: path.join(projectRoot, '.rooignore'),
    gitignore: path.join(projectRoot, '.gitignore'),
    env: path.join(projectRoot, '.env'),
    envExample: path.join(projectRoot, '.env.example'),
    logs: path.join(projectRoot, '.ai-assistants', 'logs'),
    git: path.join(projectRoot, '.git'),
    githubDir: path.join(projectRoot, '.github'),
    githubWorkflows: path.join(projectRoot, '.github', 'workflows'),
    husky: path.join(projectRoot, '.husky')
  };
}

/**
 * Path utilities
 */
export const Paths = {
  claudeConfigPaths,
  vsCodeUserConfigPaths,
  vsCodeExtensionsPaths,
  isWindows,
  isMac,
  isLinux,
  getClaudeConfigPath,
  getVSCodeUserConfigPath,
  getVSCodeExtensionsPath,
  getProjectPaths
};

export default Paths;