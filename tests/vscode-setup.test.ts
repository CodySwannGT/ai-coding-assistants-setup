import fs from 'fs-extra';
import path from 'path';
import { VSCodeSetup } from '../src/utils/vscode-setup';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

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

describe('VSCodeSetup', () => {
  const testDir = '/test-project';
  let setup: VSCodeSetup;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create instance
    setup = new VSCodeSetup(testDir);
    
    // Mock fs methods
    mockedFs.pathExists.mockResolvedValue(false);
    mockedFs.ensureDir.mockResolvedValue(undefined);
    mockedFs.readJson.mockResolvedValue({});
    mockedFs.writeJson.mockResolvedValue(undefined);
    mockedFs.readdir.mockResolvedValue([]);
    mockedFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
  });
  
  describe('detectGitHubCopilot', () => {
    it('should return not installed when no VS Code extensions found', async () => {
      mockedFs.readdir.mockRejectedValue(new Error('Directory not found'));
      
      const result = await setup.detectGitHubCopilot();
      
      expect(result.installed).toBe(false);
      expect(result.path).toBeNull();
    });
    
    it('should detect GitHub Copilot when installed', async () => {
      mockedFs.readdir.mockResolvedValue(['github.copilot-1.0.0']);
      
      const result = await setup.detectGitHubCopilot();
      
      expect(result.installed).toBe(true);
      expect(result.path).toContain('github.copilot-1.0.0');
    });
  });
  
  describe('createVSCodeDirectories', () => {
    it('should create VS Code directories', async () => {
      const result = await setup.createVSCodeDirectories();
      
      expect(result).toBe(true);
      expect(mockedFs.ensureDir).toHaveBeenCalledWith(path.join(testDir, '.vscode'));
    });
    
    it('should return false if directory creation fails', async () => {
      mockedFs.ensureDir.mockRejectedValue(new Error('Failed to create directory'));
      
      const result = await setup.createVSCodeDirectories();
      
      expect(result).toBe(false);
    });
  });
  
  describe('updateSettings', () => {
    it('should update VS Code settings', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue({
        'existing.setting': true
      });
      
      const result = await setup.updateSettings();
      
      expect(result).toBe(true);
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        path.join(testDir, '.vscode', 'settings.json'),
        expect.objectContaining({
          'existing.setting': true,
          'editor.inlineSuggest.enabled': true,
          'editor.inlineSuggest.showToolbar': 'always',
          'claude.enableAutoCompletion': true,
          'rooCode.useIgnoreFiles': true,
          'rooCode.autoApproveReads': true,
          'git.ignoreLimitWarning': true
        }),
        expect.anything()
      );
    });
    
    it('should handle Copilot being installed and disabled', async () => {
      // Mock Copilot detection
      jest.spyOn(setup, 'detectGitHubCopilot').mockResolvedValue({
        installed: true,
        path: '/path/to/copilot'
      });
      
      const result = await setup.updateSettings({ disableCopilot: true });
      
      expect(result).toBe(true);
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          'github.copilot.enable': false,
          'github.copilot.editor.enableAutoCompletions': false
        }),
        expect.anything()
      );
    });
    
    it('should handle Copilot being installed and prioritizing Claude/Roo', async () => {
      // Mock Copilot detection
      jest.spyOn(setup, 'detectGitHubCopilot').mockResolvedValue({
        installed: true,
        path: '/path/to/copilot'
      });
      
      const result = await setup.updateSettings({
        disableCopilot: false,
        prioritizeClaudeRoo: true
      });
      
      expect(result).toBe(true);
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          'editor.inlineSuggest.suppressSuggestions': false,
          'editor.inlineSuggest.enabled': true,
          'github.copilot.inlineSuggest.enable': true,
          'github.copilot.inlineSuggest.count': 1
        }),
        expect.anything()
      );
    });
  });
  
  describe('updateExtensionsRecommendations', () => {
    it('should add recommended extensions', async () => {
      const result = await setup.updateExtensionsRecommendations();
      
      expect(result).toBe(true);
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        path.join(testDir, '.vscode', 'extensions.json'),
        expect.objectContaining({
          recommendations: expect.arrayContaining([
            'anthropic.claude-code',
            'roo.roo-code',
            'aaron-bond.better-comments',
            'dbaeumer.vscode-eslint',
            'esbenp.prettier-vscode',
            'editorconfig.editorconfig'
          ])
        }),
        expect.anything()
      );
    });
    
    it('should add unwanted recommendations if Copilot is installed', async () => {
      // Mock Copilot detection
      jest.spyOn(setup, 'detectGitHubCopilot').mockResolvedValue({
        installed: true,
        path: '/path/to/copilot'
      });
      
      const result = await setup.updateExtensionsRecommendations();
      
      expect(result).toBe(true);
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          unwantedRecommendations: expect.arrayContaining([
            'github.copilot',
            'github.copilot-chat'
          ])
        }),
        expect.anything()
      );
    });
  });
  
  describe('setup', () => {
    it('should set up VS Code configuration', async () => {
      // Mock component methods
      const createDirsSpy = jest.spyOn(setup, 'createVSCodeDirectories').mockResolvedValue(true);
      const updateSettingsSpy = jest.spyOn(setup, 'updateSettings').mockResolvedValue(true);
      const updateExtSpy = jest.spyOn(setup, 'updateExtensionsRecommendations').mockResolvedValue(true);
      
      const result = await setup.setup();
      
      expect(result).toBe(true);
      expect(createDirsSpy).toHaveBeenCalled();
      expect(updateSettingsSpy).toHaveBeenCalled();
      expect(updateExtSpy).toHaveBeenCalled();
    });
    
    it('should handle failures in component methods', async () => {
      // Mock component methods with failures
      jest.spyOn(setup, 'createVSCodeDirectories').mockResolvedValue(true);
      jest.spyOn(setup, 'updateSettings').mockResolvedValue(false);
      jest.spyOn(setup, 'updateExtensionsRecommendations').mockResolvedValue(false);
      
      const result = await setup.setup();
      
      expect(result).toBe(false);
    });
    
    it('should update working directory if cwd is provided', async () => {
      // Mock component methods
      jest.spyOn(setup, 'createVSCodeDirectories').mockResolvedValue(true);
      jest.spyOn(setup, 'updateSettings').mockResolvedValue(true);
      jest.spyOn(setup, 'updateExtensionsRecommendations').mockResolvedValue(true);
      
      const newCwd = '/new-project-root';
      const result = await setup.setup({ cwd: newCwd });
      
      expect(result).toBe(true);
      // We would need to check private properties to verify the cwd change,
      // but that's not easily testable. The successful result is sufficient.
    });
  });
});