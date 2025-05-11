/**
 * Tests for MCP server configuration generation
 */
import { jest } from '@jest/globals';
import _path from 'path';
import _os from 'os';

// Mock dependencies
jest.mock('fs-extra', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  ensureDir: jest.fn().mockResolvedValue(true),
  pathExists: jest.fn().mockResolvedValue(false),
  remove: jest.fn().mockResolvedValue(true)
}));

// Create mock functions
const mockFileExists = jest.fn();
const mockSafeReadTextFile = jest.fn();
const mockWriteTextFile = jest.fn();
const mockEnsureDirectory = jest.fn().mockResolvedValue(true);
const mockSafeWriteJson = jest.fn().mockResolvedValue(true);

// Mock path.join to ensure consistent paths
jest.mock('path', () => {
  const originalPath = jest.requireActual('path');
  return {
    ...originalPath,
    join: jest.fn((...parts) => {
      // Redirect absolute paths to temp directory
      if (parts[0] === '/test/project') {
        return originalPath.join(process.cwd(), 'tmp', ...parts.slice(1));
      }
      return originalPath.join(...parts);
    }),
    dirname: jest.fn(path => originalPath.dirname(path))
  };
});

// Mock the file.js module
jest.mock('../src/utils/file.js', () => {
  return {
    fileExists: mockFileExists,
    safeReadTextFile: mockSafeReadTextFile,
    writeTextFile: mockWriteTextFile,
    ensureDirectory: mockEnsureDirectory,
    safeWriteJson: mockSafeWriteJson
  };
});

jest.mock('../src/utils/logger.js', () => ({
  printInfo: jest.fn(),
  printSuccess: jest.fn(),
  printError: jest.fn(),
  printWarning: jest.fn()
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

// Import after mocks
import _fs from 'fs-extra';

// Modules to test
import { setupMcpConfig } from '../src/integrations/mcp-config.js';

describe('MCP Config Integration', () => {
  const projectRoot = process.cwd() + '/tmp';
  const testLogger = {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock implementations
    mockFileExists.mockResolvedValue(false);
    mockSafeReadTextFile.mockResolvedValue('');
    mockWriteTextFile.mockResolvedValue(true);
    mockEnsureDirectory.mockResolvedValue(true);
    mockSafeWriteJson.mockResolvedValue(true);
  });
  
  describe('setupMcpConfig', () => {
    test('creates basic MCP configuration file', async () => {
      // Setup
      mockFileExists.mockResolvedValue(false);
      mockWriteTextFile.mockResolvedValue(true);
      const mcpSelections = ['memory', 'context7-mcp'];
      
      // Execute
      await setupMcpConfig({
        projectRoot,
        logger: testLogger,
        nonInteractive: true,
        selectedMcps: mcpSelections
      });
      
      // Verify
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.stringContaining('.mcp.json'),
        expect.stringContaining('"mcpServers"')
      );
    });
    
    test('includes memory MCP configuration when selected', async () => {
      // Setup
      mockFileExists.mockResolvedValue(false);
      mockWriteTextFile.mockResolvedValue(true);
      const mcpSelections = ['memory'];
      
      // Execute
      await setupMcpConfig({
        projectRoot,
        logger: testLogger,
        nonInteractive: true,
        selectedMcps: mcpSelections
      });
      
      // Verify
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"memory"')
      );
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('mcp-knowledge-graph')
      );
    });
    
    test('includes context7-mcp configuration when selected', async () => {
      // Setup
      mockFileExists.mockResolvedValue(false);
      mockWriteTextFile.mockResolvedValue(true);
      const mcpSelections = ['context7-mcp'];
      
      // Execute
      await setupMcpConfig({
        projectRoot,
        logger: testLogger,
        nonInteractive: true,
        selectedMcps: mcpSelections
      });
      
      // Verify
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"context7-mcp"')
      );
      expect(mockWriteTextFile).toHaveBeenCalledWith(
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
      mockFileExists.mockResolvedValue(true);
      mockSafeReadTextFile.mockResolvedValue(JSON.stringify(existingConfig));
      mockWriteTextFile.mockResolvedValue(true);
      const mcpSelections = ['memory', 'github'];
      
      // Execute
      await setupMcpConfig({
        projectRoot,
        logger: testLogger,
        nonInteractive: true,
        selectedMcps: mcpSelections
      });
      
      // Verify
      expect(mockSafeReadTextFile).toHaveBeenCalled();
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"memory"')
      );
    });
    
    test('creates local override file when requested', async () => {
      // Setup
      mockFileExists.mockResolvedValue(false);
      mockWriteTextFile.mockResolvedValue(true);
      const mcpSelections = ['memory'];
      
      // Execute
      await setupMcpConfig({
        projectRoot,
        logger: testLogger,
        nonInteractive: true,
        selectedMcps: mcpSelections,
        createLocalOverride: true
      });
      
      // Verify
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.stringContaining('.mcp.json'),
        expect.any(String)
      );
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.stringContaining('.mcp.json.local'),
        expect.any(String)
      );
    });
  });
});