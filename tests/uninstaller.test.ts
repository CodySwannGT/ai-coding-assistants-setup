import fs from 'fs-extra';
import path from 'path';
import { HuskySetup } from '../src/utils/husky-setup';
import { Uninstaller } from '../src/utils/uninstaller';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock HuskySetup
jest.mock('../src/utils/husky-setup');
const MockedHuskySetup = HuskySetup as jest.MockedClass<typeof HuskySetup>;

// Mock feedback
jest.mock('../src/utils/feedback', () => {
  return {
    Feedback: {
      info: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      section: jest.fn()
    }
  };
});

describe('Uninstaller', () => {
  const testDir = '/test-project';
  let uninstaller: Uninstaller;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create instance
    uninstaller = new Uninstaller(testDir);
    
    // Mock fs methods
    mockedFs.pathExists.mockResolvedValue(false);
    mockedFs.ensureDir.mockResolvedValue(undefined);
    mockedFs.readJson.mockResolvedValue({});
    mockedFs.writeJson.mockResolvedValue(undefined);
    mockedFs.readFile.mockResolvedValue('');
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.readdir.mockResolvedValue([]);
    mockedFs.remove.mockResolvedValue(undefined);
    mockedFs.stat.mockResolvedValue({ isDirectory: () => true });
    
    // Mock HuskySetup
    MockedHuskySetup.mockImplementation(() => {
      return {
        isHuskyInstalled: jest.fn().mockResolvedValue(false)
      } as unknown as HuskySetup;
    });
  });
  
  describe('findAIAssistantFiles', () => {
    it('should find AI assistant files and directories', async () => {
      // Mock specific files existing
      mockedFs.pathExists.mockImplementation(async (p) => {
        if (
          p === path.join(testDir, '.mcp.json') ||
          p === path.join(testDir, 'CLAUDE.md') ||
          p === path.join(testDir, '.roo')
        ) {
          return true;
        }
        return false;
      });
      
      const result = await uninstaller.findAIAssistantFiles();
      
      expect(result.files).toHaveLength(2);
      expect(result.directories).toHaveLength(1);
      expect(result.files).toContainEqual(path.join(testDir, '.mcp.json'));
      expect(result.files).toContainEqual(path.join(testDir, 'CLAUDE.md'));
      expect(result.directories).toContainEqual(path.join(testDir, '.roo'));
    });
    
    it('should detect AI settings in VS Code settings.json', async () => {
      // Mock VS Code settings with AI settings
      mockedFs.pathExists.mockImplementation(async (p) => {
        if (p === path.join(testDir, '.vscode', 'settings.json')) {
          return true;
        }
        return false;
      });
      
      mockedFs.readJson.mockResolvedValue({
        'claude.enableAutoCompletion': true,
        'rooCode.useIgnoreFiles': true,
        'editor.fontSize': 14
      });
      
      const result = await uninstaller.findAIAssistantFiles();
      
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toEqual({
        path: path.join(testDir, '.vscode', 'settings.json'),
        aiSettings: {
          'claude.enableAutoCompletion': true,
          'rooCode.useIgnoreFiles': true
        }
      });
    });
    
    it('should handle no AI files found', async () => {
      const result = await uninstaller.findAIAssistantFiles();
      
      expect(result.files).toHaveLength(0);
      expect(result.directories).toHaveLength(0);
    });
  });
  
  describe('uninstall', () => {
    it('should uninstall AI assistant files', async () => {
      // Mock AI files discovery
      jest.spyOn(uninstaller, 'findAIAssistantFiles').mockResolvedValue({
        files: [
          path.join(testDir, '.mcp.json'),
          path.join(testDir, 'CLAUDE.md')
        ],
        directories: [
          path.join(testDir, '.roo')
        ]
      });
      
      // Mock file existence for removal
      mockedFs.pathExists.mockResolvedValue(true);
      
      const result = await uninstaller.uninstall();
      
      expect(result.success).toBe(true);
      expect(result.removed.files).toHaveLength(2);
      expect(result.removed.directories).toHaveLength(1);
      expect(mockedFs.remove).toHaveBeenCalledTimes(3);
      expect(mockedFs.remove).toHaveBeenCalledWith(path.join(testDir, '.mcp.json'));
      expect(mockedFs.remove).toHaveBeenCalledWith(path.join(testDir, 'CLAUDE.md'));
      expect(mockedFs.remove).toHaveBeenCalledWith(path.join(testDir, '.roo'));
    });
    
    it('should handle VS Code settings when includeVSCode is true', async () => {
      // Mock VS Code settings
      mockedFs.pathExists.mockImplementation(async (p) => {
        if (
          p === path.join(testDir, '.vscode', 'settings.json') ||
          p === path.join(testDir, '.vscode', 'extensions.json')
        ) {
          return true;
        }
        return false;
      });
      
      mockedFs.readJson.mockImplementation(async (p) => {
        if (p === path.join(testDir, '.vscode', 'settings.json')) {
          return {
            'claude.enableAutoCompletion': true,
            'editor.fontSize': 14
          };
        } else if (p === path.join(testDir, '.vscode', 'extensions.json')) {
          return {
            recommendations: ['anthropic.claude-code', 'other.extension']
          };
        }
        return {};
      });
      
      // Mock no other AI files
      jest.spyOn(uninstaller, 'findAIAssistantFiles').mockResolvedValue({
        files: [{
          path: path.join(testDir, '.vscode', 'settings.json'),
          aiSettings: { 'claude.enableAutoCompletion': true }
        }],
        directories: []
      });
      
      const result = await uninstaller.uninstall({ includeVSCode: true });
      
      expect(result.success).toBe(true);
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        path.join(testDir, '.vscode', 'settings.json'),
        { 'editor.fontSize': 14 },
        expect.anything()
      );
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        path.join(testDir, '.vscode', 'extensions.json'),
        { recommendations: ['other.extension'] },
        expect.anything()
      );
    });
    
    it('should handle .env file with AI environment variables', async () => {
      // Mock .env file with AI variables
      mockedFs.pathExists.mockImplementation(async (p) => {
        if (p === path.join(testDir, '.env')) {
          return true;
        }
        return false;
      });
      
      mockedFs.readFile.mockResolvedValue(
        'ANTHROPIC_API_KEY=secret\nNODE_ENV=development\nOPENAI_API_KEY=another-secret'
      );
      
      // Mock no other AI files
      jest.spyOn(uninstaller, 'findAIAssistantFiles').mockResolvedValue({
        files: [],
        directories: []
      });
      
      const result = await uninstaller.uninstall();
      
      expect(result.success).toBe(true);
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(testDir, '.env'),
        'NODE_ENV=development',
        'utf8'
      );
    });
    
    it('should handle dry run mode', async () => {
      // Mock AI files discovery
      jest.spyOn(uninstaller, 'findAIAssistantFiles').mockResolvedValue({
        files: [
          path.join(testDir, '.mcp.json'),
          path.join(testDir, 'CLAUDE.md')
        ],
        directories: [
          path.join(testDir, '.roo')
        ]
      });
      
      // Mock file existence for removal
      mockedFs.pathExists.mockResolvedValue(true);
      
      const result = await uninstaller.uninstall({ dryRun: true });
      
      expect(result.success).toBe(true);
      expect(mockedFs.remove).not.toHaveBeenCalled();
    });
    
    it('should handle Husky hooks', async () => {
      // Mock Husky installed
      MockedHuskySetup.mockImplementation(() => {
        return {
          isHuskyInstalled: jest.fn().mockResolvedValue(true)
        } as unknown as HuskySetup;
      });
      
      // Mock no AI files
      jest.spyOn(uninstaller, 'findAIAssistantFiles').mockResolvedValue({
        files: [],
        directories: []
      });
      
      const result = await uninstaller.uninstall();
      
      expect(result.success).toBe(true);
      // Actual hook removal would be tested once implemented in HuskySetup
    });
    
    it('should handle errors during uninstall process', async () => {
      // Force an error
      mockedFs.pathExists.mockRejectedValue(new Error('Test error'));
      
      const result = await uninstaller.uninstall();
      
      expect(result.success).toBe(false);
      expect(result.removed.files).toHaveLength(0);
      expect(result.removed.directories).toHaveLength(0);
    });
  });
});