/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ESLint Setup Utility
 * 
 * Utility for setting up and configuring ESLint in projects.
 */

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { Feedback } from './feedback';
import { PackageManager, ProjectDetector } from './project-detector';

/**
 * ESLint configuration options
 */
export interface ESLintConfig {
  extends?: string[];
  parser?: string;
  parserOptions?: {
    ecmaVersion?: number | 'latest';
    sourceType?: 'module' | 'script';
    ecmaFeatures?: {
      jsx?: boolean;
      [key: string]: boolean | undefined;
    };
    project?: string | string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  plugins?: string[];
  env?: {
    browser?: boolean;
    node?: boolean;
    es6?: boolean;
    jest?: boolean;
    [key: string]: boolean | undefined;
  };
  rules?: {
    [key: string]: 'off' | 'warn' | 'error' | [string, ...any[]];
  };
  settings?: {
    [key: string]: any;
  };
  overrides?: Array<{
    files: string | string[];
    rules?: {
      [key: string]: 'off' | 'warn' | 'error' | [string, ...any[]];
    };
    [key: string]: any;
  }>;
  ignorePatterns?: string[];
}

/**
 * Dependencies required for ESLint installation
 */
export interface ESLintDependencies {
  [packageName: string]: string;
}

/**
 * Default ESLint base configuration
 */
export const DEFAULT_ESLINT_CONFIG: ESLintConfig = {
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  env: {
    node: true,
    es6: true
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'warn'
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/']
};

/**
 * Default ESLint TypeScript configuration
 */
export const DEFAULT_TYPESCRIPT_CONFIG: ESLintConfig = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    es6: true
  },
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/']
};

/**
 * Default ESLint React configuration
 */
export const DEFAULT_REACT_CONFIG: ESLintConfig = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['react', 'react-hooks'],
  env: {
    browser: true,
    es6: true
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'react/prop-types': 'warn',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/']
};

/**
 * Default ESLint dependencies
 */
export const DEFAULT_ESLINT_DEPENDENCIES: ESLintDependencies = {
  'eslint': '^8.44.0'
};

/**
 * Default TypeScript ESLint dependencies
 */
export const DEFAULT_TYPESCRIPT_DEPENDENCIES: ESLintDependencies = {
  'eslint': '^8.44.0',
  '@typescript-eslint/eslint-plugin': '^6.1.0',
  '@typescript-eslint/parser': '^6.1.0'
};

/**
 * Default React ESLint dependencies
 */
export const DEFAULT_REACT_DEPENDENCIES: ESLintDependencies = {
  'eslint': '^8.44.0',
  'eslint-plugin-react': '^7.33.0',
  'eslint-plugin-react-hooks': '^4.6.0'
};

/**
 * Utility for setting up ESLint
 */
export class ESLintSetup {
  private projectRoot: string;
  private projectDetector: ProjectDetector;
  // Feedback is used statically

