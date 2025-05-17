import path from 'path';
import fs from 'fs-extra';
import { GitHubActionsSetup } from '../src/utils/github-actions-setup';

// Mock fs module
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock project detector
jest.mock('../src/utils/project-detector', () => {
  return {
    ProjectDetector: jest.fn().mockImplementation(() => {
      return {
        hasTypeScript: jest.fn().mockReturnValue(true),
        hasEslint: jest.fn().mockReturnValue(true),
        hasPrettier: jest.fn().mockReturnValue(true),
      };
    }),
  };
});

// Mock feedback
jest.mock('../src/utils/feedback', () => {
  return {
    Feedback: {
      info: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      section: jest.fn(),
    },
  };
});

describe('GitHubActionsSetup', () => {
  const testDir = '/test-project';
  let setup: GitHubActionsSetup;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create new instance for each test
    setup = new GitHubActionsSetup(testDir);

    // Mock directory exists
    mockedFs.pathExists.mockResolvedValue(false);
    mockedFs.ensureDir.mockResolvedValue(undefined);
    mockedFs.copy.mockResolvedValue(undefined);
    mockedFs.readJson.mockResolvedValue({
      scripts: {},
    });
    mockedFs.writeJson.mockResolvedValue(undefined);
  });

  describe('ensureDirectories', () => {
    it('should create GitHub workflows directories', async () => {
      await setup.ensureDirectories();

      expect(mockedFs.ensureDir).toHaveBeenCalledWith(
        path.join(testDir, '.github')
      );
      expect(mockedFs.ensureDir).toHaveBeenCalledWith(
        path.join(testDir, '.github', 'workflows')
      );
    });

    it('should handle errors', async () => {
      mockedFs.ensureDir.mockRejectedValueOnce(
        new Error('Directory creation failed')
      );

      const result = await setup.ensureDirectories();

      expect(result).toBe(false);
    });
  });

  describe('copyWorkflow', () => {
    it('should copy workflow files from templates', async () => {
      await setup.copyWorkflow('ci.yml');

      expect(mockedFs.pathExists).toHaveBeenCalledTimes(2);
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining('ci.yml'),
        path.join(testDir, '.github', 'workflows', 'ci.yml')
      );
    });

    it('should skip if target file already exists', async () => {
      // Target file exists
      mockedFs.pathExists.mockImplementation(async filePath => {
        return filePath.toString().includes('workflows/ci.yml');
      });

      await setup.copyWorkflow('ci.yml');

      expect(mockedFs.copy).not.toHaveBeenCalled();
    });

    it('should handle source file not found', async () => {
      // Source file doesn't exist
      mockedFs.pathExists.mockImplementation(async filePath => {
        return !filePath.toString().includes('templates');
      });

      const result = await setup.copyWorkflow('ci.yml');

      expect(result).toBe(false);
      expect(mockedFs.copy).not.toHaveBeenCalled();
    });
  });

  describe('setupPackageJsonScripts', () => {
    it('should add missing CI scripts to package.json', async () => {
      await setup.setupPackageJsonScripts();

      expect(mockedFs.readJson).toHaveBeenCalledWith(
        path.join(testDir, 'package.json')
      );
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        path.join(testDir, 'package.json'),
        expect.objectContaining({
          scripts: expect.objectContaining({
            test: 'jest',
            typecheck: 'tsc --noEmit',
            lint: 'eslint . --ext .ts,.js',
            'format:check': 'prettier --check "**/*.{ts,js,json,md}"',
            build: 'tsc',
          }),
        }),
        { spaces: 2 }
      );
    });

    it('should not overwrite existing scripts', async () => {
      // Package.json already has the scripts
      mockedFs.readJson.mockResolvedValueOnce({
        scripts: {
          test: 'jest --coverage',
          typecheck: 'tsc --noEmit --watch',
          lint: 'custom-linter',
          'format:check': 'custom-formatter',
          build: 'custom-build',
        },
      });

      await setup.setupPackageJsonScripts();

      // Should not write changes
      expect(mockedFs.writeJson).not.toHaveBeenCalled();
    });
  });

  describe('setupGitHubActions', () => {
    it('should set up all workflows by default', async () => {
      // Mock individual workflow methods
      const spyCIWorkflow = jest
        .spyOn(setup, 'setupCIWorkflow')
        .mockResolvedValue(true);
      const spyReleaseWorkflow = jest
        .spyOn(setup, 'setupReleaseWorkflow')
        .mockResolvedValue(true);
      const spyDocsWorkflow = jest
        .spyOn(setup, 'setupDocsWorkflow')
        .mockResolvedValue(true);
      const spyIssueWorkflow = jest
        .spyOn(setup, 'setupIssueOnFailureWorkflow')
        .mockResolvedValue(true);
      const spyDependabot = jest
        .spyOn(setup, 'setupDependabot')
        .mockResolvedValue(true);
      const spyScripts = jest
        .spyOn(setup, 'setupPackageJsonScripts')
        .mockResolvedValue(true);

      await setup.setupGitHubActions();

      expect(spyCIWorkflow).toHaveBeenCalled();
      expect(spyReleaseWorkflow).toHaveBeenCalled();
      expect(spyDocsWorkflow).toHaveBeenCalled();
      expect(spyIssueWorkflow).toHaveBeenCalled();
      expect(spyDependabot).toHaveBeenCalled();
      expect(spyScripts).toHaveBeenCalled();
    });

    it('should allow selective workflow setup', async () => {
      // Mock individual workflow methods
      const spyCIWorkflow = jest
        .spyOn(setup, 'setupCIWorkflow')
        .mockResolvedValue(true);
      const spyReleaseWorkflow = jest
        .spyOn(setup, 'setupReleaseWorkflow')
        .mockResolvedValue(true);
      const spyDocsWorkflow = jest
        .spyOn(setup, 'setupDocsWorkflow')
        .mockResolvedValue(true);
      const spyIssueWorkflow = jest
        .spyOn(setup, 'setupIssueOnFailureWorkflow')
        .mockResolvedValue(true);

      await setup.setupGitHubActions({
        setupCI: true,
        setupRelease: false,
        setupDocs: true,
        setupIssueOnFailure: false,
      });

      expect(spyCIWorkflow).toHaveBeenCalled();
      expect(spyReleaseWorkflow).not.toHaveBeenCalled();
      expect(spyDocsWorkflow).toHaveBeenCalled();
      expect(spyIssueWorkflow).not.toHaveBeenCalled();
    });

    it('should handle directory creation failure', async () => {
      // Mock directories creation failure
      const spyDirs = jest
        .spyOn(setup, 'ensureDirectories')
        .mockResolvedValue(false);
      const spyCIWorkflow = jest.spyOn(setup, 'setupCIWorkflow');

      const result = await setup.setupGitHubActions();

      expect(result).toBe(false);
      expect(spyDirs).toHaveBeenCalled();
      expect(spyCIWorkflow).not.toHaveBeenCalled();
    });
  });
});
