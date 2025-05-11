/**
 * Tests for MCP server configuration generation
 */
import { jest } from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

// Modules to test
import { setupMcpConfig } from '../src/integrations/mcp-config.js';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('../src/utils/logger.js', () => ({
  printInfo: jest.fn(),
  printSuccess: jest.fn(),
  printError: jest.fn(),
  printWarning: jest.fn()
}));
jest.mock('../src/utils/file.js', () => ({
  fileExists: jest.fn(),
  dirExists: jest.fn(),
  readFileContent: jest.fn(),
  writeFileContent: jest.fn(),
  createDirectory: jest.fn()
}));
jest.mock('../src/utils/encryption.js', () => ({
  encrypt: jest.fn((text) => `encrypted-${text}`),
  decrypt: jest.fn((text) => text.replace('encrypted-', ''))
}));
jest.mock('@inquirer/prompts', () => ({
  checkbox: jest.fn().mockResolvedValue(['github']),
  confirm: jest.fn().mockResolvedValue(true),
  input: jest.fn().mockResolvedValue('test-token')
}));

describe('MCP Config Integration', () => {
  const projectRoot = '/test/project';
  const testLogger = {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementations
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue('{}');
  });
  
  describe('setupMcpConfig', () => {
    test('creates basic MCP configuration file', async () => {
      // Setup
      const fileExistsMock = jest.fn().mockResolvedValue(false);
      const writeFileContentMock = jest.fn().mockResolvedValue(true);
      const mcpSelections = ['memory', 'context7-mcp'];
      const mockPrompt = jest.fn().mockResolvedValue(mcpSelections);
      
      // Execute
      await setupMcpConfig({
        projectRoot,
        logger: testLogger,
        fileExists: fileExistsMock,
        writeFileContent: writeFileContentMock,
        nonInteractive: true,
        selectedMcps: mcpSelections
      });
      
      // Verify
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.stringContaining('.mcp.json'),
        expect.stringContaining('"mcpServers"')
      );
    });
    
    test('includes memory MCP configuration when selected', async () => {
      // Setup
      const fileExistsMock = jest.fn().mockResolvedValue(false);
      const writeFileContentMock = jest.fn().mockResolvedValue(true);
      const mcpSelections = ['memory'];
      
      // Execute
      await setupMcpConfig({
        projectRoot,
        logger: testLogger,
        fileExists: fileExistsMock,
        writeFileContent: writeFileContentMock,
        nonInteractive: true,
        selectedMcps: mcpSelections
      });
      
      // Verify
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"memory"')
      );
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('mcp-knowledge-graph')
      );
    });
    
    test('includes context7-mcp configuration when selected', async () => {
      // Setup
      const fileExistsMock = jest.fn().mockResolvedValue(false);
      const writeFileContentMock = jest.fn().mockResolvedValue(true);
      const mcpSelections = ['context7-mcp'];
      
      // Execute
      await setupMcpConfig({
        projectRoot,
        logger: testLogger,
        fileExists: fileExistsMock,
        writeFileContent: writeFileContentMock,
        nonInteractive: true,
        selectedMcps: mcpSelections
      });
      
      // Verify
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"context7-mcp"')
      );
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('@upstash/context7-mcp')
      );
    });
    
    test('handles existing configuration file', async () => {
      // Setup
      const existingConfig = {
        mcpServers: {
          memory: {
            command: 'npx',
            args: ['-y', 'mcp-knowledge-graph', '--memory-path', '${MEMORY_PATH}']
          }
        }
      };
      const fileExistsMock = jest.fn().mockResolvedValue(true);
      const readFileContentMock = jest.fn().mockResolvedValue(JSON.stringify(existingConfig));
      const writeFileContentMock = jest.fn().mockResolvedValue(true);
      const mcpSelections = ['memory', 'github'];
      
      // Execute
      await setupMcpConfig({
        projectRoot,
        logger: testLogger,
        fileExists: fileExistsMock,
        readFileContent: readFileContentMock,
        writeFileContent: writeFileContentMock,
        nonInteractive: true,
        selectedMcps: mcpSelections
      });
      
      // Verify
      expect(readFileContentMock).toHaveBeenCalled();
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"memory"')
      );
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"github"')
      );
    });
    
    test('creates local override file when requested', async () => {
      // Setup
      const fileExistsMock = jest.fn().mockResolvedValue(false);
      const writeFileContentMock = jest.fn().mockResolvedValue(true);
      const mcpSelections = ['memory'];
      
      // Execute
      await setupMcpConfig({
        projectRoot,
        logger: testLogger,
        fileExists: fileExistsMock,
        writeFileContent: writeFileContentMock,
        nonInteractive: true,
        selectedMcps: mcpSelections,
        createLocalOverride: true
      });
      
      // Verify
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.stringContaining('.mcp.json'),
        expect.any(String)
      );
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.stringContaining('.mcp.json.local'),
        expect.any(String)
      );
    });
  });
});