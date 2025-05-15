/**
 * Tests for Claude Code configuration generation
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
const mockWriteTextFile = jest.fn();
const mockEnsureDirectory = jest.fn().mockResolvedValue(true);

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
    writeTextFile: mockWriteTextFile,
    ensureDirectory: mockEnsureDirectory
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
import _fs from 'fs-extra';

// Modules to test
import { setupClaudeMd } from '../src/integrations/claude-config.js';

describe('Claude Config Integration', () => {
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

    // Setup mock implementation for fileExists
    mockFileExists.mockImplementation(async (path) => {
      if (path.includes('CLAUDE.md') && testLogger.info.mock.calls.length > 0) {
        return true;
      }
      return false;
    });

    // Setup mock implementation for writeTextFile
    mockWriteTextFile.mockImplementation(async (path, content) => {
      return true;
    });
  });

  afterAll(() => {
    // No cleanup needed
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