/**
 * GitHub Actions Setup
 * 
 * Utility for setting up GitHub Actions workflows for CI/CD, documentation,
 * and automated issue creation on workflow failures.
 */

import path from 'path';
import fs from 'fs-extra';
import { Feedback } from './feedback';
import { ProjectDetector } from './project-detector';

export interface GitHubActionsOptions {
  // Whether to set up the CI workflow
  setupCI?: boolean;
  
  // Whether to set up the release workflow
  setupRelease?: boolean;
  
  // Whether to set up the documentation workflow
  setupDocs?: boolean;
  
  // Whether to set up the issue-on-failure workflow
  setupIssueOnFailure?: boolean;
  
  // Path to the target directory
  cwd?: string;
}

export class GitHubActionsSetup {
  private cwd: string;
  private projectDetector: ProjectDetector;
  private templatePath: string;
  private githubDir: string;
  private workflowsDir: string;
  private hasTypeScript: boolean;
  private hasEslint: boolean;
  private hasPrettier: boolean;
  
  /**
   * Create a new GitHubActionsSetup instance
   * 
   * @param cwd Working directory for the setup (defaults to process.cwd())
   */
  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.projectDetector = new ProjectDetector(cwd);
    
    // Set up paths
    this.templatePath = path.join(__dirname, '..', 'templates', '.github', 'workflows');
    this.githubDir = path.join(cwd, '.github');
    this.workflowsDir = path.join(this.githubDir, 'workflows');
    
