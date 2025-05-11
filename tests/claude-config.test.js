/**
 * Tests for Claude Code configuration generation
 */
import { jest } from '@jest/globals';
import path from 'path';
import os from 'os';

// Mock dependencies
jest.mock('fs-extra', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

// Create mock functions
const mockFileExists = jest.fn();
const mockWriteTextFile = jest.fn();

// Mock the file.js module
jest.mock('../src/utils/file.js', () => {
  return {
    fileExists: mockFileExists,
    writeTextFile: mockWriteTextFile,
    ensureDirectory: jest.fn()
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

// Import after mocking
import fs from 'fs-extra';

// Modules to test
import { setupClaudeMd } from '../src/integrations/claude-config.js';

describe('Claude Config Integration', () => {
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
  });
  
  describe('setupClaudeMd', () => {
    test('generates CLAUDE.md with correct basic structure', async () => {
      // Setup
      mockFileExists.mockResolvedValue(false);
      mockWriteTextFile.mockResolvedValue(true);
      
      // Execute
      await setupClaudeMd({
        projectRoot,
        projectName: 'Test Project',
        logger: testLogger
      });
      
      // Verify
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.stringContaining('CLAUDE.md'),
        expect.stringContaining('# Test Project Project')
      );
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('This is a Standard Repository project')
      );
    });
    
    test('includes MCP tool usage section', async () => {
      // Setup
      mockFileExists.mockResolvedValue(false);
      mockWriteTextFile.mockResolvedValue(true);
      
      // Execute
      await setupClaudeMd({
        projectRoot,
        projectName: 'Test Project',
        logger: testLogger
      });
      
      // Verify
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('## MCP Tool Usage')
      );
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Prioritize using MCP tools when they can help with a task')
      );
    });
    
    test('includes key files section with package.json reference', async () => {
      // Setup
      mockFileExists.mockResolvedValue(true);
      mockWriteTextFile.mockResolvedValue(true);
      
      // Execute
      await setupClaudeMd({
        projectRoot,
        projectName: 'Test Project',
        logger: testLogger
      });
      
      // Verify
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('## Key Files')
      );
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('@/package.json to ./CLAUDE.md')
      );
    });
  });
});