/**
 * Integrations Index
 *
 * Export all integration modules from a single entry point.
 */

export * from './vscode.js';
export * from './claude-config.js';
export * from './git.js';
export * from './mcp-config.js';
export * from './roo-config.js';
export * from './uninstall.js';

import vscode from './vscode.js';
import claudeConfig from './claude-config.js';
import git from './git.js';
import mcpConfig from './mcp-config.js';
import rooConfig from './roo-config.js';
import uninstall from './uninstall.js';

export default {
  ...vscode,
  ...claudeConfig,
  ...git,
  ...mcpConfig,
  ...rooConfig,
  ...uninstall
};