/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs-extra';
import path from 'path';
import { Feedback } from './feedback';
import { ProjectDetector } from './project-detector';

/**
 * Options for VS Code setup
 */
export interface VSCodeSetupOptions {
  // Whether to disable Copilot for this workspace
  disableCopilot?: boolean;
  
  // Whether to prioritize Claude/Roo over Copilot
  prioritizeClaudeRoo?: boolean;
  
  // Whether to force overwrite existing settings
  forceOverwrite?: boolean;
  
  // Path to the target directory
  cwd?: string;
}

/**
 * VSCode Setup class for configuring VS Code settings and extensions
 */
export class VSCodeSetup {
  private projectRoot: string;
  private projectDetector: ProjectDetector;
  private vscodeDir: string;
  private settingsPath: string;
  private extensionsPath: string;
  
  /**
   * Create a new VSCodeSetup instance
   * 
   * @param projectRoot Path to project root (defaults to process.cwd())
   */
  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.projectDetector = new ProjectDetector(this.projectRoot);
    this.vscodeDir = path.join(this.projectRoot, '.vscode');
    this.settingsPath = path.join(this.vscodeDir, 'settings.json');
    this.extensionsPath = path.join(this.vscodeDir, 'extensions.json');
  }
  
  /**
   * Detect if GitHub Copilot is installed in VS Code
   * 
   * @returns Object indicating if Copilot is installed and its path
   */
  async detectGitHubCopilot(): Promise<{ installed: boolean; path: string | null }> {
    Feedback.info('Checking for GitHub Copilot installation...');
    
    try {
      // Get the VS Code extensions directory
      const extensionsPath = this.getVSCodeExtensionsPath();
      if (!extensionsPath) {
        return { installed: false, path: null };
      }

      // Check for Copilot in extensions directory
      try {
        const matches = await fs.readdir(extensionsPath);
        const copilotMatches = matches.filter(dir => {
          return dir.toLowerCase().includes('copilot') && dir.toLowerCase().includes('github');
        });

        if (copilotMatches.length > 0) {
          const copilotPath = path.join(extensionsPath, copilotMatches[0]);
          Feedback.info(`Found GitHub Copilot at: ${copilotPath}`);
          return { installed: true, path: copilotPath };
        }
      } catch (error) {
        // Continue checking other locations
      }

      // Check in VS Code integrated extensions
      const integratedExtPaths = [
        // Possible locations for integrated extensions
        path.join(this.getVSCodeUserConfigPath() || '', '..', 'extensions'),
        // For VS Code Insiders
        path.join(this.getVSCodeUserConfigPath() || '', '..', '..', 'Code - Insiders', 'User', 'extensions')
      ];

      for (const extPath of integratedExtPaths) {
        try {
          if (await fs.pathExists(extPath)) {
            const matches = await fs.readdir(extPath);
            const copilotMatches = matches.filter(dir => {
              return dir.toLowerCase().includes('copilot') && dir.toLowerCase().includes('github');
            });

            if (copilotMatches.length > 0) {
              const copilotPath = path.join(extPath, copilotMatches[0]);
              Feedback.info(`Found GitHub Copilot at integrated location: ${copilotPath}`);
              return { installed: true, path: copilotPath };
            }
          }
        } catch (error) {
          // Continue checking other locations
        }
      }

      Feedback.info('GitHub Copilot not found');
      return { installed: false, path: null };
    } catch (error) {
      Feedback.warning(`Error detecting GitHub Copilot: ${error instanceof Error ? error.message : String(error)}`);
      return { installed: false, path: null };
    }
  }
  
  /**
   * Get VS Code user config path
   * 
   * @returns Path to VS Code user config directory
   */
  private getVSCodeUserConfigPath(): string | null {
    try {
      let configPath: string | null = null;
      
      // Try to determine platform-specific path
      const platform = process.platform;
      const home = process.env.HOME || process.env.USERPROFILE;
      
      if (!home) {
        return null;
      }
      
      if (platform === 'win32') {
        // Windows
        configPath = path.join(home, 'AppData', 'Roaming', 'Code', 'User');
      } else if (platform === 'darwin') {
        // macOS
        configPath = path.join(home, 'Library', 'Application Support', 'Code', 'User');
      } else {
        // Linux and others
        configPath = path.join(home, '.config', 'Code', 'User');
      }
      
      return configPath;
    } catch (error) {
      Feedback.warning(`Error getting VS Code config path: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  
  /**
   * Get VS Code extensions path
   * 
   * @returns Path to VS Code extensions directory
   */
  private getVSCodeExtensionsPath(): string | null {
    try {
      let extensionsPath: string | null = null;
      
      // Try to determine platform-specific path
      const platform = process.platform;
      const home = process.env.HOME || process.env.USERPROFILE;
      
      if (!home) {
        return null;
      }
      
      if (platform === 'win32') {
        // Windows
        extensionsPath = path.join(home, '.vscode', 'extensions');
      } else if (platform === 'darwin') {
        // macOS
        extensionsPath = path.join(home, '.vscode', 'extensions');
      } else {
        // Linux and others
        extensionsPath = path.join(home, '.vscode', 'extensions');
      }
      
      return extensionsPath;
    } catch (error) {
      Feedback.warning(`Error getting VS Code extensions path: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  
  /**
   * Create VS Code directories
   * 
   * @param dryRun Whether to run in dry-run mode
   * @returns Whether the directories were created successfully
   */
  async createVSCodeDirectories(dryRun: boolean = false): Promise<boolean> {
    try {
      if (!dryRun) {
        await fs.ensureDir(this.vscodeDir);
      }
      return true;
    } catch (error) {
      Feedback.error(`Failed to create VS Code directories: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Update VS Code settings
   * 
   * @param options Options for updating settings
   * @param dryRun Whether to run in dry-run mode
   * @returns Whether the settings were updated successfully
   */
  async updateSettings(options: {
    disableCopilot?: boolean;
    prioritizeClaudeRoo?: boolean;
    forceOverwrite?: boolean;
  } = {}, dryRun: boolean = false): Promise<boolean> {
    const { disableCopilot = false, prioritizeClaudeRoo = true } = options;
    
    try {
      // Create VS Code directories if they don't exist
      if (!await this.createVSCodeDirectories(dryRun)) {
        return false;
      }
      
      // Read existing settings if they exist
      let settings: Record<string, any> = {};
      const settingsExist = await fs.pathExists(this.settingsPath);
      
      if (settingsExist) {
        settings = await fs.readJson(this.settingsPath);
      }
      
      // Check for GitHub Copilot installation
      const { installed: copilotInstalled, path: copilotPath } = await this.detectGitHubCopilot();
      
      if (copilotInstalled) {
        Feedback.info(`GitHub Copilot detected at: ${copilotPath}`);
        
        if (disableCopilot) {
          Feedback.info('Configuring settings to disable GitHub Copilot for this workspace');
          
          // Disable GitHub Copilot
          settings['github.copilot.enable'] = false;
          settings['github.copilot.editor.enableAutoCompletions'] = false;
          
          // If Copilot Chat is likely installed based on the path
          if (copilotPath && copilotPath.toLowerCase().includes('chat')) {
            settings['github.copilot.chat.enabled'] = false;
          }
          
          Feedback.success('GitHub Copilot disabled for this workspace');
        } else {
          Feedback.info('GitHub Copilot will remain active alongside Claude/Roo - be aware of potential conflicts');
          
          // Configure settings to reduce conflicts
          settings['editor.inlineSuggest.suppressSuggestions'] = false;
          settings['editor.inlineSuggest.enabled'] = true;
          settings['editor.inlineSuggest.showToolbar'] = 'always';
          
          if (prioritizeClaudeRoo) {
            // These settings favor Claude/Roo over Copilot
            settings['github.copilot.inlineSuggest.enable'] = true;
            settings['github.copilot.inlineSuggest.count'] = 1; // Reduce suggestions from Copilot
            
            Feedback.success('Settings configured to prioritize Claude/Roo over GitHub Copilot');
          }
        }
      } else {
        Feedback.info('GitHub Copilot not detected');
      }
      
      // Update AI assistant settings
      settings['editor.inlineSuggest.enabled'] = true;
      settings['editor.inlineSuggest.showToolbar'] = 'always';
      
      // Claude settings
      settings['claude.enableAutoCompletion'] = true;
      
      // Roo Code settings
      settings['rooCode.useIgnoreFiles'] = true;
      settings['rooCode.autoApproveReads'] = true;
      
      // Git settings related to AI
      settings['git.ignoreLimitWarning'] = true;
      
      if (!dryRun) {
        await fs.writeJson(this.settingsPath, settings, { spaces: 2 });
      }
      
      Feedback.success('VS Code settings updated for AI assistants.');
      return true;
    } catch (error) {
      Feedback.error(`Failed to update VS Code settings: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Update VS Code extensions recommendations
   * 
   * @param dryRun Whether to run in dry-run mode
   * @returns Whether the extensions were updated successfully
   */
  async updateExtensionsRecommendations(dryRun: boolean = false): Promise<boolean> {
    try {
      // Create VS Code directories if they don't exist
      if (!await this.createVSCodeDirectories(dryRun)) {
        return false;
      }
      
      // Read existing extensions if they exist
      let extensions: Record<string, any> = {};
      const extensionsExist = await fs.pathExists(this.extensionsPath);
      
      if (extensionsExist) {
        extensions = await fs.readJson(this.extensionsPath);
      }
      
      // Add recommended extensions
      extensions.recommendations = extensions.recommendations || [];
      const recommendedExtensions = [
        'anthropic.claude-code',
        'roo.roo-code',
        'aaron-bond.better-comments',
        'dbaeumer.vscode-eslint',
        'esbenp.prettier-vscode',
        'editorconfig.editorconfig'
      ];
      
      // Add extensions that aren't already recommended
      for (const ext of recommendedExtensions) {
        if (!extensions.recommendations.includes(ext)) {
          extensions.recommendations.push(ext);
        }
      }
      
      // Check for GitHub Copilot installation
      const { installed: copilotInstalled } = await this.detectGitHubCopilot();
      
      // If Copilot is installed, add a note about potential conflicts
      if (copilotInstalled) {
        extensions.unwantedRecommendations = extensions.unwantedRecommendations || [];
        if (!extensions.unwantedRecommendations.includes('github.copilot')) {
          extensions.unwantedRecommendations.push('github.copilot');
        }
        if (!extensions.unwantedRecommendations.includes('github.copilot-chat')) {
          extensions.unwantedRecommendations.push('github.copilot-chat');
        }
      }
      
      if (!dryRun) {
        await fs.writeJson(this.extensionsPath, extensions, { spaces: 2 });
      }
      
      Feedback.success('VS Code extensions recommendations updated.');
      return true;
    } catch (error) {
      Feedback.error(`Failed to update VS Code extensions recommendations: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Setup VS Code
   * 
   * @param options VS Code setup options
   * @param dryRun Whether to run in dry-run mode
   * @returns Whether the setup was successful
   */
  async setup(options: VSCodeSetupOptions = {}, dryRun: boolean = false): Promise<boolean> {
    const {
      disableCopilot = false,
      prioritizeClaudeRoo = true,
      forceOverwrite = false,
      cwd
    } = options;
    
    // Update working directory if provided
    if (cwd) {
      this.projectRoot = cwd;
      this.vscodeDir = path.join(this.projectRoot, '.vscode');
      this.settingsPath = path.join(this.vscodeDir, 'settings.json');
      this.extensionsPath = path.join(this.vscodeDir, 'extensions.json');
    }
    
    Feedback.section('VS Code Setup');
    
    try {
      // Create VS Code directories
      if (!await this.createVSCodeDirectories(dryRun)) {
        return false;
      }
      
      // Update settings
      const settingsUpdated = await this.updateSettings({
        disableCopilot,
        prioritizeClaudeRoo,
        forceOverwrite
      }, dryRun);
      
      if (!settingsUpdated) {
        Feedback.warning('Failed to update VS Code settings');
      }
      
      // Update extensions recommendations
      const extensionsUpdated = await this.updateExtensionsRecommendations(dryRun);
      
      if (!extensionsUpdated) {
        Feedback.warning('Failed to update VS Code extensions recommendations');
      }
      
      Feedback.success('VS Code setup completed successfully!');
      return settingsUpdated && extensionsUpdated;
    } catch (error) {
      Feedback.error(`VS Code setup failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

export default VSCodeSetup;