/**
 * Prettier Setup Utility
 * 
 * Utility for setting up and configuring Prettier in projects.
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { Feedback } from './feedback';
import { ProjectDetector, PackageManager } from './project-detector';

/**
 * Prettier configuration options
 */
export interface PrettierConfig {
  printWidth?: number;
  tabWidth?: number;
  useTabs?: boolean;
  semi?: boolean;
  singleQuote?: boolean;
  quoteProps?: 'as-needed' | 'consistent' | 'preserve';
  jsxSingleQuote?: boolean;
  trailingComma?: 'es5' | 'none' | 'all';
  bracketSpacing?: boolean;
  bracketSameLine?: boolean;
  arrowParens?: 'avoid' | 'always';
  parser?: string;
  filepath?: string;
  requirePragma?: boolean;
  insertPragma?: boolean;
  proseWrap?: 'always' | 'never' | 'preserve';
  htmlWhitespaceSensitivity?: 'css' | 'strict' | 'ignore';
  vueIndentScriptAndStyle?: boolean;
  endOfLine?: 'lf' | 'crlf' | 'auto';
  embeddedLanguageFormatting?: 'auto' | 'off';
  singleAttributePerLine?: boolean;
  [key: string]: any;
}

/**
 * Dependencies required for Prettier installation
 */
export interface PrettierDependencies {
  [packageName: string]: string;
}

/**
 * Default Prettier configuration
 */
export const DEFAULT_PRETTIER_CONFIG: PrettierConfig = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};

/**
 * Default Prettier dependencies
 */
export const DEFAULT_PRETTIER_DEPENDENCIES: PrettierDependencies = {
  'prettier': '^3.0.0',
  'eslint-config-prettier': '^8.8.0',
  'eslint-plugin-prettier': '^5.0.0'
};

/**
 * Default Prettier ESLint integration configuration
 */
export const PRETTIER_ESLINT_CONFIG = {
  extends: ['prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error'
  }
};

/**
 * Utility for setting up Prettier
 */
export class PrettierSetup {
  private projectRoot: string;
  private projectDetector: ProjectDetector;
  private feedback: Feedback;

