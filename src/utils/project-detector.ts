import fs from 'fs-extra';
import path from 'path';
import { Feedback } from './feedback';

/**
 * Supported package managers
 */
export enum PackageManager {
  NPM = 'npm',
  YARN = 'yarn',
  PNPM = 'pnpm',
  BUN = 'bun',
  UNKNOWN = 'unknown'
}

/**
 * Project features
 */
export interface ProjectFeatures {
  hasTypeScript: boolean;
  hasEslint: boolean;
  hasPrettier: boolean;
  hasCommitlint: boolean;
  hasHusky: boolean;
  packageManager: PackageManager;
  isMonorepo: boolean;
}

/**
 * Project detector utility
 */
export class ProjectDetector {
  private projectPath: string;
  private featuresCache: ProjectFeatures | null = null;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
  }

  /**
   * Get the project path
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Detect project features
   * 
   * @returns Detected project features
   */
  async detectFeatures(): Promise<ProjectFeatures> {
    // Use cache if available
    if (this.featuresCache) {
      return this.featuresCache;
    }
    
    this.featuresCache = await ProjectDetector.detectFeatures(this.projectPath);
    return this.featuresCache;
  }

  /**
   * Check if project has TypeScript
   */
  async hasTypeScript(): Promise<boolean> {
    const features = await this.detectFeatures();
    return features.hasTypeScript;
  }

  /**
   * Check if project has ESLint
   */
  async hasEslint(): Promise<boolean> {
    const features = await this.detectFeatures();
    return features.hasEslint;
  }

  /**
   * Check if project has Prettier
   */
  async hasPrettier(): Promise<boolean> {
    const features = await this.detectFeatures();
    return features.hasPrettier;
  }

  /**
   * Check if project has Commitlint
   */
  async hasCommitlint(): Promise<boolean> {
    const features = await this.detectFeatures();
    return features.hasCommitlint;
  }

  /**
   * Check if project has Husky
   */
  async hasHusky(): Promise<boolean> {
    const features = await this.detectFeatures();
    return features.hasHusky;
  }

  /**
   * Check if project is a monorepo
   */
  async isMonorepo(): Promise<boolean> {
    const features = await this.detectFeatures();
    return features.isMonorepo;
  }

  /**
   * Get the package manager used in the project
   */
  async getPackageManager(): Promise<PackageManager> {
    const features = await this.detectFeatures();
    return features.packageManager;
  }

  /**
   * Detect package manager synchronously (for simpler usage)
   */
  getPackageManagerSync(): PackageManager {
    // Check for lock files
    const hasYarnLock = fs.existsSync(path.join(this.projectPath, 'yarn.lock'));
    const hasPnpmLock = fs.existsSync(path.join(this.projectPath, 'pnpm-lock.yaml'));
    const hasBunLock = fs.existsSync(path.join(this.projectPath, 'bun.lockb'));
    const hasNpmLock = fs.existsSync(path.join(this.projectPath, 'package-lock.json'));
    
    // Basic detection based on lock files
    if (hasBunLock) return PackageManager.BUN;
    if (hasPnpmLock) return PackageManager.PNPM;
    if (hasYarnLock) return PackageManager.YARN;
    if (hasNpmLock) return PackageManager.NPM;
    
    return PackageManager.NPM; // Default
  }
  
  /**
   * Detect project features synchronously
   */
  detectFeaturesSync(): ProjectFeatures {
    return ProjectDetector.detectFeaturesSync(this.projectPath);
  }

  /**
   * Check if project has Claude CLI
   */
  async hasClaude(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) return false;
      
      const packageJson = await fs.readJson(packageJsonPath);
      const allDependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
      };
      
      return '@anthropic-ai/claude-code' in allDependencies || 
             'claude-cli' in allDependencies;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect project features
   * 
   * @param projectPath Path to the project
   * @returns Detected project features
   */
  static async detectFeatures(projectPath: string): Promise<ProjectFeatures> {
    Feedback.info('Analyzing project structure...');
    
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    // Default features
    const features: ProjectFeatures = {
      hasTypeScript: false,
      hasEslint: false,
      hasPrettier: false,
      hasCommitlint: false,
      hasHusky: false,
      packageManager: PackageManager.NPM, // Default to npm
      isMonorepo: false
    };
    
    // Check if package.json exists
    if (!fs.existsSync(packageJsonPath)) {
      Feedback.warning('No package.json found. Assuming npm with no existing features.');
      return features;
    }
    
    try {
      // Read and parse package.json
      const packageJson = await fs.readJson(packageJsonPath);
      
      // Check dependencies and devDependencies
      const allDependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
      };
      
      // Check for TypeScript
      features.hasTypeScript = 
        'typescript' in allDependencies || 
        fs.existsSync(path.join(projectPath, 'tsconfig.json'));
      
      // Check for ESLint
      features.hasEslint = 
        'eslint' in allDependencies ||
        fs.existsSync(path.join(projectPath, '.eslintrc.js')) ||
        fs.existsSync(path.join(projectPath, '.eslintrc.json')) ||
        fs.existsSync(path.join(projectPath, '.eslintrc.yml')) ||
        fs.existsSync(path.join(projectPath, '.eslintrc')) ||
        fs.existsSync(path.join(projectPath, '.eslintrc.cjs'));
      
      // Check for Prettier
      features.hasPrettier = 
        'prettier' in allDependencies ||
        fs.existsSync(path.join(projectPath, '.prettierrc')) ||
        fs.existsSync(path.join(projectPath, '.prettierrc.js')) ||
        fs.existsSync(path.join(projectPath, '.prettierrc.json')) ||
        fs.existsSync(path.join(projectPath, '.prettierrc.yml')) ||
        fs.existsSync(path.join(projectPath, 'prettier.config.js'));
      
      // Check for Commitlint
      features.hasCommitlint = 
        '@commitlint/cli' in allDependencies ||
        fs.existsSync(path.join(projectPath, '.commitlintrc.js')) ||
        fs.existsSync(path.join(projectPath, 'commitlint.config.js')) ||
        fs.existsSync(path.join(projectPath, '.commitlintrc.json'));
      
      // Check for Husky
      features.hasHusky = 
        'husky' in allDependencies ||
        fs.existsSync(path.join(projectPath, '.husky')) ||
        (packageJson.husky !== undefined);
      
      // Check for monorepo
      features.isMonorepo = 
        (packageJson.workspaces !== undefined) ||
        fs.existsSync(path.join(projectPath, 'lerna.json')) ||
        fs.existsSync(path.join(projectPath, 'pnpm-workspace.yaml')) ||
        fs.existsSync(path.join(projectPath, 'turbo.json'));
      
      // Detect package manager
      features.packageManager = await this.detectPackageManager(projectPath);
      
    } catch (error) {
      Feedback.error(`Error reading package.json: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return features;
  }
  
  /**
   * Detect the package manager used in the project
   * 
   * @param projectPath Path to the project
   * @returns Detected package manager
   */
  static async detectPackageManager(projectPath: string): Promise<PackageManager> {
    // Check for lock files
    const hasYarnLock = fs.existsSync(path.join(projectPath, 'yarn.lock'));
    const hasPnpmLock = fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'));
    const hasBunLock = fs.existsSync(path.join(projectPath, 'bun.lockb'));
    const hasNpmLock = fs.existsSync(path.join(projectPath, 'package-lock.json'));
    
    // Check for config files
    const hasYarnRc = fs.existsSync(path.join(projectPath, '.yarnrc')) || 
                      fs.existsSync(path.join(projectPath, '.yarnrc.yml'));
    const hasPnpmRc = fs.existsSync(path.join(projectPath, '.pnpmrc')) ||
                      fs.existsSync(path.join(projectPath, 'pnpm-workspace.yaml'));
    const hasBunConfig = fs.existsSync(path.join(projectPath, 'bunfig.toml'));
    const hasNpmRc = fs.existsSync(path.join(projectPath, '.npmrc'));
    
    // Determine package manager from evidence
    if (hasBunLock || hasBunConfig) {
      return PackageManager.BUN;
    } else if (hasPnpmLock || hasPnpmRc) {
      return PackageManager.PNPM;
    } else if (hasYarnLock || hasYarnRc) {
      return PackageManager.YARN;
    } else if (hasNpmLock || hasNpmRc) {
      return PackageManager.NPM;
    }
    
    // If no lock files found, try to read the package.json packageManager field
    try {
      const packageJson = await fs.readJson(path.join(projectPath, 'package.json'));
      if (packageJson.packageManager) {
        const pm = packageJson.packageManager.toLowerCase();
        if (pm.includes('yarn')) return PackageManager.YARN;
        if (pm.includes('pnpm')) return PackageManager.PNPM;
        if (pm.includes('bun')) return PackageManager.BUN;
        if (pm.includes('npm')) return PackageManager.NPM;
      }
    } catch (error) {
      // Ignore errors reading package.json, we'll use the default
    }
    
    // Default to npm
    return PackageManager.NPM;
  }
  
  /**
   * Get the install command for the given package manager
   * 
   * @param packageManager Package manager
   * @returns Install command for the package manager
   */
  static getInstallCommand(packageManager: PackageManager): string {
    switch (packageManager) {
      case PackageManager.YARN:
        return 'yarn';
      case PackageManager.PNPM:
        return 'pnpm install';
      case PackageManager.BUN:
        return 'bun install';
      case PackageManager.NPM:
      default:
        return 'npm install';
    }
  }
  
  /**
   * Get the command to run a script for the given package manager
   * 
   * @param packageManager Package manager
   * @param script Script name
   * @returns Command to run the script
   */
  static getRunCommand(packageManager: PackageManager, script: string): string {
    switch (packageManager) {
      case PackageManager.YARN:
        return `yarn ${script}`;
      case PackageManager.PNPM:
        return `pnpm run ${script}`;
      case PackageManager.BUN:
        return `bun run ${script}`;
      case PackageManager.NPM:
      default:
        return `npm run ${script}`;
    }
  }
  
  /**
   * Detect project features synchronously
   * 
   * @param projectPath Path to the project
   * @returns Detected project features
   */
  static detectFeaturesSync(projectPath: string): ProjectFeatures {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    // Default features
    const features: ProjectFeatures = {
      hasTypeScript: false,
      hasEslint: false,
      hasPrettier: false,
      hasCommitlint: false,
      hasHusky: false,
      packageManager: PackageManager.NPM, // Default to npm
      isMonorepo: false
    };
    
    // Check if package.json exists
    if (!fs.existsSync(packageJsonPath)) {
      return features;
    }
    
    try {
      // Read and parse package.json
      const packageJson = fs.readJsonSync(packageJsonPath);
      
      // Check dependencies and devDependencies
      const allDependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
      };
      
      // Check for TypeScript
      features.hasTypeScript = 
        'typescript' in allDependencies || 
        fs.existsSync(path.join(projectPath, 'tsconfig.json'));
      
      // Check for ESLint
      features.hasEslint = 
        'eslint' in allDependencies ||
        fs.existsSync(path.join(projectPath, '.eslintrc.js')) ||
        fs.existsSync(path.join(projectPath, '.eslintrc.json')) ||
        fs.existsSync(path.join(projectPath, '.eslintrc.yml')) ||
        fs.existsSync(path.join(projectPath, '.eslintrc')) ||
        fs.existsSync(path.join(projectPath, '.eslintrc.cjs'));
      
      // Check for Prettier
      features.hasPrettier = 
        'prettier' in allDependencies ||
        fs.existsSync(path.join(projectPath, '.prettierrc')) ||
        fs.existsSync(path.join(projectPath, '.prettierrc.js')) ||
        fs.existsSync(path.join(projectPath, '.prettierrc.json')) ||
        fs.existsSync(path.join(projectPath, '.prettierrc.yml')) ||
        fs.existsSync(path.join(projectPath, 'prettier.config.js'));
      
      // Check for Commitlint
      features.hasCommitlint = 
        '@commitlint/cli' in allDependencies ||
        fs.existsSync(path.join(projectPath, '.commitlintrc.js')) ||
        fs.existsSync(path.join(projectPath, 'commitlint.config.js')) ||
        fs.existsSync(path.join(projectPath, '.commitlintrc.json'));
      
      // Check for Husky
      features.hasHusky = 
        'husky' in allDependencies ||
        fs.existsSync(path.join(projectPath, '.husky')) ||
        (packageJson.husky !== undefined);
      
      // Check for monorepo
      features.isMonorepo = 
        (packageJson.workspaces !== undefined) ||
        fs.existsSync(path.join(projectPath, 'lerna.json')) ||
        fs.existsSync(path.join(projectPath, 'pnpm-workspace.yaml')) ||
        fs.existsSync(path.join(projectPath, 'turbo.json'));
      
      // Detect package manager synchronously
      // Check for lock files
      const hasYarnLock = fs.existsSync(path.join(projectPath, 'yarn.lock'));
      const hasPnpmLock = fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'));
      const hasBunLock = fs.existsSync(path.join(projectPath, 'bun.lockb'));
      const hasNpmLock = fs.existsSync(path.join(projectPath, 'package-lock.json'));
      
      if (hasBunLock) features.packageManager = PackageManager.BUN;
      else if (hasPnpmLock) features.packageManager = PackageManager.PNPM;
      else if (hasYarnLock) features.packageManager = PackageManager.YARN;
      else if (hasNpmLock) features.packageManager = PackageManager.NPM;
      else features.packageManager = PackageManager.NPM;
      
    } catch (error) {
      // Ignore errors reading package.json, we'll use the defaults
    }
    
    return features;
  }

  /**
   * Get a human-readable summary of the project features
   * 
   * @param features Project features
   * @returns Human-readable summary
   */
  static getFeaturesSummary(features: ProjectFeatures): string {
    const summary = [
      `📦 Package manager: ${features.packageManager}`,
      `${features.isMonorepo ? '✅' : '❌'} Monorepo`,
      `${features.hasTypeScript ? '✅' : '❌'} TypeScript`,
      `${features.hasEslint ? '✅' : '❌'} ESLint`,
      `${features.hasPrettier ? '✅' : '❌'} Prettier`,
      `${features.hasCommitlint ? '✅' : '❌'} Commitlint`,
      `${features.hasHusky ? '✅' : '❌'} Husky`
    ];
    
    return summary.join('\n');
  }
}

export default ProjectDetector;