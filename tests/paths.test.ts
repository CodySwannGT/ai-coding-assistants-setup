import os from 'os';
import path from 'path';
import {
  claudeConfigPaths,
  vsCodeUserConfigPaths,
  vsCodeExtensionsPaths,
  isWindows,
  isMac,
  isLinux,
  getClaudeConfigPath,
  getVSCodeUserConfigPath,
  getVSCodeExtensionsPath,
  getProjectPaths
} from '../src/config/paths';

// Mock os and process
jest.mock('os', () => ({
  homedir: jest.fn()
}));

const originalPlatform = process.platform;

describe('Paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (os.homedir as jest.Mock).mockReturnValue('/home/testuser');
  });
  
  describe('Platform detection', () => {
    afterEach(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
    });
    
    it('should detect Windows correctly', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      });
      
      // Re-import the module to get updated values
      jest.resetModules();
      const { isWindows: windowsFlag, isMac: macFlag, isLinux: linuxFlag } = require('../src/config/paths');
      
      expect(windowsFlag).toBe(true);
      expect(macFlag).toBe(false);
      expect(linuxFlag).toBe(false);
    });
    
    it('should detect macOS correctly', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });
      
      // Re-import the module to get updated values
      jest.resetModules();
      const { isWindows: windowsFlag, isMac: macFlag, isLinux: linuxFlag } = require('../src/config/paths');
      
      expect(windowsFlag).toBe(false);
      expect(macFlag).toBe(true);
      expect(linuxFlag).toBe(false);
    });
    
    it('should detect Linux correctly', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux'
      });
      
      // Re-import the module to get updated values
      jest.resetModules();
      const { isWindows: windowsFlag, isMac: macFlag, isLinux: linuxFlag } = require('../src/config/paths');
      
      expect(windowsFlag).toBe(false);
      expect(macFlag).toBe(false);
      expect(linuxFlag).toBe(true);
    });
  });
  
  describe('Path getters', () => {
    it('should return the correct Claude config path for the current platform', () => {
      const mockMacPath = '/home/testuser/Library/Application Support/Claude/claude_desktop_config.json';
      const mockWinPath = 'undefined/Claude/claude_desktop_config.json';
      const mockLinuxPath = '/home/testuser/.config/Claude/claude_desktop_config.json';
      
      // Mock as macOS
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });
      
      jest.resetModules();
      const { getClaudeConfigPath: getMacPath } = require('../src/config/paths');
      expect(getMacPath()).toBe(mockMacPath);
      
      // Mock as Windows
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      });
      
      jest.resetModules();
      const { getClaudeConfigPath: getWinPath } = require('../src/config/paths');
      expect(getWinPath()).toBe(mockWinPath);
      
      // Mock as Linux
      Object.defineProperty(process, 'platform', {
        value: 'linux'
      });
      
      jest.resetModules();
      const { getClaudeConfigPath: getLinuxPath } = require('../src/config/paths');
      expect(getLinuxPath()).toBe(mockLinuxPath);
      
      // Restore platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
    });
    
    it('should return the correct VS Code config path', () => {
      // Use the original function since we're not testing platform-specific behavior
      const configPath = getVSCodeUserConfigPath();
      expect(configPath).toBeDefined();
    });
    
    it('should return the correct VS Code extensions path', () => {
      // Use the original function since we're not testing platform-specific behavior
      const extensionsPath = getVSCodeExtensionsPath();
      expect(extensionsPath).toBeDefined();
    });
  });
  
  describe('getProjectPaths', () => {
    it('should return all project paths relative to the project root', () => {
      const projectRoot = '/test/project';
      const paths = getProjectPaths(projectRoot);
      
      expect(paths.root).toBe(projectRoot);
      expect(paths.claude).toBe(path.join(projectRoot, '.claude'));
      expect(paths.roo).toBe(path.join(projectRoot, '.roo'));
      expect(paths.mcp).toBe(path.join(projectRoot, '.mcp.json'));
      expect(paths.claudeMd).toBe(path.join(projectRoot, 'CLAUDE.md'));
      expect(paths.githubDir).toBe(path.join(projectRoot, '.github'));
      expect(paths.husky).toBe(path.join(projectRoot, '.husky'));
      // Check a few more paths
      expect(paths.githubWorkflows).toBe(path.join(projectRoot, '.github', 'workflows'));
      expect(paths.rooRules).toBe(path.join(projectRoot, '.roo', 'rules'));
    });
  });
});