  /**
   * Constructor for PrettierSetup
   * 
   * @param projectRoot Path to the project root
   */
  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.projectDetector = new ProjectDetector(projectRoot);
    this.feedback = new Feedback();
  }

  /**
   * Check if Prettier is already installed
   */
  async isPrettierInstalled(): Promise<boolean> {
    return this.projectDetector.hasPrettier();
  }

  /**
   * Get appropriate Prettier configuration based on project type
   */
  async getPrettierConfig(): Promise<PrettierConfig> {
    // For now, we just use the default config
    // This could be extended to handle different project types
    return { ...DEFAULT_PRETTIER_CONFIG };
  }

  /**
   * Install Prettier and required dependencies
   */
  async installPrettier(): Promise<boolean> {
    try {
      if (await this.isPrettierInstalled()) {
        this.feedback.info('Prettier is already installed');
        return true;
      }
      
      const packageManager = await this.projectDetector.getPackageManager();
      const hasEslint = await this.projectDetector.hasEslint();
      
      let dependencies = { 'prettier': DEFAULT_PRETTIER_DEPENDENCIES.prettier };
      
      // Add ESLint integration dependencies if ESLint is present
      if (hasEslint) {
        dependencies = {
          ...dependencies,
          'eslint-config-prettier': DEFAULT_PRETTIER_DEPENDENCIES['eslint-config-prettier'],
          'eslint-plugin-prettier': DEFAULT_PRETTIER_DEPENDENCIES['eslint-plugin-prettier']
        };
      }
      
      // Create dependency installation command
      const dependencyArgs = Object.entries(dependencies)
        .map(([pkg, version]) => `${pkg}@${version}`)
        .join(' ');
      
      let installCommand = '';
      
      switch (packageManager) {
        case PackageManager.NPM:
          installCommand = `npm install --save-dev ${dependencyArgs}`;
          break;
        case PackageManager.YARN:
          installCommand = `yarn add --dev ${dependencyArgs}`;
          break;
        case PackageManager.PNPM:
          installCommand = `pnpm add --save-dev ${dependencyArgs}`;
          break;
        case PackageManager.BUN:
          installCommand = `bun add --dev ${dependencyArgs}`;
          break;
        default:
          throw new Error(`Unsupported package manager: ${packageManager}`);
      }
      
      this.feedback.info(`Installing Prettier and dependencies...`);
      execSync(installCommand, { cwd: this.projectRoot, stdio: 'inherit' });
      
      this.feedback.success('Prettier installed successfully');
      return true;
    } catch (error) {
      this.feedback.error(`Failed to install Prettier: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Create Prettier configuration file
   */
  async createPrettierConfig(): Promise<boolean> {
    try {
      const configPath = path.join(this.projectRoot, '.prettierrc.json');
      
      // Check if config already exists
      if (await fs.pathExists(configPath)) {
        this.feedback.info('Prettier configuration file already exists');
        return true;
      }
      
      // Get appropriate configuration
      const config = await this.getPrettierConfig();
      
      // Write configuration file
      await fs.writeJson(configPath, config, { spaces: 2 });
      
      this.feedback.success('Prettier configuration created successfully');
      return true;
    } catch (error) {
      this.feedback.error(`Failed to create Prettier config: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Create .prettierignore file
   */
  async createPrettierIgnore(): Promise<boolean> {
    try {
      const ignorePath = path.join(this.projectRoot, '.prettierignore');
      
      // Check if file already exists
      if (await fs.pathExists(ignorePath)) {
        this.feedback.info('.prettierignore file already exists');
        return true;
      }
      
      // Default ignore patterns
      const ignorePatterns = [
        'node_modules/',
        'dist/',
        'build/',
        'coverage/',
        '*.min.js',
        '*.bundle.js',
        '.git/',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml'
      ];
      
      // Write ignore file
      await fs.writeFile(ignorePath, ignorePatterns.join('\n') + '\n');
      
      this.feedback.success('.prettierignore file created successfully');
      return true;
    } catch (error) {
      this.feedback.error(`Failed to create .prettierignore: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Add Prettier scripts to package.json
   */
  async addPrettierScripts(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      
      // Read existing package.json
      const packageJson = await fs.readJson(packageJsonPath);
      
      // Initialize scripts object if it doesn't exist
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }
      
      // Add format scripts if they don't exist
      if (!packageJson.scripts.format) {
        packageJson.scripts.format = 'prettier --write \"./**/*.{js,jsx,ts,tsx,json,md}\"';
      }
      
      if (!packageJson.scripts['format:check']) {
        packageJson.scripts['format:check'] = 'prettier --check \"./**/*.{js,jsx,ts,tsx,json,md}\"';
      }
      
      // Write updated package.json
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      
      this.feedback.success('Prettier scripts added to package.json');
      return true;
    } catch (error) {
      this.feedback.error(`Failed to add Prettier scripts: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Integrate Prettier with ESLint
   */
  async integratePrettierWithESLint(): Promise<boolean> {
    try {
      // Check if ESLint is installed
      const hasEslint = await this.projectDetector.hasEslint();
      
      if (!hasEslint) {
        this.feedback.info('ESLint is not installed, skipping integration');
        return true;
      }
      
      const eslintConfigPath = path.join(this.projectRoot, '.eslintrc.json');
      
      // Check if ESLint config exists
      if (!await fs.pathExists(eslintConfigPath)) {
        this.feedback.warning('ESLint configuration not found, skipping integration');
        return false;
      }
      
      // Read existing ESLint config
      const eslintConfig = await fs.readJson(eslintConfigPath);
      
      // Add Prettier to extends array if not already present
      if (!eslintConfig.extends) {
        eslintConfig.extends = [];
      } else if (typeof eslintConfig.extends === 'string') {
        eslintConfig.extends = [eslintConfig.extends];
      }
      
      if (!eslintConfig.extends.includes('prettier') && !eslintConfig.extends.includes('plugin:prettier/recommended')) {
        eslintConfig.extends.push('prettier');
      }
      
      // Add Prettier to plugins array if not already present
      if (!eslintConfig.plugins) {
        eslintConfig.plugins = [];
      }
      
      if (!eslintConfig.plugins.includes('prettier')) {
        eslintConfig.plugins.push('prettier');
      }
      
      // Add Prettier rules if not already present
      if (!eslintConfig.rules) {
        eslintConfig.rules = {};
      }
      
      eslintConfig.rules['prettier/prettier'] = 'error';
      
      // Write updated ESLint config
      await fs.writeJson(eslintConfigPath, eslintConfig, { spaces: 2 });
      
      this.feedback.success('Prettier integrated with ESLint');
      return true;
    } catch (error) {
      this.feedback.error(`Failed to integrate Prettier with ESLint: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Configure Prettier in the project
   */
  async setupPrettier(): Promise<boolean> {
    try {
      // Install Prettier
      const installed = await this.installPrettier();
      if (!installed) return false;
      
      // Create Prettier config
      const configCreated = await this.createPrettierConfig();
      if (!configCreated) return false;
      
      // Create .prettierignore
      const ignoreCreated = await this.createPrettierIgnore();
      if (!ignoreCreated) return false;
      
      // Add scripts to package.json
      const scriptsAdded = await this.addPrettierScripts();
      if (!scriptsAdded) return false;
      
      // Integrate with ESLint if available
      await this.integratePrettierWithESLint();
      
      this.feedback.success('Prettier setup completed successfully');
      return true;
    } catch (error) {
      this.feedback.error(`Prettier setup failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

export default PrettierSetup;