    // Detect project features
    this.hasTypeScript = this.projectDetector.hasTypeScript();
    this.hasEslint = this.projectDetector.hasEslint();
    this.hasPrettier = this.projectDetector.hasPrettier();
  }
  
  /**
   * Ensure the GitHub workflows directory exists
   */
  async ensureDirectories(): Promise<boolean> {
    try {
      await fs.ensureDir(this.githubDir);
      await fs.ensureDir(this.workflowsDir);
      return true;
    } catch (error) {
      Feedback.error(`Failed to create GitHub workflows directory: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Copy a workflow file from templates to the project
   */
  async copyWorkflow(filename: string): Promise<boolean> {
    try {
      const sourcePath = path.join(this.templatePath, filename);
      const targetPath = path.join(this.workflowsDir, filename);
      
      // Check if source file exists
      if (!await fs.pathExists(sourcePath)) {
        Feedback.error(`Template file not found: ${sourcePath}`);
        return false;
      }
      
      // Check if target file already exists
      if (await fs.pathExists(targetPath)) {
        Feedback.warning(`Workflow file already exists: ${targetPath}`);
        return true;
      }
      
      // Copy the file
      await fs.copy(sourcePath, targetPath);
      Feedback.success(`Created workflow file: ${filename}`);
      return true;
    } catch (error) {
      Feedback.error(`Failed to copy workflow file ${filename}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Set up CI workflow
   */
  async setupCIWorkflow(): Promise<boolean> {
    try {
      Feedback.info('Setting up CI workflow...');
      return await this.copyWorkflow('ci.yml');
    } catch (error) {
      Feedback.error(`Failed to set up CI workflow: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Set up release workflow
   */
  async setupReleaseWorkflow(): Promise<boolean> {
    try {
      Feedback.info('Setting up release workflow...');
      return await this.copyWorkflow('release.yml');
    } catch (error) {
      Feedback.error(`Failed to set up release workflow: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Set up documentation workflow
   */
  async setupDocsWorkflow(): Promise<boolean> {
    try {
      Feedback.info('Setting up documentation workflow...');
      return await this.copyWorkflow('docs.yml');
    } catch (error) {
      Feedback.error(`Failed to set up documentation workflow: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Set up issue-on-failure workflow
   */
  async setupIssueOnFailureWorkflow(): Promise<boolean> {
    try {
      Feedback.info('Setting up issue-on-failure workflow...');
      return await this.copyWorkflow('create-issue-on-failure.yml');
    } catch (error) {
      Feedback.error(`Failed to set up issue-on-failure workflow: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Create Dependabot configuration file
   */
  async setupDependabot(): Promise<boolean> {
    try {
      Feedback.info('Setting up Dependabot...');
      
      const dependabotPath = path.join(this.githubDir, 'dependabot.yml');
      
      // Check if the file already exists
      if (await fs.pathExists(dependabotPath)) {
        Feedback.warning('dependabot.yml already exists. Skipping creation.');
        return true;
      }
      
      const templatePath = path.join(__dirname, '..', 'templates', '.github', 'dependabot.yml');
      
      // Copy the file
      await fs.copy(templatePath, dependabotPath);
      
      Feedback.success('Created dependabot.yml');
      return true;
    } catch (error) {
      Feedback.error(`Failed to set up Dependabot: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Configure package.json scripts for CI if needed
   */
  async setupPackageJsonScripts(): Promise<boolean> {
    try {
      Feedback.info('Setting up package.json scripts for CI...');
      
      const packageJsonPath = path.join(this.cwd, 'package.json');
      
      if (!await fs.pathExists(packageJsonPath)) {
        Feedback.warning('package.json not found. Skipping script setup.');
        return false;
      }
      
      // Read package.json
      const packageJson = await fs.readJson(packageJsonPath);
      
      // Ensure scripts object exists
      packageJson.scripts = packageJson.scripts || {};
      
      // Add CI scripts if they don't exist
      let updated = false;
      
      if (!packageJson.scripts.test) {
        packageJson.scripts.test = 'jest';
        updated = true;
      }
      
      if (this.hasTypeScript && !packageJson.scripts.typecheck) {
        packageJson.scripts.typecheck = 'tsc --noEmit';
        updated = true;
      }
      
      if (this.hasEslint && !packageJson.scripts.lint) {
        packageJson.scripts.lint = 'eslint . --ext .ts,.js';
        updated = true;
      }
      
      if (this.hasPrettier && !packageJson.scripts['format:check']) {
        packageJson.scripts['format:check'] = 'prettier --check "**/*.{ts,js,json,md}"';
        updated = true;
      }
      
      if (!packageJson.scripts.build && this.hasTypeScript) {
        packageJson.scripts.build = 'tsc';
        updated = true;
      }
      
      // Only write if changes were made
      if (updated) {
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
        Feedback.success('Updated package.json scripts for CI');
      } else {
        Feedback.info('No package.json scripts needed updating');
      }
      
      return true;
    } catch (error) {
      Feedback.error(`Failed to set up package.json scripts: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Set up GitHub Actions workflows
   */
  async setupGitHubActions(options: GitHubActionsOptions = {}): Promise<boolean> {
    const {
      setupCI = true,
      setupRelease = true,
      setupDocs = true,
      setupIssueOnFailure = true,
      cwd
    } = options;
    
    // Update working directory if provided
    if (cwd) {
      this.cwd = cwd;
    }
    
    Feedback.section('GitHub Actions Setup');
    
    try {
      // Create directories
      const directoriesCreated = await this.ensureDirectories();
      
      if (!directoriesCreated) {
        return false;
      }
      
      // Set up workflows based on options
      if (setupCI) {
        const ciSetup = await this.setupCIWorkflow();
        
        if (!ciSetup) {
          Feedback.warning('CI workflow setup failed');
        }
      }
      
      if (setupRelease) {
        const releaseSetup = await this.setupReleaseWorkflow();
        
        if (!releaseSetup) {
          Feedback.warning('Release workflow setup failed');
        }
      }
      
      if (setupDocs) {
        const docsSetup = await this.setupDocsWorkflow();
        
        if (!docsSetup) {
          Feedback.warning('Documentation workflow setup failed');
        }
      }
      
      if (setupIssueOnFailure) {
        const issueSetup = await this.setupIssueOnFailureWorkflow();
        
        if (!issueSetup) {
          Feedback.warning('Issue-on-failure workflow setup failed');
        }
      }
      
      // Set up Dependabot
      await this.setupDependabot();
      
      // Set up package.json scripts
      await this.setupPackageJsonScripts();
      
      Feedback.success('GitHub Actions setup completed successfully!');
      return true;
    } catch (error) {
      Feedback.error(`GitHub Actions setup failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

export default GitHubActionsSetup;