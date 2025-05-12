import fs from 'fs-extra';
import path from 'path';
import * as gitIntegrations from '../src/integrations/git.js'; // To mock removeGitHooks
import { uninstall } from '../src/integrations/uninstall.js';
import * as fileUtils from '../src/utils/file.js';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('../src/utils/file.js');
jest.mock('../src/integrations/git.js'); // Mock the git integration module

// Default mock implementations
const mockLogger = {
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(), // Add debug mock for dry run checks
  printHeader: jest.fn(), // Mock logger methods used in uninstall
  printInfo: jest.fn(),
  printSuccess: jest.fn(),
  printWarning: jest.fn(),
  printError: jest.fn(),
  printDebug: jest.fn(),
};

const defaultProjectRoot = '/fake/project/root';
const dependabotFilePath = path.join(defaultProjectRoot, '.github', 'dependabot.yml');
const githubDirPath = path.join(defaultProjectRoot, '.github');

describe('uninstall - Dependabot Configuration Removal', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup default mocks
    fileUtils.fileExists.mockResolvedValue(false); // Default to file not existing
    fs.remove.mockResolvedValue(); // Mock fs.remove to resolve successfully
    fs.readdir.mockResolvedValue([]); // Mock fs.readdir to return empty array by default
    fs.stat.mockResolvedValue({ isDirectory: () => false }); // Default stat mock
    fs.readFile.mockResolvedValue(''); // Default readFile mock
    fs.writeFile.mockResolvedValue(); // Default writeFile mock
    fs.readJson.mockResolvedValue({}); // Default readJson mock
    fs.writeJson.mockResolvedValue(); // Default writeJson mock

    // Mock the removeGitHooks function to avoid side effects
    gitIntegrations.removeGitHooks.mockResolvedValue({ success: [], failed: [] });

    // Mock the confirm function passed in options to always return true
    // This simulates the user confirming the uninstall action
    // We pass a simple mock confirm function in the options below.
  });

  const runUninstall = (options = {}) => {
    const defaultOptions = {
      projectRoot: defaultProjectRoot,
      logger: mockLogger,
      dryRun: false,
      nonInteractive: true, // Assume non-interactive for tests unless specified
      includeVSCode: false, // Assume VSCode settings are not included unless specified
      confirm: jest.fn().mockResolvedValue(true), // Mock confirmation
    };
    return uninstall({ ...defaultOptions, ...options });
  };

  test('should remove dependabot.yml and empty .github dir when file exists', async () => {
    fileUtils.fileExists.mockImplementation(async (filePath) => filePath === dependabotFilePath);
    fs.readdir.mockResolvedValue([]); // Directory is empty after removal

    await runUninstall();

    expect(fileUtils.fileExists).toHaveBeenCalledWith(dependabotFilePath);
    expect(fs.remove).toHaveBeenCalledWith(dependabotFilePath);
    expect(mockLogger.printSuccess).toHaveBeenCalledWith(`Removed Dependabot configuration: ${dependabotFilePath}`);
    // Check if readdir was called *after* the file removal attempt
    expect(fs.readdir).toHaveBeenCalledWith(githubDirPath);
    expect(fs.remove).toHaveBeenCalledWith(githubDirPath); // Expect directory removal
    expect(mockLogger.printSuccess).toHaveBeenCalledWith(`Removed empty .github directory: ${githubDirPath}`);
  });

  test('should remove dependabot.yml but NOT .github dir when file exists and dir is not empty', async () => {
    fileUtils.fileExists.mockImplementation(async (filePath) => filePath === dependabotFilePath);
    fs.readdir.mockResolvedValue(['some-other-file.txt']); // Directory is NOT empty

    await runUninstall();

    expect(fileUtils.fileExists).toHaveBeenCalledWith(dependabotFilePath);
    expect(fs.remove).toHaveBeenCalledWith(dependabotFilePath);
    expect(mockLogger.printSuccess).toHaveBeenCalledWith(`Removed Dependabot configuration: ${dependabotFilePath}`);
    expect(fs.readdir).toHaveBeenCalledWith(githubDirPath);
    // Ensure the directory itself was NOT removed
    expect(fs.remove).not.toHaveBeenCalledWith(githubDirPath);
    expect(mockLogger.printSuccess).not.toHaveBeenCalledWith(`Removed empty .github directory: ${githubDirPath}`);
  });

  test('should NOT attempt removal if dependabot.yml does not exist', async () => {
    fileUtils.fileExists.mockResolvedValue(false); // dependabot.yml does not exist

    await runUninstall();

    expect(fileUtils.fileExists).toHaveBeenCalledWith(dependabotFilePath);
    expect(fs.remove).not.toHaveBeenCalledWith(dependabotFilePath);
    expect(fs.readdir).not.toHaveBeenCalledWith(githubDirPath);
    expect(fs.remove).not.toHaveBeenCalledWith(githubDirPath);
    expect(mockLogger.printDebug).toHaveBeenCalledWith('No Dependabot configuration found to remove.');
  });

  test('should NOT remove file or dir in dry run mode, even if file exists', async () => {
    fileUtils.fileExists.mockImplementation(async (filePath) => filePath === dependabotFilePath);
    fs.readdir.mockResolvedValue([]); // Simulate dir would be empty

    await runUninstall({ dryRun: true });

    expect(fileUtils.fileExists).toHaveBeenCalledWith(dependabotFilePath);
    // Ensure no actual removal happened
    expect(fs.remove).not.toHaveBeenCalled();
    // Check that debug logs indicate what *would* happen
    expect(mockLogger.printDebug).toHaveBeenCalledWith(`Would remove Dependabot configuration: ${dependabotFilePath}`);
    // Check readdir was still called to determine if dir *would* be removed
    expect(fs.readdir).toHaveBeenCalledWith(githubDirPath);
    expect(mockLogger.printDebug).toHaveBeenCalledWith(`Would remove empty .github directory: ${githubDirPath}`);
  });

  test('should NOT remove dir in dry run mode when dir is not empty', async () => {
    fileUtils.fileExists.mockImplementation(async (filePath) => filePath === dependabotFilePath);
    fs.readdir.mockResolvedValue(['another-file']); // Simulate dir would NOT be empty

    await runUninstall({ dryRun: true });

    expect(fileUtils.fileExists).toHaveBeenCalledWith(dependabotFilePath);
    expect(fs.remove).not.toHaveBeenCalled();
    expect(mockLogger.printDebug).toHaveBeenCalledWith(`Would remove Dependabot configuration: ${dependabotFilePath}`);
    expect(fs.readdir).toHaveBeenCalledWith(githubDirPath);
    // Ensure it doesn't log that it would remove the non-empty directory
    expect(mockLogger.printDebug).not.toHaveBeenCalledWith(`Would remove empty .github directory: ${githubDirPath}`);
  });
});