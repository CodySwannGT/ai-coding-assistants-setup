/**
 * Tests for MCP configuration schema validation
 */
import { jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';

// Modules to test
import { 
  validateMcpConfig, 
  getDefaultStackOverflowMcpConfig, 
  getDefaultCommandShellMcpConfig 
} from '../src/config/mcp-config-schema.js';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('../src/utils/logger.js', () => ({
  printInfo: jest.fn(),
  printSuccess: jest.fn(),
  printError: jest.fn(),
  printWarning: jest.fn()
}));

describe('MCP Config Schema', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementations
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue('{}');
  });
  
  describe('validateMcpConfig', () => {
    test('validates a valid MCP configuration', () => {
      // Setup
      const validConfig = {
        mcpServers: {
          stackoverflow: {
            command: 'npx',
            args: ['-y', 'stackoverflow-mcp-server'],
            env: {
              MAX_SEARCH_RESULTS: '5',
              SEARCH_TIMEOUT_MS: '5000'
            }
          }
        }
      };
      
      // Execute
      const result = validateMcpConfig(validConfig);
      
      // Verify
      expect(result).toBe(true);
    });
    
    test('validates a complete MCP configuration with multiple servers', () => {
      // Setup
      const validConfig = {
        mcpServers: {
          github: {
            command: 'docker',
            args: ['run', '-i', '--rm', '-e', 'GITHUB_PERSONAL_ACCESS_TOKEN', 'ghcr.io/github/github-mcp-server'],
            env: {}
          },
          stackoverflow: {
            command: 'npx',
            args: ['-y', 'stackoverflow-mcp-server'],
            env: {
              MAX_SEARCH_RESULTS: '5',
              SEARCH_TIMEOUT_MS: '5000',
              INCLUDE_CODE_SNIPPETS: 'true',
              PREFER_ACCEPTED_ANSWERS: 'true'
            }
          },
          'command-shell': {
            command: 'npx',
            args: ['-y', 'command-shell-mcp-server'],
            env: {
              ALLOWED_COMMANDS: 'git,npm,node',
              BLOCKED_COMMANDS: 'rm,sudo,chmod',
              COMMAND_TIMEOUT_MS: '5000',
              LOG_COMMANDS: 'true',
              ENABLE_ENVIRONMENT_VARIABLES: 'false'
            }
          }
        }
      };
      
      // Execute
      const result = validateMcpConfig(validConfig);
      
      // Verify
      expect(result).toBe(true);
    });
    
    test('validates StackOverflow MCP configuration', () => {
      // Setup
      const soConfig = getDefaultStackOverflowMcpConfig();
      const validConfig = {
        mcpServers: {
          stackoverflow: soConfig
        }
      };
      
      // Execute
      const result = validateMcpConfig(validConfig);
      
      // Verify
      expect(result).toBe(true);
    });
    
    test('validates Command Shell MCP configuration', () => {
      // Setup
      const csConfig = getDefaultCommandShellMcpConfig();
      const validConfig = {
        mcpServers: {
          'command-shell': csConfig
        }
      };
      
      // Execute
      const result = validateMcpConfig(validConfig);
      
      // Verify
      expect(result).toBe(true);
    });
  });
  
  describe('getDefaultStackOverflowMcpConfig', () => {
    test('returns correct default configuration', () => {
      // Execute
      const config = getDefaultStackOverflowMcpConfig();
      
      // Verify
      expect(config.command).toBe('npx');
      expect(config.args).toContain('stackoverflow-mcp-server');
      expect(config.env.MAX_SEARCH_RESULTS).toBe('5');
      expect(config.env.SEARCH_TIMEOUT_MS).toBe('5000');
      expect(config.env.INCLUDE_CODE_SNIPPETS).toBe('true');
      expect(config.env.PREFER_ACCEPTED_ANSWERS).toBe('true');
    });
  });
  
  describe('getDefaultCommandShellMcpConfig', () => {
    test('returns correct default configuration', () => {
      // Execute
      const config = getDefaultCommandShellMcpConfig();
      
      // Verify
      expect(config.command).toBe('npx');
      expect(config.args).toContain('command-shell-mcp-server');
      expect(config.env.ALLOWED_COMMANDS).toBe('');
      expect(config.env.BLOCKED_COMMANDS).toContain('rm');
      expect(config.env.BLOCKED_COMMANDS).toContain('sudo');
      expect(config.env.COMMAND_TIMEOUT_MS).toBe('5000');
      expect(config.env.LOG_COMMANDS).toBe('true');
      expect(config.env.ENABLE_ENVIRONMENT_VARIABLES).toBe('false');
    });
  });
});