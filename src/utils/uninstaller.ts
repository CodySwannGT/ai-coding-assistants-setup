/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs-extra';
import path from 'path';
import { Feedback } from './feedback';
import { HuskySetup } from './husky-setup';

/**
 * Options for uninstall process
 */
export interface UninstallOptions {
  // Whether to include VS Code settings in removal
  includeVSCode?: boolean;

  // Whether to run in dry-run mode (no actual changes)
  dryRun?: boolean;

  // Path to the target directory
  cwd?: string;
}

/**
 * Uninstall result
 */
export interface UninstallResult {
  success: boolean;
  removed: {
    files: string[];
    directories: string[];
    settings: Record<string, any>;
  };
}

/**
 * Uninstaller class for removing AI assistant configurations
 */
export class Uninstaller {
  private projectRoot: string;

  /**
   * Create a new Uninstaller instance
   *
   * @param projectRoot Path to project root (defaults to process.cwd())
   */
  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Find AI assistant related files and directories
   *
   * @returns Arrays of file and directory paths
   */
  async findAIAssistantFiles(): Promise<{
    files: (string | { path: string; aiSettings: Record<string, any> })[];
    directories: string[];
  }> {
    const aiFiles: (
      | string
      | { path: string; aiSettings: Record<string, any> }
    )[] = [];
    const aiDirectories: string[] = [];

    // Standard AI assistant paths to check
    const filePaths: string[] = [
      // Configuration files
      path.join(this.projectRoot, '.mcp.json'),
      path.join(this.projectRoot, '.mcp.json.local'),
      path.join(this.projectRoot, 'CLAUDE.md'),

      // Roo Code files
      path.join(this.projectRoot, '.roomodes'),
      path.join(this.projectRoot, '.rooignore'),

      // Env and credentials
      path.join(this.projectRoot, '.ai-credentials.json'),

      // Task Master files
      path.join(this.projectRoot, '.taskmasterconfig'),
    ];

    // Directories to check
    const directoryPaths: string[] = [
      path.join(this.projectRoot, '.roo'),
      path.join(this.projectRoot, '.claude'),
      path.join(this.projectRoot, '.ai-credentials'),
      path.join(this.projectRoot, 'tasks'),
    ];

    // Check each file
    for (const filePath of filePaths) {
      if (await fs.pathExists(filePath)) {
        aiFiles.push(filePath);
      }
    }

    // Check each directory
    for (const dirPath of directoryPaths) {
      if (
        (await fs.pathExists(dirPath)) &&
        (await fs.stat(dirPath)).isDirectory()
      ) {
        aiDirectories.push(dirPath);
      }
    }

    // Also look for VS Code settings related to AI assistants
    const vscodeSettingsPath = path.join(
      this.projectRoot,
      '.vscode',
      'settings.json'
    );
    if (await fs.pathExists(vscodeSettingsPath)) {
      try {
        const settings = await fs.readJson(vscodeSettingsPath);
        const aiSettings: Record<string, any> = {};
        let hasAISettings = false;

        // Check for Claude and Roo settings
        for (const [key, value] of Object.entries(settings)) {
          if (
            key.startsWith('claude.') ||
            key.startsWith('rooCode.') ||
            key.startsWith('github.copilot.') ||
            key.includes('inlineSuggest')
          ) {
            aiSettings[key] = value;
            hasAISettings = true;
          }
        }

        if (hasAISettings) {
          aiFiles.push({
            path: vscodeSettingsPath,
            aiSettings,
          });
        }
      } catch (error) {
        // Ignore errors reading settings
      }
    }

    return { files: aiFiles, directories: aiDirectories };
  }

