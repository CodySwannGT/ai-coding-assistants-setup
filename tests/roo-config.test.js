/**
 * Tests for Roo Code configuration generation
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

// Create mock functions with implementations
const mockFileExists = jest.fn();
const mockEnsureDirectory = jest.fn();
const mockWriteTextFile = jest.fn();

// Mock the file.js module
jest.mock('../src/utils/file.js', () => {
  return {
    fileExists: mockFileExists,
    ensureDirectory: mockEnsureDirectory,
    writeTextFile: mockWriteTextFile
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
import { setupRooRules, setupRooIgnore } from '../src/integrations/roo-config.js';

describe('Roo Config Integration', () => {
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
  
  describe('setupRooRules', () => {
    test('creates rules directory and files', async () => {
      // Setup
      mockEnsureDirectory.mockResolvedValue(true);
      mockWriteTextFile.mockResolvedValue(true);
      
      // Execute
      await setupRooRules({
        projectRoot,
        projectName: 'Test Project',
        logger: testLogger
      });
      
      // Verify
      expect(mockEnsureDirectory).toHaveBeenCalled();
      expect(mockWriteTextFile).toHaveBeenCalledTimes(3);
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.stringContaining('01-coding-standards.md'),
        expect.stringContaining('Coding Standards')
      );
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.stringContaining('02-architecture-guide.md'),
        expect.stringContaining('Architecture Guide')
      );
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.stringContaining('03-mcp-tools.md'),
        expect.stringContaining('MCP Tool Usage')
      );
    });
  });
  
  describe('setupRooIgnore', () => {
    test('creates .rooignore file with common patterns', async () => {
      // Setup
      mockFileExists.mockResolvedValue(false);
      mockWriteTextFile.mockResolvedValue(true);
      
      // Execute
      await setupRooIgnore({
        projectRoot,
        logger: testLogger
      });
      
      // Verify
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.stringContaining('.rooignore'),
        expect.stringMatching(/node_modules/)
      );
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/dist/)
      );
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/build/)
      );
    });
    
    test('skips creation if file already exists and not forced', async () => {
      // Setup
      mockFileExists.mockResolvedValue(true);
      mockWriteTextFile.mockResolvedValue(true);
      
      // Execute
      await setupRooIgnore({
        projectRoot,
        logger: testLogger,
        force: false
      });
      
      // Verify
      expect(mockWriteTextFile).not.toHaveBeenCalled();
    });
    
    test('overwrites file if force is true', async () => {
      // Setup
      mockFileExists.mockResolvedValue(true);
      mockWriteTextFile.mockResolvedValue(true);
      
      // Execute
      await setupRooIgnore({
        projectRoot,
        logger: testLogger,
        force: true
      });
      
      // Verify
      expect(mockWriteTextFile).toHaveBeenCalled();
    });
  });
});