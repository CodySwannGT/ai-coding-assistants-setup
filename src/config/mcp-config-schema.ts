/**
 * MCP Configuration Schema
 * 
 * Provides schema validation for MCP server configurations.
 */

import fs from 'fs-extra';
import path from 'path';
import Ajv from 'ajv';
import { Feedback } from '../utils/feedback';

// Import JSON schemas
import configSchemaJson from './config-schema.json';

/**
 * MCP server configuration
 */
export interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  autoapprove?: string[];
}

/**
 * GitHub MCP configuration
 */
export interface GithubMcpConfig extends McpServerConfig {
  env?: {
    GITHUB_PERSONAL_ACCESS_TOKEN?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Context7 MCP configuration
 */
export interface Context7McpConfig extends McpServerConfig {
  env?: {
    CONTEXT7_API_KEY?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Memory MCP configuration
 */
export interface MemoryMcpConfig extends McpServerConfig {
  args: string[]; // Should include --memory-path parameter
}

/**
 * TaskMaster AI MCP configuration
 */
export interface TaskMasterAiMcpConfig extends McpServerConfig {
  env?: {
    ANTHROPIC_API_KEY?: string;
    [key: string]: string | undefined;
  };
}

/**
 * StackOverflow MCP configuration
 */
export interface StackOverflowMcpConfig extends McpServerConfig {
  env?: {
    STACKEXCHANGE_API_KEY?: string;
    MAX_SEARCH_RESULTS?: string;
    SEARCH_TIMEOUT_MS?: string;
    INCLUDE_CODE_SNIPPETS?: string;
    PREFER_ACCEPTED_ANSWERS?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Command Shell MCP configuration
 */
export interface CommandShellMcpConfig extends McpServerConfig {
  env?: {
    ALLOWED_COMMANDS?: string;
    BLOCKED_COMMANDS: string;
    COMMAND_TIMEOUT_MS: string;
    WORKING_DIRECTORY?: string;
    LOG_COMMANDS?: string;
    ENABLE_ENVIRONMENT_VARIABLES?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Brave Search MCP configuration
 */
export interface BraveSearchMcpConfig extends McpServerConfig {
  env: {
    BRAVE_API_KEY: string;
    [key: string]: string;
  };
}

/**
 * Complete MCP configuration with all server types
 */
export interface McpConfig {
  mcpServers?: {
    [key: string]: McpServerConfig;
  };
}

// Initialize Ajv for schema validation
const ajv = new Ajv({ allErrors: true });
const validateConfig = ajv.compile(configSchemaJson);

/**
 * Validate MCP server configuration against schema
 * 
 * @param config MCP server configuration
 * @returns Whether the configuration is valid
 */
export function validateMcpConfig(config: McpConfig): boolean {
  const valid = validateConfig(config);
  if (!valid && validateConfig.errors) {
    Feedback.warning('MCP configuration validation failed:');
    validateConfig.errors.forEach(error => {
      Feedback.warning(`- ${error.instancePath}: ${error.message}`);
    });
  }
  return !!valid;
}

/**
 * Get default StackOverflow MCP configuration
 * @returns Default StackOverflow MCP configuration
 */
export function getDefaultStackOverflowMcpConfig(): StackOverflowMcpConfig {
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
 * Get default Brave Search MCP configuration
 * @returns Default Brave Search MCP configuration
 */
export function getDefaultBraveSearchMcpConfig(): BraveSearchMcpConfig {
  return {
    command: 'npx',
    args: [
      '-y',
      'brave-search-mcp-server'
    ],
    env: {
      BRAVE_API_KEY: '${BRAVE_API_KEY}'
    }
  };
}

/**
 * Get default Command Shell MCP configuration
 * @returns Default Command Shell MCP configuration
 */
export function getDefaultCommandShellMcpConfig(): CommandShellMcpConfig {
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

/**
 * Get a schema definition by name
 * @param schemaName Name of the schema to retrieve
 * @returns Schema definition or undefined if not found
 */
export function getSchemaDefinition(schemaName: string): any {
  if (configSchemaJson.definitions && schemaName in configSchemaJson.definitions) {
    return configSchemaJson.definitions[schemaName];
  }
  return undefined;
}

/**
 * MCP schema utilities
 */
export const McpSchema = {
  validateMcpConfig,
  getDefaultStackOverflowMcpConfig,
  getDefaultBraveSearchMcpConfig,
  getDefaultCommandShellMcpConfig,
  getSchemaDefinition
};

export default McpSchema;