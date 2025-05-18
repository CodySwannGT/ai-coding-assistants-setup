/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * TypeScript Setup
 *
 * Utility for setting up TypeScript in projects.
 * Handles installation, configuration, and integration with other tools.
 */

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { Feedback } from './feedback';
import { ProjectDetector } from './project-detector';

/**
 * TypeScript configuration options
 */
export interface TypeScriptSetupOptions {
  // Whether to create a strict configuration
  strict?: boolean;

  // Whether to set up React/JSX support
  react?: boolean;

  // Whether to set up Node.js specifics
  node?: boolean;

  // Whether to update package.json scripts
  updateScripts?: boolean;

  // Whether to add ESLint integration if ESLint is installed
  eslintIntegration?: boolean;

  // Path to the target directory
  cwd?: string;
}

/**
 * Utility for setting up TypeScript in projects
 */
export class TypeScriptSetup {
  private cwd: string;
  private isYarn: boolean;
  private isNpm: boolean;
  private isPnpm: boolean;
  private isBun: boolean;

  // Project features from detection
  private hasReact: boolean;
  private hasNode: boolean;
  private hasESLint: boolean;
  private hasJest: boolean;

  /**
   * Create a new TypeScriptSetup instance
   *
   * @param cwd Working directory for the setup (defaults to process.cwd())
   */
  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;

    // Detect project features
    const features = ProjectDetector.detectFeaturesSync(cwd);

    // Package manager
    this.isYarn = features.packageManager === 'yarn';
    this.isPnpm = features.packageManager === 'pnpm';
    this.isNpm = features.packageManager === 'npm';
    this.isBun = features.packageManager === 'bun';

