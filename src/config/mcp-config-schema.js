/**
 * MCP Configuration Schema
 * 
 * Provides schema validation for MCP server configurations.
 */

import _fs from 'fs-extra';
import _path from 'path';
import Ajv from 'ajv';
import configSchema from './config-schema.json' assert { type: 'json' };
import { printWarning } from '../utils/logger.js';

// Initialize Ajv
const ajv = new Ajv({ allErrors: true });
const validateConfig = ajv.compile(configSchema);

/**
 * Validate MCP server configuration against schema
 * @param {Object} config MCP server configuration
 * @returns {boolean} Whether the configuration is valid
 */
export function validateMcpConfig(config) {
  const valid = validateConfig(config);
  if (!valid) {
    printWarning('MCP configuration validation failed:');
    validateConfig.errors.forEach(error => {
      printWarning(`- ${error.instancePath}: ${error.message}`);
    });
  }
  return valid;
}

/**
 * Get StackOverflow MCP schema
 * @returns {Object} StackOverflow MCP schema
 */
export function getStackOverflowMcpSchema() {
  return configSchema.definitions.stackoverflowMcp;
}

/**
 * Get Command Shell MCP schema
 * @returns {Object} Command Shell MCP schema
 */
export function getCommandShellMcpSchema() {
  return configSchema.definitions.commandShellMcp;
}

/**
 * Get default StackOverflow MCP configuration
 * @returns {Object} Default StackOverflow MCP configuration
 */
export function getDefaultStackOverflowMcpConfig() {
  return {
    command: 'npx',
    args: [
      '-y',
      'stackoverflow-mcp-server'
    ],
    env: {
      MAX_SEARCH_RESULTS: '5',
      SEARCH_TIMEOUT_MS: '5000',
      INCLUDE_CODE_SNIPPETS: 'true',
      PREFER_ACCEPTED_ANSWERS: 'true'
    }
  };
}

/**
 * Get default Command Shell MCP configuration
 * @returns {Object} Default Command Shell MCP configuration
 */
export function getDefaultCommandShellMcpConfig() {
  return {
    command: 'npx',
    args: [
      '-y',
      'command-shell-mcp-server'
    ],
    env: {
      ALLOWED_COMMANDS: '',
      BLOCKED_COMMANDS: 'rm,sudo,chmod,chown,dd,mkfs,mount,umount,reboot,shutdown',
      COMMAND_TIMEOUT_MS: '5000',
      LOG_COMMANDS: 'true',
      ENABLE_ENVIRONMENT_VARIABLES: 'false'
    }
  };
}

export default {
  validateMcpConfig,
  getStackOverflowMcpSchema,
  getCommandShellMcpSchema,
  getDefaultStackOverflowMcpConfig,
  getDefaultCommandShellMcpConfig
};