/**
 * Tests for Claude Code configuration generation
 */
import { jest } from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

// Modules to test
import { setupClaudeMd } from '../src/integrations/claude-config.js';

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
    
    // Setup default mock implementations
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue('{}');
  });
  
  describe('setupClaudeMd', () => {
    test('generates CLAUDE.md with correct basic structure', async () => {
      // Setup
      const fileExistsMock = jest.fn().mockResolvedValue(false);
      const writeFileContentMock = jest.fn().mockResolvedValue(true);
      
      // Execute
      await setupClaudeMd({
        projectRoot,
        projectName: 'Test Project',
        logger: testLogger,
        fileExists: fileExistsMock,
        writeFileContent: writeFileContentMock
      });
      
      // Verify
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.stringContaining(path.join(projectRoot, 'CLAUDE.md')),
        expect.stringContaining('# Test Project Project')
      );
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('This is a Standard Repository project')
      );
    });
    
    test('includes MCP tool usage section', async () => {
      // Setup
      const fileExistsMock = jest.fn().mockResolvedValue(false);
      const writeFileContentMock = jest.fn().mockResolvedValue(true);
      
      // Execute
      await setupClaudeMd({
        projectRoot,
        projectName: 'Test Project',
        logger: testLogger,
        fileExists: fileExistsMock,
        writeFileContent: writeFileContentMock
      });
      
      // Verify
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('## MCP Tool Usage')
      );
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Prioritize using MCP tools when they can help with a task')
      );
    });
    
    test('includes key files section with package.json reference', async () => {
      // Setup
      const fileExistsMock = jest.fn().mockResolvedValue(true);
      const writeFileContentMock = jest.fn().mockResolvedValue(true);
      
      // Execute
      await setupClaudeMd({
        projectRoot,
        projectName: 'Test Project',
        logger: testLogger,
        fileExists: fileExistsMock,
        writeFileContent: writeFileContentMock
      });
      
      // Verify
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('## Key Files')
      );
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('@/package.json to ./CLAUDE.md')
      );
      expect(writeFileContentMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('@/README.md to ./CLAUDE.md')
      );
    });
  });
});