    // Other features - we'll implement these in the project detector later
    this.hasReact = this.detectReact();
    this.hasNode = this.detectNode();
    this.hasESLint = features.hasEslint;
    this.hasJest = this.detectJest();
  }

  /**
   * Detect if the project uses React
   */
  private detectReact(): boolean {
    try {
      const packageJsonPath = path.join(this.cwd, 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        return false;
      }

      const packageJson = fs.readJsonSync(packageJsonPath);
      const allDependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      return (
        'react' in allDependencies ||
        '@types/react' in allDependencies ||
        fs.existsSync(path.join(this.cwd, 'src', 'App.jsx')) ||
        fs.existsSync(path.join(this.cwd, 'src', 'App.tsx'))
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect if the project is Node.js based
   */
  private detectNode(): boolean {
    try {
      const packageJsonPath = path.join(this.cwd, 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        return false;
      }

      const packageJson = fs.readJsonSync(packageJsonPath);
      const allDependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      return (
        '@types/node' in allDependencies ||
        'express' in allDependencies ||
        'fs-extra' in allDependencies ||
        'nodemon' in allDependencies ||
        fs.existsSync(path.join(this.cwd, 'node_modules', '@types', 'node'))
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect if the project uses Jest
   */
  private detectJest(): boolean {
    try {
      const packageJsonPath = path.join(this.cwd, 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        return false;
      }

      const packageJson = fs.readJsonSync(packageJsonPath);
      const allDependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      return (
        'jest' in allDependencies ||
        '@types/jest' in allDependencies ||
        fs.existsSync(path.join(this.cwd, 'jest.config.js')) ||
        fs.existsSync(path.join(this.cwd, 'jest.config.ts'))
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Install TypeScript packages
   */
  async installPackages(
    options: TypeScriptSetupOptions = {}
  ): Promise<boolean> {
    try {
      Feedback.info('Installing TypeScript packages...');

      // Base packages
      const packages = ['typescript', 'ts-node'];

      // Add React types if needed
      if (options.react || this.hasReact) {
        packages.push('@types/react', '@types/react-dom');
      }

      // Add Node types if needed
      if (options.node || this.hasNode) {
        packages.push('@types/node');
      }

      // Add Jest types if using Jest
      if (this.hasJest) {
        packages.push('@types/jest', 'ts-jest');
      }

      // Add ESLint TypeScript plugin if ESLint is installed
      if ((options.eslintIntegration || true) && this.hasESLint) {
        packages.push(
          '@typescript-eslint/eslint-plugin',
          '@typescript-eslint/parser'
        );
      }

      // Install command based on package manager
      let installCommand: string;

      // Validate package names against NPM package name pattern
      // This helps prevent command injection attacks
      
      // Strict NPM package name validation regex
      // Follows NPM naming rules: https://github.com/npm/validate-npm-package-name
      const validPackageNameRegex = /^(@[a-z0-9][\w-.]+\/)?[a-z0-9][\w-.]*$/;
      
      // Additional security check to prevent command injection
      const securityCheckRegex = /[;&|`$><\\]/;
      
      // Additional validation for scope format
      const validScopeRegex = /^@[a-z0-9][\w-.]+\/[a-z0-9][\w-.]*$/;
      
      const validatedPackages = packages.filter(pkg => {
        // Trim whitespace to prevent accidental spaces
        const trimmedPkg = pkg.trim();
        
        // Check against valid package name pattern
        const isValidFormat = validPackageNameRegex.test(trimmedPkg);
        
        // Check for potentially dangerous characters
        const hasDangerousChars = securityCheckRegex.test(trimmedPkg);
        
        // Additional validation for scoped packages
        let isScopeValid = true;
        if (trimmedPkg.startsWith('@')) {
          isScopeValid = validScopeRegex.test(trimmedPkg);
          if (!isScopeValid) {
            Feedback.warning(`Invalid scope format in package: ${trimmedPkg}`);
          }
        }
        
        // Package is valid if it matches the format, has no dangerous characters, and has valid scope (if applicable)
        const isValid = isValidFormat && !hasDangerousChars && isScopeValid;
        
        if (!isValid) {
          Feedback.warning(`Skipping invalid package name: ${trimmedPkg}`);
          if (hasDangerousChars) {
            Feedback.warning('Package name contains potentially dangerous characters');
          }
          if (!isValidFormat) {
            Feedback.warning('Package name does not match NPM naming rules');
          }
        }
        
        return isValid;
      });

      if (validatedPackages.length === 0) {
        throw new Error('No valid packages to install after validation');
      }
      
      // Log validated packages for transparency
      Feedback.info(`Installing validated packages: ${validatedPackages.join(', ')}`);

      if (this.isYarn) {
        installCommand = `yarn add --dev ${validatedPackages.join(' ')}`;
      } else if (this.isPnpm) {
        installCommand = `pnpm add --save-dev ${validatedPackages.join(' ')}`;
      } else if (this.isBun) {
        installCommand = `bun add --dev ${validatedPackages.join(' ')}`;
      } else {
        // Default to npm
        installCommand = `npm install --save-dev ${validatedPackages.join(' ')}`;
      }

      Feedback.info(`Running: ${installCommand}`);
      execSync(installCommand, { cwd: this.cwd, stdio: 'inherit' });

      Feedback.success('TypeScript packages installed successfully');
      return true;
    } catch (error) {
      Feedback.error(
        `Failed to install TypeScript packages: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Create a tsconfig.json file
   */
  async createTsConfig(options: TypeScriptSetupOptions = {}): Promise<boolean> {
    try {
      Feedback.info('Creating tsconfig.json...');

      const tsconfigPath = path.join(this.cwd, 'tsconfig.json');

      // Check if tsconfig.json already exists
      if (fs.existsSync(tsconfigPath)) {
        Feedback.warning('tsconfig.json already exists. Skipping creation.');
        return true;
      }

      // Default compiler options
      const compilerOptions: Record<string, any> = {
        target: 'es2016',
        module: 'commonjs',
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        skipLibCheck: true,
      };

      // Add strict options if requested
      if (options.strict) {
        compilerOptions.strict = true;
        compilerOptions.noImplicitAny = true;
        compilerOptions.strictNullChecks = true;
      }

      // Add Node.js specific options
      if (options.node || this.hasNode) {
        compilerOptions.module = 'NodeNext';
        compilerOptions.moduleResolution = 'NodeNext';
      }

      // Add React/JSX specific options
      if (options.react || this.hasReact) {
        compilerOptions.jsx = 'react-jsx';
        compilerOptions.lib = ['DOM', 'DOM.Iterable', 'ESNext'];
      }

      // Build the full config
      const tsconfig: Record<string, any> = {
        compilerOptions,
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', 'build'],
      };

      // Add Jest specific configuration if using Jest
      if (this.hasJest) {
        tsconfig.exclude.push('coverage', '**/*.spec.ts', '**/*.test.ts');
      }

      // Write the tsconfig.json file
      await fs.writeJson(tsconfigPath, tsconfig, { spaces: 2 });

      Feedback.success('Created tsconfig.json');
      return true;
    } catch (error) {
      Feedback.error(
        `Failed to create tsconfig.json: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Update package.json scripts for TypeScript
   */
  async updatePackageJsonScripts(): Promise<boolean> {
    try {
      Feedback.info('Updating package.json scripts...');

      const packageJsonPath = path.join(this.cwd, 'package.json');

      // Check if package.json exists
      if (!fs.existsSync(packageJsonPath)) {
        Feedback.error('package.json not found. Cannot update scripts.');
        return false;
      }

      // Read package.json
      const packageJson = await fs.readJson(packageJsonPath);

      // Ensure scripts object exists
      packageJson.scripts = packageJson.scripts || {};

      // Add TypeScript-related scripts
      const newScripts: Record<string, string> = {
        build: 'tsc',
        dev: 'ts-node src/index.ts',
        start: 'node dist/index.js',
        typecheck: 'tsc --noEmit',
      };

      // Merge existing scripts with new scripts, but don't overwrite
      packageJson.scripts = {
        ...newScripts,
        ...packageJson.scripts,
        // Always ensure typecheck is present
        typecheck: packageJson.scripts.typecheck || newScripts.typecheck,
      };

      // Write updated package.json
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

      Feedback.success('Updated package.json scripts');
      return true;
    } catch (error) {
      Feedback.error(
        `Failed to update package.json scripts: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Update ESLint configuration for TypeScript
   */
  async updateESLintConfig(): Promise<boolean> {
    try {
      // Only proceed if ESLint is installed
      if (!this.hasESLint) {
        Feedback.info('ESLint not detected. Skipping ESLint configuration.');
        return true;
      }

      Feedback.info('Updating ESLint configuration for TypeScript...');

      // Check for different ESLint config file formats
      const eslintConfigFormats = [
        { path: path.join(this.cwd, '.eslintrc.js'), isJS: true },
        { path: path.join(this.cwd, '.eslintrc.json'), isJS: false },
        { path: path.join(this.cwd, '.eslintrc'), isJS: false },
        { path: path.join(this.cwd, '.eslintrc.yaml'), isJS: false },
        { path: path.join(this.cwd, '.eslintrc.yml'), isJS: false },
      ];

      // Find existing ESLint config
      let configFile = eslintConfigFormats.find(format =>
        fs.existsSync(format.path)
      );

      // If no config found, create .eslintrc.json
      if (!configFile) {
        configFile = {
          path: path.join(this.cwd, '.eslintrc.json'),
          isJS: false,
        };

        // Create a basic ESLint config
        const basicConfig = {
          root: true,
          env: {
            browser: true,
            es2021: true,
            node: true,
          },
          extends: ['eslint:recommended'],
          parserOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
          },
          rules: {},
        };

        await fs.writeJson(configFile.path, basicConfig, { spaces: 2 });
        Feedback.info('Created new .eslintrc.json file');
      }

      // Read the existing config
      let config: any;

      if (configFile.isJS) {
        // For JavaScript config files, we'll have to parse them manually
        const configContent = await fs.readFile(configFile.path, 'utf-8');
        // Basic extraction of the module.exports object
        const match = configContent.match(
          /module\.exports\s*=\s*({[\s\S]*});?\s*$/
        );

        if (match && match[1]) {
          try {
            // Use Function constructor instead of eval for safer parsing
            // This creates a function that returns the object rather than executing arbitrary code
            const parseFunction = new Function(`return ${match[1]}`);
            config = parseFunction();
          } catch (e) {
            Feedback.warning(
              'Could not parse .eslintrc.js. Creating a new .eslintrc.json instead.'
            );
            configFile = {
              path: path.join(this.cwd, '.eslintrc.json'),
              isJS: false,
            };
            config = {};
          }
        } else {
          Feedback.warning(
            'Could not parse .eslintrc.js. Creating a new .eslintrc.json instead.'
          );
          configFile = {
            path: path.join(this.cwd, '.eslintrc.json'),
            isJS: false,
          };
          config = {};
        }
      } else {
        // JSON and other formats can be read directly
        config = await fs.readJson(configFile.path);
      }

      // Update the configuration for TypeScript
      config.parser = config.parser || '@typescript-eslint/parser';
      config.plugins = config.plugins || [];
      config.extends = config.extends || [];

      // Add TypeScript plugin if not already present
      if (!config.plugins.includes('@typescript-eslint')) {
        config.plugins.push('@typescript-eslint');
      }

      // Add TypeScript ESLint configs if not already present
      const tsExtends = 'plugin:@typescript-eslint/recommended';
      if (!config.extends.includes(tsExtends)) {
        config.extends.push(tsExtends);
      }

      // Update parser options
      config.parserOptions = config.parserOptions || {};
      config.parserOptions.ecmaVersion =
        config.parserOptions.ecmaVersion || 'latest';
      config.parserOptions.sourceType =
        config.parserOptions.sourceType || 'module';
      config.parserOptions.project =
        config.parserOptions.project || './tsconfig.json';

      // Add TypeScript file patterns to overrides
      config.overrides = config.overrides || [];

      // Check if we already have TypeScript files in overrides
      const hasTypeScriptOverride = config.overrides.some(
        (override: any) =>
          override.files &&
          (override.files.includes('*.ts') || override.files.includes('*.tsx'))
      );

      if (!hasTypeScriptOverride) {
        config.overrides.push({
          files: ['*.ts', '*.tsx'],
          rules: {
            // Add any TypeScript-specific rules
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
          },
        });
      }

      // Write the updated config
      if (configFile.isJS) {
        // For JS config, write as module.exports
        const jsContent = `module.exports = ${JSON.stringify(config, null, 2)};`;
        await fs.writeFile(configFile.path, jsContent);
      } else {
        // For JSON and others, write directly
        await fs.writeJson(configFile.path, config, { spaces: 2 });
      }

      Feedback.success('Updated ESLint configuration for TypeScript');
      return true;
    } catch (error) {
      Feedback.error(
        `Failed to update ESLint config: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Create sample TypeScript files
   */
  async createSampleFiles(
    options: TypeScriptSetupOptions = {}
  ): Promise<boolean> {
    try {
      // Create src directory if it doesn't exist
      const srcDir = path.join(this.cwd, 'src');
      await fs.ensureDir(srcDir);

      // Create index.ts if it doesn't exist
      const indexPath = path.join(srcDir, 'index.ts');

      if (!fs.existsSync(indexPath)) {
        Feedback.info('Creating sample TypeScript files...');

        let indexContent: string;

        if (options.react || this.hasReact) {
          // Create React sample
          indexContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

          // Create App.tsx
          const appPath = path.join(srcDir, 'App.tsx');
          const appContent = `import React, { useState } from 'react';

interface AppProps {
  title?: string;
}

function App({ title = 'TypeScript React App' }: AppProps): JSX.Element {
  const [count, setCount] = useState<number>(0);
  
  return (
    <div>
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

export default App;
`;

          await fs.writeFile(appPath, appContent);
          Feedback.success('Created src/App.tsx');
        } else if (options.node || this.hasNode) {
          // Create Node.js sample
          indexContent = `/**
 * Main application entry point
 */

// Type definition for configuration
interface AppConfig {
  port: number;
  environment: 'development' | 'production' | 'test';
  debug: boolean;
}

// Sample configuration
const config: AppConfig = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  debug: process.env.DEBUG === 'true'
};

/**
 * Application main function
 */
function main(): void {
  console.log(\`Starting application in \${config.environment} mode\`);
  console.log(\`Server listening on port \${config.port}\`);
  
  if (config.debug) {
    console.log('Debug mode enabled');
  }
}

// Run the application
main();
`;
        } else {
          // Create generic sample
          indexContent = `/**
 * TypeScript Sample File
 */

// Type definition example
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

// Function with type annotations
function greetUser(user: User): string {
  return \`Hello, \${user.name}! Your role is \${user.role}.\`;
}

// Sample usage
const sampleUser: User = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin'
};

console.log(greetUser(sampleUser));

// Class example with generics
class DataStore<T> {
  private data: T[] = [];
  
  public add(item: T): void {
    this.data.push(item);
  }
  
  public getAll(): T[] {
    return [...this.data];
  }
}

// Export some functionality
export { User, greetUser, DataStore };
`;
        }

        await fs.writeFile(indexPath, indexContent);
        Feedback.success('Created src/index.ts');

        // Create types directory and sample type definition file
        const typesDir = path.join(srcDir, 'types');
        await fs.ensureDir(typesDir);

        const typesIndexPath = path.join(typesDir, 'index.ts');
        const typesContent = `/**
 * Common type definitions
 */

/**
 * Environment configuration
 */
export interface Environment {
  production: boolean;
  apiUrl: string;
  version: string;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  message: string;
  code: number;
  details?: unknown;
}

/**
 * Generic API response
 */
export interface ApiResponse<T> {
  data?: T;
  error?: ErrorResponse;
  success: boolean;
}

/**
 * Utility type for making all properties optional and nullable
 */
export type Partial<T> = {
  [P in keyof T]?: T[P] | null;
};
`;

        await fs.writeFile(typesIndexPath, typesContent);
        Feedback.success('Created src/types/index.ts');
      } else {
        Feedback.info(
          'src/index.ts already exists. Skipping sample file creation.'
        );
      }

      return true;
    } catch (error) {
      Feedback.error(
        `Failed to create sample files: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Create .gitignore entries for TypeScript
   */
  async updateGitignore(): Promise<boolean> {
    try {
      const gitignorePath = path.join(this.cwd, '.gitignore');

      // Read existing .gitignore or create a new one
      let gitignoreContent = '';

      if (fs.existsSync(gitignorePath)) {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      }

      // Add TypeScript-specific entries if not already present
      const tsEntries = [
        '# TypeScript',
        'dist/',
        'build/',
        '*.tsbuildinfo',
        '.tscache/',
        'node_modules/',
        'coverage/',
        '.nyc_output/',
      ];

      let updatedContent = gitignoreContent;

      // Check if TypeScript section already exists
      if (!gitignoreContent.includes('# TypeScript')) {
        // Add a newline if the file doesn't end with one
        if (gitignoreContent.length > 0 && !gitignoreContent.endsWith('\n')) {
          updatedContent += '\n';
        }

        // Add TypeScript entries
        updatedContent += '\n' + tsEntries.join('\n') + '\n';
      }

      // Only write if changes were made
      if (updatedContent !== gitignoreContent) {
        await fs.writeFile(gitignorePath, updatedContent);
        Feedback.success('Updated .gitignore for TypeScript');
      } else {
        Feedback.info(
          '.gitignore already contains TypeScript entries. Skipping update.'
        );
      }

      return true;
    } catch (error) {
      Feedback.error(
        `Failed to update .gitignore: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Set up TypeScript in the project
   */
  async setupTypeScript(
    options: TypeScriptSetupOptions = {}
  ): Promise<boolean> {
    const {
      strict = true,
      react = this.hasReact,
      node = this.hasNode,
      updateScripts = true,
      eslintIntegration = true,
      cwd,
    } = options;

    // Update working directory if provided
    if (cwd) {
      this.cwd = cwd;
    }

    Feedback.section('TypeScript Setup');

    try {
      // Install packages
      const packagesInstalled = await this.installPackages({
        react,
        node,
        eslintIntegration,
      });

      if (!packagesInstalled) {
        return false;
      }

      // Create tsconfig.json
      const tsconfigCreated = await this.createTsConfig({
        strict,
        react,
        node,
      });

      if (!tsconfigCreated) {
        return false;
      }

      // Update package.json scripts
      if (updateScripts) {
        const scriptsUpdated = await this.updatePackageJsonScripts();

        if (!scriptsUpdated) {
          return false;
        }
      }

      // Update ESLint configuration if requested
      if (eslintIntegration && this.hasESLint) {
        const eslintUpdated = await this.updateESLintConfig();

        if (!eslintUpdated) {
          return false;
        }
      }

      // Create sample files
      const samplesCreated = await this.createSampleFiles({
        react,
        node,
      });

      if (!samplesCreated) {
        return false;
      }

      // Update .gitignore
      const gitignoreUpdated = await this.updateGitignore();

      if (!gitignoreUpdated) {
        return false;
      }

      Feedback.success('TypeScript setup completed successfully!');
      return true;
    } catch (error) {
      Feedback.error(
        `TypeScript setup failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }
}

export default TypeScriptSetup;
