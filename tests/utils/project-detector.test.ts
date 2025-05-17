import fs from 'fs-extra';
import path from 'path';
import {
  ProjectDetector,
  PackageManager,
} from '../../src/utils/project-detector';

// Mock fs-extra
jest.mock('fs-extra');

// Mock feedback
jest.mock('../../src/utils/feedback', () => ({
  Feedback: {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
}));

describe('ProjectDetector', () => {
  const testProjectPath = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectPackageManager', () => {
    test('should detect yarn from yarn.lock', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation(filePath => {
        return filePath === path.join(testProjectPath, 'yarn.lock');
      });

      // Execute
      const result =
        await ProjectDetector.detectPackageManager(testProjectPath);

      // Verify
      expect(result).toBe(PackageManager.YARN);
    });

    test('should detect pnpm from pnpm-lock.yaml', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation(filePath => {
        return filePath === path.join(testProjectPath, 'pnpm-lock.yaml');
      });

      // Execute
      const result =
        await ProjectDetector.detectPackageManager(testProjectPath);

      // Verify
      expect(result).toBe(PackageManager.PNPM);
    });

    test('should detect bun from bun.lockb', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation(filePath => {
        return filePath === path.join(testProjectPath, 'bun.lockb');
      });

      // Execute
      const result =
        await ProjectDetector.detectPackageManager(testProjectPath);

      // Verify
      expect(result).toBe(PackageManager.BUN);
    });

    test('should detect npm from package-lock.json', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation(filePath => {
        return filePath === path.join(testProjectPath, 'package-lock.json');
      });

      // Execute
      const result =
        await ProjectDetector.detectPackageManager(testProjectPath);

      // Verify
      expect(result).toBe(PackageManager.NPM);
    });

    test('should detect package manager from packageManager field', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readJson as jest.Mock).mockResolvedValue({
        packageManager: 'yarn@3.2.0',
      });

      // Execute
      const result =
        await ProjectDetector.detectPackageManager(testProjectPath);

      // Verify
      expect(result).toBe(PackageManager.YARN);
    });

    test('should default to npm when no evidence is found', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readJson as jest.Mock).mockResolvedValue({});

      // Execute
      const result =
        await ProjectDetector.detectPackageManager(testProjectPath);

      // Verify
      expect(result).toBe(PackageManager.NPM);
    });
  });

  describe('detectFeatures', () => {
    test('should detect TypeScript from package.json and tsconfig.json', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation(filePath => {
        return (
          filePath === path.join(testProjectPath, 'package.json') ||
          filePath === path.join(testProjectPath, 'tsconfig.json')
        );
      });
      (fs.readJson as jest.Mock).mockResolvedValue({
        dependencies: {},
        devDependencies: {},
      });

      // Execute
      const result = await ProjectDetector.detectFeatures(testProjectPath);

      // Verify
      expect(result.hasTypeScript).toBe(true);
    });

    test('should detect TypeScript from typescript dependency', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation(filePath => {
        return filePath === path.join(testProjectPath, 'package.json');
      });
      (fs.readJson as jest.Mock).mockResolvedValue({
        dependencies: {},
        devDependencies: {
          typescript: '^4.9.0',
        },
      });

      // Execute
      const result = await ProjectDetector.detectFeatures(testProjectPath);

      // Verify
      expect(result.hasTypeScript).toBe(true);
    });

    test('should detect ESLint from eslint dependency', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation(filePath => {
        return filePath === path.join(testProjectPath, 'package.json');
      });
      (fs.readJson as jest.Mock).mockResolvedValue({
        dependencies: {},
        devDependencies: {
          eslint: '^8.0.0',
        },
      });

      // Execute
      const result = await ProjectDetector.detectFeatures(testProjectPath);

      // Verify
      expect(result.hasEslint).toBe(true);
    });

    test('should detect monorepo from workspaces', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation(filePath => {
        return filePath === path.join(testProjectPath, 'package.json');
      });
      (fs.readJson as jest.Mock).mockResolvedValue({
        workspaces: ['packages/*'],
      });

      // Execute
      const result = await ProjectDetector.detectFeatures(testProjectPath);

      // Verify
      expect(result.isMonorepo).toBe(true);
    });

    test('should handle missing package.json', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Execute
      const result = await ProjectDetector.detectFeatures(testProjectPath);

      // Verify
      expect(result.packageManager).toBe(PackageManager.NPM);
      expect(result.hasTypeScript).toBe(false);
      expect(result.hasEslint).toBe(false);
      expect(result.hasPrettier).toBe(false);
      expect(result.hasCommitlint).toBe(false);
      expect(result.hasHusky).toBe(false);
      expect(result.isMonorepo).toBe(false);
    });

    test('should handle errors reading package.json', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation(filePath => {
        return filePath === path.join(testProjectPath, 'package.json');
      });
      (fs.readJson as jest.Mock).mockRejectedValue(
        new Error('Failed to read file')
      );

      // Execute
      const result = await ProjectDetector.detectFeatures(testProjectPath);

      // Verify
      expect(result.packageManager).toBe(PackageManager.NPM);
      expect(result.hasTypeScript).toBe(false);
    });
  });

  describe('getInstallCommand', () => {
    test('should get correct install command for each package manager', () => {
      expect(ProjectDetector.getInstallCommand(PackageManager.NPM)).toBe(
        'npm install'
      );
      expect(ProjectDetector.getInstallCommand(PackageManager.YARN)).toBe(
        'yarn'
      );
      expect(ProjectDetector.getInstallCommand(PackageManager.PNPM)).toBe(
        'pnpm install'
      );
      expect(ProjectDetector.getInstallCommand(PackageManager.BUN)).toBe(
        'bun install'
      );
      expect(ProjectDetector.getInstallCommand(PackageManager.UNKNOWN)).toBe(
        'npm install'
      );
    });
  });

  describe('getRunCommand', () => {
    test('should get correct run command for each package manager', () => {
      const scriptName = 'test';
      expect(
        ProjectDetector.getRunCommand(PackageManager.NPM, scriptName)
      ).toBe('npm run test');
      expect(
        ProjectDetector.getRunCommand(PackageManager.YARN, scriptName)
      ).toBe('yarn test');
      expect(
        ProjectDetector.getRunCommand(PackageManager.PNPM, scriptName)
      ).toBe('pnpm run test');
      expect(
        ProjectDetector.getRunCommand(PackageManager.BUN, scriptName)
      ).toBe('bun run test');
      expect(
        ProjectDetector.getRunCommand(PackageManager.UNKNOWN, scriptName)
      ).toBe('npm run test');
    });
  });

  describe('getFeaturesSummary', () => {
    test('should generate correct summary for features', () => {
      const features = {
        hasTypeScript: true,
        hasEslint: true,
        hasPrettier: false,
        hasCommitlint: true,
        hasHusky: false,
        packageManager: PackageManager.YARN,
        isMonorepo: true,
      };

      const summary = ProjectDetector.getFeaturesSummary(features);

      expect(summary).toContain('📦 Package manager: yarn');
      expect(summary).toContain('✅ Monorepo');
      expect(summary).toContain('✅ TypeScript');
      expect(summary).toContain('✅ ESLint');
      expect(summary).toContain('❌ Prettier');
      expect(summary).toContain('✅ Commitlint');
      expect(summary).toContain('❌ Husky');
    });
  });
});
