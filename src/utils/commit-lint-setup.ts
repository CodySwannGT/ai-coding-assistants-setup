/**
 * CommitLint Setup
 * 
 * Utility for setting up commitlint with conventional commits standard.
 * Optionally integrates with husky for commit message validation.
 */

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { Feedback } from './feedback';
import { HuskySetup } from './husky-setup';
import { ProjectDetector } from './project-detector';

export interface CommitLintOptions {
  // Whether to set up husky integration
  setupHusky?: boolean;
  
  // Whether to install commitizen for interactive commits
  installCommitizen?: boolean;
  
  // Path to the target directory
  cwd?: string;
}

export class CommitLintSetup {
  private cwd: string;
  private isYarn: boolean;
  private isNpm: boolean;
  private isPnpm: boolean;
  
  /**
   * Create a new CommitLintSetup instance
   * 
   * @param cwd Working directory for the setup (defaults to process.cwd())
   */
  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    
    // Detect package manager
    const features = ProjectDetector.detectFeaturesSync(cwd);
    this.isYarn = features.packageManager === 'yarn';
    this.isNpm = features.packageManager === 'npm';
    this.isPnpm = features.packageManager === 'pnpm';
  }
  
  /**
   * Install commitlint packages
   */
  async installPackages(installCommitizen: boolean = false): Promise<boolean> {
    try {
      Feedback.info('Installing commitlint packages...');
      
      // Install core packages
      const packages = [
        '@commitlint/cli',
        '@commitlint/config-conventional'
      ];
      
      // Add commitizen if requested
      if (installCommitizen) {
        packages.push('commitizen', 'cz-conventional-changelog');
      }
      
      // Install packages based on package manager
      if (this.isYarn) {
        execSync(`yarn add --dev ${packages.join(' ')}`, { cwd: this.cwd, stdio: 'inherit' });
      } else if (this.isPnpm) {
        execSync(`pnpm add --save-dev ${packages.join(' ')}`, { cwd: this.cwd, stdio: 'inherit' });
      } else {
        // Default to npm
        execSync(`npm install --save-dev ${packages.join(' ')}`, { cwd: this.cwd, stdio: 'inherit' });
      }
      
      return true;
    } catch (error) {
      Feedback.error(`Failed to install commitlint packages: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Create commitlint configuration file
   */
  async createConfig(): Promise<boolean> {
    try {
      Feedback.info('Creating commitlint configuration...');
      
      const configPath = path.join(this.cwd, 'commitlint.config.js');
      
      // Check if the file exists
      if (await fs.pathExists(configPath)) {
        Feedback.warning('commitlint.config.js already exists. Skipping creation.');
        return true;
      }
      
      // Create the config file
      const configContent = `export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [2, 'always', 100],
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
  },
};`;
      
      await fs.writeFile(configPath, configContent);
      
      Feedback.success('Created commitlint.config.js');
      return true;
    } catch (error) {
      Feedback.error(`Failed to create commitlint configuration: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Create commit message template
   */
  async createCommitMsgTemplate(): Promise<boolean> {
    try {
      Feedback.info('Creating commit message template...');
      
      const templatePath = path.join(this.cwd, '.gitmessage');
      
      // Check if the file exists
      if (await fs.pathExists(templatePath)) {
        Feedback.warning('.gitmessage template already exists. Skipping creation.');
        return true;
      }
      
      // Create the template file
      const templateContent = `# <type>(<scope>): <short summary>
#   │       │             │
#   │       │             └─⫸ Summary in present tense. Not capitalized. No period at the end.
#   │       │
#   │       └─⫸ Commit Scope: Optional, can be anything specifying place of the commit change
#   │
#   └─⫸ Commit Type: feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert
#
# <BLANK LINE>
#
# <body>
#   │
#   └─⫸ Optional. Provide additional contextual information about the code changes.
#      The body is free form and may be omitted. Explain the problem that this commit
#      is solving and why the changes were necessary.
#
# <BLANK LINE>
#
# <footer>
#   │
#   └─⫸ Optional. Reference issues that this commit closes or relates to.
#      Examples: "Closes #123" or "Related to #456"
#
# --- COMMIT END ---
# 
# Type options:
#   feat:     A new feature
#   fix:      A bug fix
#   docs:     Documentation only changes
#   style:    Changes that do not affect the meaning of the code (white-space, formatting, etc)
#   refactor: A code change that neither fixes a bug nor adds a feature
#   perf:     A code change that improves performance
#   test:     Adding missing tests or correcting existing tests
#   build:    Changes that affect the build system or external dependencies
#   ci:       Changes to CI configuration files and scripts
#   chore:    Other changes that don't modify src or test files
#   revert:   Reverts a previous commit
#
`;
      
      await fs.writeFile(templatePath, templateContent);
      
      // Configure git to use the template
      execSync('git config commit.template .gitmessage', { cwd: this.cwd });
      
      Feedback.success('Created commit message template (.gitmessage)');
      return true;
    } catch (error) {
      Feedback.error(`Failed to create commit message template: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Set up husky hook for commit message validation
   */
  async setupHuskyHook(): Promise<boolean> {
    try {
      Feedback.info('Setting up husky commit-msg hook...');
      
      // Create the husky setup instance
      const huskySetup = new HuskySetup(this.cwd);
      
      // Check if husky is already installed
      if (!await huskySetup.isHuskyInstalled()) {
        Feedback.info('Husky not installed. Installing...');
        await huskySetup.installHusky();
      }
      
      // Create the commit-msg hook
      const hookPath = path.join(this.cwd, '.husky', 'commit-msg');
      const hookContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
`;
      
      // Make sure the husky directory exists
      const huskyDir = path.join(this.cwd, '.husky');
      await fs.ensureDir(huskyDir);
      
      // Write the hook file
      await fs.writeFile(hookPath, hookContent);
      
      // Make it executable
      fs.chmodSync(hookPath, 0o755);
      
      Feedback.success('Created husky commit-msg hook for commitlint');
      return true;
    } catch (error) {
      Feedback.error(`Failed to set up husky hook: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Set up commitizen
   */
  async setupCommitizen(): Promise<boolean> {
    try {
      Feedback.info('Setting up commitizen...');
      
      // Create or update package.json config
      const packageJsonPath = path.join(this.cwd, 'package.json');
      
      if (!await fs.pathExists(packageJsonPath)) {
        Feedback.error('package.json not found. Cannot set up commitizen.');
        return false;
      }
      
      // Read the package.json
      const packageJson = await fs.readJson(packageJsonPath);
      
      // Add commitizen configuration
      packageJson.config = packageJson.config || {};
      packageJson.config.commitizen = {
        path: 'cz-conventional-changelog'
      };
      
      // Add npm script
      packageJson.scripts = packageJson.scripts || {};
      packageJson.scripts.commit = 'cz';
      
      // Write back the updated package.json
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      
      Feedback.success('Configured commitizen in package.json');
      return true;
    } catch (error) {
      Feedback.error(`Failed to set up commitizen: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Set up commitlint
   */
  async setupCommitLint(options: CommitLintOptions = {}): Promise<boolean> {
    const {
      setupHusky = true,
      installCommitizen = false,
      cwd
    } = options;
    
    // Update working directory if provided
    if (cwd) {
      this.cwd = cwd;
    }
    
    Feedback.section('CommitLint Setup');
    
    try {
      // Install packages
      const packagesInstalled = await this.installPackages(installCommitizen);
      
      if (!packagesInstalled) {
        return false;
      }
      
      // Create configuration
      const configCreated = await this.createConfig();
      
      if (!configCreated) {
        return false;
      }
      
      // Create commit message template
      const templateCreated = await this.createCommitMsgTemplate();
      
      if (!templateCreated) {
        return false;
      }
      
      // Set up husky hook if requested
      if (setupHusky) {
        const hookSetup = await this.setupHuskyHook();
        
        if (!hookSetup) {
          return false;
        }
      }
      
      // Set up commitizen if requested
      if (installCommitizen) {
        const commitizenSetup = await this.setupCommitizen();
        
        if (!commitizenSetup) {
          return false;
        }
      }
      
      Feedback.success('CommitLint setup completed successfully!');
      return true;
    } catch (error) {
      Feedback.error(`CommitLint setup failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

export default CommitLintSetup;