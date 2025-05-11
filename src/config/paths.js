/**
 * Path Configuration
 * 
 * Defines standard paths used by the application for various OSes.
 */

import os from 'os';
import path from 'path';

// Configuration paths for Claude Code
export const claudeConfigPaths = {
  mac: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
  windows: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
  linux: path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json')
};

// VS Code user configuration paths
export const vsCodeUserConfigPaths = {
  mac: path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User'),
  windows: path.join(process.env.APPDATA || '', 'Code', 'User'),
  linux: path.join(os.homedir(), '.config', 'Code', 'User')
};

// VS Code extensions paths
export const vsCodeExtensionsPaths = {
  mac: path.join(os.homedir(), '.vscode', 'extensions'),
  windows: path.join(process.env.USERPROFILE || '', '.vscode', 'extensions'),
  linux: path.join(os.homedir(), '.vscode', 'extensions')
};

// Environment variables
export const isWindows = process.platform === 'win32';
export const isMac = process.platform === 'darwin';
export const isLinux = !isWindows && !isMac;

/**
 * Get the appropriate Claude config path based on OS
 * @returns {string} Path to Claude config file
 */
export function getClaudeConfigPath() {
  if (isMac) return claudeConfigPaths.mac;
  if (isWindows) return claudeConfigPaths.windows;
  return claudeConfigPaths.linux;
}

/**
 * Get the VS Code user configuration path
 * @returns {string} Path to VS Code user configuration
 */
export function getVSCodeUserConfigPath() {
  if (isMac) return vsCodeUserConfigPaths.mac;
  if (isWindows) return vsCodeUserConfigPaths.windows;
  return vsCodeUserConfigPaths.linux;
}

/**
 * Get the VS Code extensions path
 * @returns {string} Path to VS Code extensions
 */
export function getVSCodeExtensionsPath() {
  if (isMac) return vsCodeExtensionsPaths.mac;
  if (isWindows) return vsCodeExtensionsPaths.windows;
  return vsCodeExtensionsPaths.linux;
}

/**
 * Get project-specific configuration paths
 * @param {string} projectRoot Path to project root
 * @returns {Object} Project-specific paths
 */
export function getProjectPaths(projectRoot) {
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
    git: path.join(projectRoot, '.git')
  };
}

export default {
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