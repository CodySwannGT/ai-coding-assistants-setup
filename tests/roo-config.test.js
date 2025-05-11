/**
 * Tests for Roo Code configuration generation
 */
import { jest } from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

// Modules to test
import { setupRooRules, setupRooIgnore } from '../src/integrations/roo-config.js';

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
    
    // Setup default mock implementations
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue('{}');
  });
  
  describe('setupRooRules', () => {
    test('creates rules directory and files', async () => {
      // Setup
      const dirExistsMock = jest.fn().mockResolvedValue(false);
      const createDirectoryMock = jest.fn().mockResolvedValue(true);
      const writeFileContentMock = jest.fn().mockResolvedValue(true);
      
      // Execute
      await setupRooRules({
        projectRoot,
        projectName: 'Test Project',
        logger: testLogger,
        dirExists: dirExistsMock,
        createDirectory: createDirectoryMock,
        writeFileContent: writeFileContentMock
      });
      
      // Verify
      expect(createDirectoryMock).toHaveBeenCalledWith(
        expect.stringContaining(path.join(projectRoot, '.roo/rules'))
      );
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.stringContaining('01-coding-standards.md'),
        expect.stringContaining('Coding Standards')
      );
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.stringContaining('02-architecture-guide.md'),
        expect.stringContaining('Architecture Guide')
      );
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.stringContaining('03-mcp-tools.md'),
        expect.stringContaining('MCP Tool Usage')
      );
    });
  });
  
  describe('setupRooIgnore', () => {
    test('creates .rooignore file with common patterns', async () => {
      // Setup
      const fileExistsMock = jest.fn().mockResolvedValue(false);
      const writeFileContentMock = jest.fn().mockResolvedValue(true);
      
      // Execute
      await setupRooIgnore({
        projectRoot,
        logger: testLogger,
        fileExists: fileExistsMock,
        writeFileContent: writeFileContentMock
      });
      
      // Verify
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.stringContaining('.rooignore'),
        expect.stringMatching(/node_modules/)
      );
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/dist/)
      );
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/build/)
      );
    });
    
    test('skips creation if file already exists and not forced', async () => {
      // Setup
      const fileExistsMock = jest.fn().mockResolvedValue(true);
      const writeFileContentMock = jest.fn().mockResolvedValue(true);
      
      // Execute
      await setupRooIgnore({
        projectRoot,
        logger: testLogger,
        fileExists: fileExistsMock,
        writeFileContent: writeFileContentMock,
        force: false
      });
      
      // Verify
      expect(writeFileContentMock).not.toHaveBeenCalled();
    });
    
    test('overwrites file if force is true', async () => {
      // Setup
      const fileExistsMock = jest.fn().mockResolvedValue(true);
      const writeFileContentMock = jest.fn().mockResolvedValue(true);
      
      // Execute
      await setupRooIgnore({
        projectRoot,
        logger: testLogger,
        fileExists: fileExistsMock,
        writeFileContent: writeFileContentMock,
        force: true
      });
      
      // Verify
      expect(writeFileContentMock).toHaveBeenCalled();
    });
  });
});