  /**
   * Constructor for ESLintSetup
   * 
   * @param projectRoot Path to the project root
   */
  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.projectDetector = new ProjectDetector(projectRoot);
    // Note: Feedback is not needed as an instance since all methods are static
  }

  /**
   * Check if ESLint is already installed
   */
  async isESLintInstalled(): Promise<boolean> {
    return this.projectDetector.hasEslint();
  }

  /**
   * Get appropriate ESLint configuration based on project type
   */
  async getESLintConfig(): Promise<ESLintConfig> {
    const hasTypeScript = await this.projectDetector.hasTypeScript();
    const hasReact = await this.hasReact();
    
    if (hasTypeScript && hasReact) {
      // Merge TypeScript and React configs
      return this.mergeConfigs(DEFAULT_TYPESCRIPT_CONFIG, DEFAULT_REACT_CONFIG);
    } else if (hasTypeScript) {
      return DEFAULT_TYPESCRIPT_CONFIG;
    } else if (hasReact) {
      return DEFAULT_REACT_CONFIG;
    } else {
      return DEFAULT_ESLINT_CONFIG;
    }
  }

  /**
   * Get required dependencies for ESLint
   */
  async getESLintDependencies(): Promise<ESLintDependencies> {
    const hasTypeScript = await this.projectDetector.hasTypeScript();
    const hasReact = await this.hasReact();
    
    let dependencies = { ...DEFAULT_ESLINT_DEPENDENCIES };
    
    if (hasTypeScript) {
      dependencies = { ...dependencies, ...DEFAULT_TYPESCRIPT_DEPENDENCIES };
    }
    
    if (hasReact) {
      dependencies = { ...dependencies, ...DEFAULT_REACT_DEPENDENCIES };
    }
    
    return dependencies;
  }

  /**
   * Install ESLint and required dependencies
   */
  async installESLint(): Promise<boolean> {
    try {
      if (await this.isESLintInstalled()) {
        Feedback.info('ESLint is already installed');
        return true;
      }
      
      const dependencies = await this.getESLintDependencies();
      const packageManager = await this.projectDetector.getPackageManager();
      
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
      
      Feedback.info('Installing ESLint and dependencies...');
      execSync(installCommand, { cwd: this.projectRoot, stdio: 'inherit' });
      
      Feedback.success('ESLint installed successfully');
      return true;
    } catch (error) {
      Feedback.error(`Failed to install ESLint: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Create ESLint configuration file
   */
  async createESLintConfig(): Promise<boolean> {
    try {
      const configPath = path.join(this.projectRoot, '.eslintrc.json');
      
      // Check if config already exists
      if (await fs.pathExists(configPath)) {
        Feedback.info('ESLint configuration file already exists');
        return true;
      }
      
      // Get appropriate configuration
      const config = await this.getESLintConfig();
      
      // Write configuration file
      await fs.writeJson(configPath, config, { spaces: 2 });
      
      Feedback.success('ESLint configuration created successfully');
      return true;
    } catch (error) {
      Feedback.error(`Failed to create ESLint config: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Create .eslintignore file
   */
  async createESLintIgnore(): Promise<boolean> {
    try {
      const ignorePath = path.join(this.projectRoot, '.eslintignore');
      
      // Check if file already exists
      if (await fs.pathExists(ignorePath)) {
        Feedback.info('.eslintignore file already exists');
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
        '.git/'
      ];
      
      // Write ignore file
      await fs.writeFile(ignorePath, ignorePatterns.join('\n') + '\n');
      
      Feedback.success('.eslintignore file created successfully');
      return true;
    } catch (error) {
      Feedback.error(`Failed to create .eslintignore: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Add ESLint scripts to package.json
   */
  async addESLintScripts(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      
      // Read existing package.json
      const packageJson = await fs.readJson(packageJsonPath);
      
      // Initialize scripts object if it doesn't exist
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }
      
      // Add lint scripts if they don't exist
      if (!packageJson.scripts.lint) {
        packageJson.scripts.lint = 'eslint .';
      }
      
      if (!packageJson.scripts['lint:fix']) {
        packageJson.scripts['lint:fix'] = 'eslint . --fix';
      }
      
      // Write updated package.json
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      
      Feedback.success('ESLint scripts added to package.json');
      return true;
    } catch (error) {
      Feedback.error(`Failed to add ESLint scripts: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Setup ESLint in the project
   */
  async setupESLint(): Promise<boolean> {
    try {
      // Install ESLint
      const installed = await this.installESLint();
      if (!installed) return false;
      
      // Create ESLint config
      const configCreated = await this.createESLintConfig();
      if (!configCreated) return false;
      
      // Create .eslintignore
      const ignoreCreated = await this.createESLintIgnore();
      if (!ignoreCreated) return false;
      
      // Add scripts to package.json
      const scriptsAdded = await this.addESLintScripts();
      if (!scriptsAdded) return false;
      
      Feedback.success('ESLint setup completed successfully');
      return true;
    } catch (error) {
      Feedback.error(`ESLint setup failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Check if project uses React
   */
  private async hasReact(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (!await fs.pathExists(packageJsonPath)) return false;
      
      const packageJson = await fs.readJson(packageJsonPath);
      const dependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
      };
      
      return (
        'react' in dependencies ||
        'react-dom' in dependencies ||
        'next' in dependencies
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Merge multiple ESLint configurations
   */
  private mergeConfigs(...configs: ESLintConfig[]): ESLintConfig {
    const result: ESLintConfig = {};
    
    for (const config of configs) {
      // Merge extends
      if (config.extends) {
        if (!result.extends) result.extends = [];
        result.extends = [...new Set([...result.extends, ...config.extends])];
      }
      
      // Merge plugins
      if (config.plugins) {
        if (!result.plugins) result.plugins = [];
        result.plugins = [...new Set([...result.plugins, ...config.plugins])];
      }
      
      // Take the last parser
      if (config.parser) {
        result.parser = config.parser;
      }
      
      // Merge parserOptions
      if (config.parserOptions) {
        if (!result.parserOptions) result.parserOptions = {};
        result.parserOptions = { ...result.parserOptions, ...config.parserOptions };
        
        // Handle ecmaFeatures separately
        if (config.parserOptions.ecmaFeatures) {
          if (!result.parserOptions.ecmaFeatures) result.parserOptions.ecmaFeatures = {};
          result.parserOptions.ecmaFeatures = {
            ...result.parserOptions.ecmaFeatures,
            ...config.parserOptions.ecmaFeatures
          };
        }
      }
      
      // Merge env
      if (config.env) {
        if (!result.env) result.env = {};
        result.env = { ...result.env, ...config.env };
      }
      
      // Merge rules
      if (config.rules) {
        if (!result.rules) result.rules = {};
        result.rules = { ...result.rules, ...config.rules };
      }
      
      // Merge settings
      if (config.settings) {
        if (!result.settings) result.settings = {};
        result.settings = { ...result.settings, ...config.settings };
      }
      
      // Merge overrides
      if (config.overrides) {
        if (!result.overrides) result.overrides = [];
        result.overrides = [...result.overrides, ...config.overrides];
      }
      
      // Merge ignorePatterns
      if (config.ignorePatterns) {
        if (!result.ignorePatterns) result.ignorePatterns = [];
        result.ignorePatterns = [...new Set([...result.ignorePatterns, ...config.ignorePatterns])];
      }
    }
    
    return result;
  }
}

export default ESLintSetup;
/* eslint-enable @typescript-eslint/no-explicit-any */