  /**
   * Run the uninstall process
   *
   * @param options Uninstall options
   * @returns Results of the uninstall process
   */
  async uninstall(options: UninstallOptions = {}): Promise<UninstallResult> {
    const { includeVSCode = false, dryRun = false, cwd } = options;

    // Update project root if cwd is provided
    if (cwd) {
      this.projectRoot = cwd;
    }

    // Determine whether this is a dry-run
    const headerText = dryRun
      ? 'Dry Run: Showing What Would Be Removed'
      : 'Removing AI Coding Assistants Configuration';

    Feedback.section(headerText);

    if (dryRun) {
      Feedback.info(
        'Running in dry-run mode. No files will actually be removed.'
      );
      Feedback.info(
        'This will show you what would be removed if you run without --dry-run.'
      );
    }

    try {
      // Remove Git hooks
      Feedback.info('Removing Git hooks...');
      const huskySetup = new HuskySetup(this.projectRoot);

      let hooksRemoved = false;
      if (await huskySetup.isHuskyInstalled()) {
        // TODO: Implement hook removal in HuskySetup class
        // For now, we'll just log a message
        if (!dryRun) {
          // This would be the actual implementation
          Feedback.info('Hooks removal would happen here');
        } else {
          Feedback.info('Would remove Git hooks');
        }
        hooksRemoved = true;
      } else {
        Feedback.info('No Git hooks were found to remove.');
      }

      // Find AI assistant files and directories
      const { files, directories } = await this.findAIAssistantFiles();

      // Show summary of what will be removed
      if (files.length === 0 && directories.length === 0 && !hooksRemoved) {
        Feedback.info('No AI assistant files or directories found to remove.');
        return {
          success: true,
          removed: {
            files: [],
            directories: [],
            settings: {},
          },
        };
      }

      Feedback.info(
        `Found ${files.length} files and ${directories.length} directories to ${dryRun ? 'potentially ' : ''}remove.`
      );

      const removedSettings: Record<string, any> = {};
      const removedFiles: string[] = [];
      const removedDirectories: string[] = [];

      // Handle VS Code settings
      if (includeVSCode) {
        const vscodeSettingsPath = path.join(
          this.projectRoot,
          '.vscode',
          'settings.json'
        );
        if (await fs.pathExists(vscodeSettingsPath)) {
          try {
            // Read settings
            const settings = await fs.readJson(vscodeSettingsPath);

            // Remove AI assistant settings
            for (const key of Object.keys(settings)) {
              if (
                key.startsWith('claude.') ||
                key.startsWith('rooCode.') ||
                key.startsWith('github.copilot.') ||
                key.includes('inlineSuggest')
              ) {
                removedSettings[key] = settings[key];
                delete settings[key];
              }
            }

            // Save settings if changed and not in dry run
            if (Object.keys(removedSettings).length > 0 && !dryRun) {
              await fs.writeJson(vscodeSettingsPath, settings, { spaces: 2 });
              Feedback.success(
                `Removed ${Object.keys(removedSettings).length} AI assistant settings from VS Code settings.json`
              );
            } else if (Object.keys(removedSettings).length > 0) {
              Feedback.info(
                `Would remove ${Object.keys(removedSettings).length} AI assistant settings from VS Code settings.json`
              );
            }
          } catch (error) {
            Feedback.warning(
              `Failed to update VS Code settings: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        // Check and clean extensions.json
        const extensionsPath = path.join(
          this.projectRoot,
          '.vscode',
          'extensions.json'
        );
        if (await fs.pathExists(extensionsPath)) {
          try {
            // Read extensions
            const extensions = await fs.readJson(extensionsPath);
            let changed = false;

            // Remove AI assistant extensions from recommendations
            if (extensions.recommendations) {
              const aiExtensions = ['anthropic.claude-code', 'roo.roo-code'];
              const originalLength = extensions.recommendations.length;
              extensions.recommendations = extensions.recommendations.filter(
                (ext: string) => !aiExtensions.includes(ext)
              );
              changed = originalLength !== extensions.recommendations.length;
            }

            // Remove GitHub Copilot from unwanted recommendations
            if (extensions.unwantedRecommendations) {
              const copilotExtensions = [
                'github.copilot',
                'github.copilot-chat',
              ];
              const originalLength = extensions.unwantedRecommendations.length;
              extensions.unwantedRecommendations =
                extensions.unwantedRecommendations.filter(
                  (ext: string) => !copilotExtensions.includes(ext)
                );
              changed =
                changed ||
                originalLength !== extensions.unwantedRecommendations.length;
            }

            // Save extensions if changed and not in dry run
            if (changed && !dryRun) {
              await fs.writeJson(extensionsPath, extensions, { spaces: 2 });
              Feedback.success('Updated VS Code extensions.json');
            } else if (changed) {
              Feedback.info('Would update VS Code extensions.json');
            }
          } catch (error) {
            Feedback.warning(
              `Failed to update VS Code extensions.json: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      }

      // Remove all files
      for (const file of files) {
        if (typeof file === 'string') {
          if (await fs.pathExists(file)) {
            if (dryRun) {
              Feedback.info(`Would remove: ${file}`);
            } else {
              await fs.remove(file);
              removedFiles.push(file);
              Feedback.success(`Removed: ${file}`);
            }
          }
        }
      }

      // Remove all directories
      for (const dir of directories) {
        if (await fs.pathExists(dir)) {
          if (dryRun) {
            Feedback.info(`Would remove directory: ${dir}`);
          } else {
            await fs.remove(dir);
            removedDirectories.push(dir);
            Feedback.success(`Removed directory: ${dir}`);
          }
        }
      }

      // Check environment file and remove AI assistant variables
      const envPath = path.join(this.projectRoot, '.env');
      if (await fs.pathExists(envPath)) {
        try {
          const envContent = await fs.readFile(envPath, 'utf8');
          const lines = envContent.split('\n');
          const newLines = [];
          const removedLines = [];

          // Filter out AI assistant environment variables
          for (const line of lines) {
            const varNames = [
              'ANTHROPIC_API_KEY',
              'OPENAI_API_KEY',
              'STACKEXCHANGE_API_KEY',
              'GITHUB_PERSONAL_ACCESS_TOKEN',
              'CONTEXT7_API_KEY',
              'MEMORY_PATH',
              'ALLOWED_COMMANDS',
              'BLOCKED_COMMANDS',
              'COMMAND_TIMEOUT_MS',
              'CLAUDE_MEMORY_LIMIT',
              'ROO_MAX_TOKENS',
            ];

            const isAIVar = varNames.some(name => line.startsWith(name + '='));
            if (isAIVar) {
              removedLines.push(line);
            } else {
              newLines.push(line);
            }
          }

          // If we removed any lines and not in dry run mode, update the file
          if (removedLines.length > 0 && !dryRun) {
            await fs.writeFile(envPath, newLines.join('\n'), 'utf8');
            Feedback.success(
              `Removed ${removedLines.length} AI assistant environment variables from .env`
            );
          } else if (removedLines.length > 0) {
            Feedback.info(
              `Would remove ${removedLines.length} AI assistant environment variables from .env`
            );
          }
        } catch (error) {
          Feedback.warning(
            `Failed to update .env file: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Check for Dependabot configuration file
      const dependabotPath = path.join(
        this.projectRoot,
        '.github',
        'dependabot.yml'
      );
      if (await fs.pathExists(dependabotPath)) {
        if (dryRun) {
          Feedback.info(
            `Would remove Dependabot configuration: ${dependabotPath}`
          );
        } else {
          await fs.remove(dependabotPath);
          Feedback.success(
            `Removed Dependabot configuration: ${dependabotPath}`
          );
        }

        // Check if .github directory is now empty and remove it if so
        const githubDirPath = path.join(this.projectRoot, '.github');
        try {
          const githubDirContents = await fs.readdir(githubDirPath);
          if (githubDirContents.length === 0) {
            if (dryRun) {
              Feedback.info(
                `Would remove empty .github directory: ${githubDirPath}`
              );
            } else {
              await fs.remove(githubDirPath);
              Feedback.success(
                `Removed empty .github directory: ${githubDirPath}`
              );
            }
          }
        } catch (error) {
          // Ignore errors reading directory
        }
      }

      if (dryRun) {
        Feedback.success('Dry run completed. No files were actually removed.');
        Feedback.info(
          'To perform the actual removal, run the command without the --dry-run flag.'
        );
      } else {
        Feedback.success(
          'All AI coding assistant configuration files have been removed.'
        );
      }

      if (!includeVSCode) {
        Feedback.info(
          'Note: VS Code settings were not modified to avoid disrupting your editor configuration.'
        );
        Feedback.info(
          'If desired, you can manually remove AI assistant settings from your VS Code settings.json.'
        );
        Feedback.info(
          'To include VS Code settings in the removal, use the --include-vscode flag.'
        );
      }

      return {
        success: true,
        removed: {
          files: removedFiles,
          directories: removedDirectories,
          settings: removedSettings,
        },
      };
    } catch (error) {
      Feedback.error(
        `Error during uninstall: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        success: false,
        removed: {
          files: [],
          directories: [],
          settings: {},
        },
      };
    }
  }
}

export default Uninstaller;
