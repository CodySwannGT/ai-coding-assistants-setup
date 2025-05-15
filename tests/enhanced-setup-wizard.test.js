import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';
import * as configManager from '../src/hooks/config-manager.js';
import { runEnhancedSetupWizard } from '../src/hooks/enhanced-setup-wizard.js';
import * as hookIndex from '../src/hooks/index.js';
import * as claudeCli from '../src/integrations/claude-cli.js';
import * as projectDetector from '../src/utils/project-detector.js';

// Mock dependencies
jest.mock('inquirer');
jest.mock('fs');
jest.mock('../src/utils/project-detector.js');
jest.mock('../src/hooks/code-quality-hooks.js');
jest.mock('../src/integrations/claude-cli.js');
jest.mock('../src/hooks/config-manager.js');
jest.mock('../src/hooks/index.js');

// Default mock implementations
const mockLogger = {
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
};

const defaultProjectRoot = '/fake/project/root';

const mockBasicProjectDetection = () => {
  projectDetector.isTypeScriptProject.mockResolvedValue(false);
  projectDetector.hasTypeScriptTypeChecking.mockResolvedValue({ hasTypesCheck: false });
  projectDetector.detectLinter.mockResolvedValue({ linter: null });
  projectDetector.detectFormatter.mockResolvedValue({ formatter: null });
  projectDetector.hasCommitlint.mockResolvedValue({ hasCommitlint: false });
};

describe('runEnhancedSetupWizard - Dependabot Configuration', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup default mocks
    claudeCli.isClaudeCliAvailable.mockResolvedValue(true);
    hookIndex.initializeHooks.mockResolvedValue({}); // Mock registry initialization
    hookIndex.setupHooks.mockResolvedValue({ success: true }); // Mock final setup step
    configManager.applyHookTemplate.mockResolvedValue(); // Mock template application
    mockBasicProjectDetection(); // Apply basic project detection mocks

    // Mock fs.existsSync to return false by default for lockfiles and .github dir
    fs.existsSync.mockImplementation((filePath) => {
      const basename = path.basename(filePath);
      if (basename === 'package-lock.json' || basename === 'yarn.lock' || basename === '.github') {
        return false;
      }
      return jest.requireActual('fs').existsSync(filePath); // Allow other checks if needed
    });
    fs.mkdirSync.mockReturnValue();
    fs.writeFileSync.mockReturnValue();
  });

  const runWizard = (options = {}) => {
    return runEnhancedSetupWizard({
      projectRoot: defaultProjectRoot,
      logger: mockLogger,
      ...options,
    });
  };

  const mockPrompts = (answers) => {
    // Default answers for initial prompts if not provided
    const defaultAnswers = {
      approach: 'standard', // Assume standard approach for these tests
      addDependabot: true, // Default to adding dependabot unless specified
      // Add other potential prompts if needed for the flow to reach Dependabot
    };
    inquirer.prompt.mockResolvedValue({ ...defaultAnswers, ...answers });
  };

  test('should add Dependabot config for npm when user accepts and package-lock.json exists', async () => {
    mockPrompts({ addDependabot: true });
    fs.existsSync.mockImplementation((filePath) => path.basename(filePath) === 'package-lock.json');

    await runWizard();

    expect(inquirer.prompt).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'addDependabot' })
    ]));
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(defaultProjectRoot, '.github'), { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(defaultProjectRoot, '.github', 'dependabot.yml'),
      expect.stringContaining('package-ecosystem: "npm"')
    );
    expect(mockLogger.success).toHaveBeenCalledWith('Created .github/dependabot.yml');
  });

  test('should add Dependabot config for yarn when user accepts and yarn.lock exists', async () => {
    mockPrompts({ addDependabot: true });
    fs.existsSync.mockImplementation((filePath) => path.basename(filePath) === 'yarn.lock');

    await runWizard();

    expect(inquirer.prompt).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'addDependabot' })
    ]));
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(defaultProjectRoot, '.github'), { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(defaultProjectRoot, '.github', 'dependabot.yml'),
      expect.stringContaining('package-ecosystem: "yarn"')
    );
    expect(mockLogger.success).toHaveBeenCalledWith('Created .github/dependabot.yml');
  });

  test('should default to npm for Dependabot config when user accepts and no lockfile exists', async () => {
    mockPrompts({ addDependabot: true });
    // fs.existsSync already defaults to false for lockfiles in beforeEach

    await runWizard();

    expect(inquirer.prompt).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'addDependabot' })
    ]));
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(defaultProjectRoot, '.github'), { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(defaultProjectRoot, '.github', 'dependabot.yml'),
      expect.stringContaining('package-ecosystem: "npm"') // Default case
    );
    expect(mockLogger.success).toHaveBeenCalledWith('Created .github/dependabot.yml');
  });

  test('should NOT add Dependabot config when user declines', async () => {
    mockPrompts({ addDependabot: false });

    await runWizard();

    expect(inquirer.prompt).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'addDependabot' })
    ]));
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalledWith(
      path.join(defaultProjectRoot, '.github', 'dependabot.yml'),
      expect.anything()
    );
  });

  test('should NOT call mkdirSync if .github directory already exists', async () => {
    mockPrompts({ addDependabot: true });
    fs.existsSync.mockImplementation((filePath) => {
      const basename = path.basename(filePath);
      // .github exists, package-lock exists
      return basename === '.github' || basename === 'package-lock.json';
    });

    await runWizard();

    expect(inquirer.prompt).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'addDependabot' })
    ]));
    expect(fs.existsSync).toHaveBeenCalledWith(path.join(defaultProjectRoot, '.github'));
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(defaultProjectRoot, '.github', 'dependabot.yml'),
      expect.stringContaining('package-ecosystem: "npm"')
    );
    expect(mockLogger.success).toHaveBeenCalledWith('Created .github/dependabot.yml');
  });

  // Test the 'custom' approach path as well
  test('should add Dependabot config for npm via custom approach', async () => {
    // Mock prompts for custom flow, including the second Dependabot prompt
    inquirer.prompt.mockResolvedValueOnce({ approach: 'custom' }) // First prompt for approach
      .mockResolvedValueOnce({ addDependabotCustom: true }); // Second prompt specifically for Dependabot in custom flow

    fs.existsSync.mockImplementation((filePath) => path.basename(filePath) === 'package-lock.json');

    await runWizard();

    // Check the second prompt was called
    expect(inquirer.prompt).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'addDependabotCustom' })
    ]));
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(defaultProjectRoot, '.github'), { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(defaultProjectRoot, '.github', 'dependabot.yml'),
      expect.stringContaining('package-ecosystem: "npm"')
    );
    expect(mockLogger.success).toHaveBeenCalledWith('Created .github/dependabot.yml');
  });

  test('should NOT add Dependabot config via custom approach when user declines', async () => {
    inquirer.prompt.mockResolvedValueOnce({ approach: 'custom' })
      .mockResolvedValueOnce({ addDependabotCustom: false });

    await runWizard();

    expect(inquirer.prompt).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'addDependabotCustom' })
    ]));
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalledWith(
      path.join(defaultProjectRoot, '.github', 'dependabot.yml'),
      expect.anything()
    );
  });

});