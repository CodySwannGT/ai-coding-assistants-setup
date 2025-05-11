/**
 * Uninstall Functionality
 * 
 * Provides functions for completely removing all AI assistant configurations.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileExists } from '../utils/file.js';
import {
  printHeader,
  printInfo,
  printSuccess,
  printWarning,
  printError,
  printDebug
} from '../utils/logger.js';
import { getProjectPaths } from '../config/paths.js';

/**
 * Find all AI assistant related files and directories
 * @param {string} projectRoot Project root directory
 * @returns {Promise<{files: string[], directories: string[]}>} Arrays of file and directory paths
 */
async function findAIAssistantFiles(projectRoot) {
  const aiFiles = [];
  const aiDirectories = [];

  // Standard paths
  const paths = getProjectPaths(projectRoot);
  
  // Add files to remove
  for (const [name, filePath] of Object.entries(paths)) {
    // Skip git and root directories
    if (['root', 'git'].includes(name)) {
      continue;
    }
    
    if (await fileExists(filePath)) {
      if ((await fs.stat(filePath)).isDirectory()) {
        aiDirectories.push(filePath);
      } else {
        aiFiles.push(filePath);
      }
    }
  }
  
  // Also look for VS Code settings related to AI assistants
  const vscodeSettingsPath = path.join(projectRoot, '.vscode', 'settings.json');
  if (await fileExists(vscodeSettingsPath)) {
    try {
      const settings = await fs.readJson(vscodeSettingsPath);
      const aiSettings = {};
      let hasAISettings = false;
      
      // Check for Claude and Roo settings
      for (const [key, value] of Object.entries(settings)) {
        if (key.startsWith('claude.') || key.startsWith('rooCode.') || 
            key.startsWith('github.copilot.') || key.includes('inlineSuggest')) {
          aiSettings[key] = value;
          hasAISettings = true;
        }
      }
      
      if (hasAISettings) {
        aiFiles.push({
          path: vscodeSettingsPath,
          aiSettings
        });
      }
    } catch (err) {
      // Ignore errors reading settings
    }
  }
  
  return { files: aiFiles, directories: aiDirectories };
}

/**
 * Uninstall AI assistant configurations
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Project root directory
 * @param {Object} options.logger Winston logger instance
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @param {boolean} [options.nonInteractive=false] Whether to run in non-interactive mode
 * @param {boolean} [options.includeVSCode=false] Whether to modify VS Code settings
 * @param {Function} [options.confirm] Function to confirm user choices
 * @returns {Promise<{success: boolean, removed: {files: string[], directories: string[], settings: Object}}>} Results
 */
export async function uninstall(options) {
  const { 
    projectRoot, 
    logger, 
    dryRun = false, 
    nonInteractive = false,
    includeVSCode = false,
    confirm = async () => true
  } = options;

  // Determine whether this is a dry-run
  const headerText = dryRun ?
    'Dry Run: Showing What Would Be Removed' :
    'Removing AI Coding Assistants Configuration';

  printHeader(headerText);

  if (dryRun) {
    printInfo('Running in dry-run mode. No files will actually be removed.');
    printInfo('This will show you what would be removed if you run without --dry-run.');
  }

  // Ask for confirmation unless in non-interactive mode or dry-run mode
  let shouldUninstall = true;
  if (!nonInteractive && !dryRun) {
    shouldUninstall = await confirm({
      message: 'WARNING: This will remove all configurations and settings created by this script. Continue?',
      default: false
    });

    if (!shouldUninstall) {
      printInfo('Uninstall cancelled.');
      return { success: false, removed: { files: [], directories: [], settings: {} } };
    }
  }

  try {
    // Import git module to avoid circular dependencies
    const { removeGitHooks } = await import('./git.js');
    
    // Remove Git hooks
    printInfo('Removing Git hooks...');
    const hooksResult = await removeGitHooks({
      projectRoot,
      logger,
      dryRun
    });

    if (hooksResult.success && hooksResult.success.length > 0) {
      printSuccess(`Successfully removed ${hooksResult.success.length} Git hooks`);
    } else {
      printInfo('No Git hooks were found to remove.');
    }

    if (hooksResult.failed && hooksResult.failed.length > 0) {
      printWarning(`Failed to remove ${hooksResult.failed.length} Git hooks`);
    }
    
    // Find AI assistant files and directories
    const { files, directories } = await findAIAssistantFiles(projectRoot);

    // Show summary of what will be removed
    if (files.length === 0 && directories.length === 0) {
      printInfo('No AI assistant files or directories found to remove.');
      return { success: true, removed: { files: [], directories: [], settings: {} } };
    }

    printInfo(`Found ${files.length} files and ${directories.length} directories to ${dryRun ? 'potentially ' : ''}remove.`);
    
    const removedSettings = {};
    const removedFiles = [];
    const removedDirectories = [];
    
    // Handle VS Code settings
    if (includeVSCode) {
      const vscodeSettingsPath = path.join(projectRoot, '.vscode', 'settings.json');
      if (await fileExists(vscodeSettingsPath)) {
        try {
          // Read settings
          const settings = await fs.readJson(vscodeSettingsPath);
          const originalSettings = { ...settings };
          
          // Remove AI assistant settings
          for (const key of Object.keys(settings)) {
            if (key.startsWith('claude.') || key.startsWith('rooCode.') || 
                key.startsWith('github.copilot.') || key.includes('inlineSuggest')) {
              removedSettings[key] = settings[key];
              delete settings[key];
            }
          }
          
          // Save settings if changed and not in dry run
          if (Object.keys(removedSettings).length > 0 && !dryRun) {
            await fs.writeJson(vscodeSettingsPath, settings, { spaces: 2 });
            printSuccess(`Removed ${Object.keys(removedSettings).length} AI assistant settings from VS Code settings.json`);
          } else if (Object.keys(removedSettings).length > 0) {
            printDebug(`Would remove ${Object.keys(removedSettings).length} AI assistant settings from VS Code settings.json`);
          }
        } catch (err) {
          printWarning(`Failed to update VS Code settings: ${err.message}`);
        }
      }
      
      // Check and clean extensions.json
      const extensionsPath = path.join(projectRoot, '.vscode', 'extensions.json');
      if (await fileExists(extensionsPath)) {
        try {
          // Read extensions
          const extensions = await fs.readJson(extensionsPath);
          const originalExtensions = { ...extensions };
          let changed = false;
          
          // Remove AI assistant extensions from recommendations
          if (extensions.recommendations) {
            const aiExtensions = ['anthropic.claude-code', 'roo.roo-code'];
            extensions.recommendations = extensions.recommendations.filter(ext => !aiExtensions.includes(ext));
            changed = true;
          }
          
          // Remove GitHub Copilot from unwanted recommendations
          if (extensions.unwantedRecommendations) {
            const copilotExtensions = ['github.copilot', 'github.copilot-chat'];
            extensions.unwantedRecommendations = extensions.unwantedRecommendations.filter(ext => !copilotExtensions.includes(ext));
            changed = true;
          }
          
          // Save extensions if changed and not in dry run
          if (changed && !dryRun) {
            await fs.writeJson(extensionsPath, extensions, { spaces: 2 });
            printSuccess('Updated VS Code extensions.json');
          } else if (changed) {
            printDebug('Would update VS Code extensions.json');
          }
        } catch (err) {
          printWarning(`Failed to update VS Code extensions.json: ${err.message}`);
        }
      }
    }
    
    // Remove all files
    for (const file of files) {
      if (typeof file === 'string') {
        if (await fileExists(file)) {
          if (dryRun) {
            printDebug(`Would remove: ${file}`);
          } else {
            await fs.remove(file);
            removedFiles.push(file);
            printSuccess(`Removed: ${file}`);
          }
        }
      }
    }
    
    // Remove all directories
    for (const dir of directories) {
      if (await fileExists(dir)) {
        if (dryRun) {
          printDebug(`Would remove directory: ${dir}`);
        } else {
          await fs.remove(dir);
          removedDirectories.push(dir);
          printSuccess(`Removed directory: ${dir}`);
        }
      }
    }
    
    // Check environment file and remove AI assistant variables
    const envPath = path.join(projectRoot, '.env');
    if (await fileExists(envPath)) {
      try {
        const envContent = await fs.readFile(envPath, 'utf8');
        const lines = envContent.split('\n');
        const newLines = [];
        const removedLines = [];
        
        // Filter out AI assistant environment variables
        for (const line of lines) {
          const varNames = [
            'ANTHROPIC_API_KEY', 'OPENAI_API_KEY',
            'STACKEXCHANGE_API_KEY', 'GITHUB_PERSONAL_ACCESS_TOKEN',
            'CONTEXT7_API_KEY', 'MEMORY_PATH', 'ALLOWED_COMMANDS',
            'BLOCKED_COMMANDS', 'COMMAND_TIMEOUT_MS',
            'CLAUDE_MEMORY_LIMIT', 'ROO_MAX_TOKENS'
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
          printSuccess(`Removed ${removedLines.length} AI assistant environment variables from .env`);
        } else if (removedLines.length > 0) {
          printDebug(`Would remove ${removedLines.length} AI assistant environment variables from .env`);
        }
      } catch (err) {
        printWarning(`Failed to update .env file: ${err.message}`);
      }
    }
    
    if (dryRun) {
      printSuccess('Dry run completed. No files were actually removed.');
      printInfo('To perform the actual removal, run the command without the --dry-run flag.');
    } else {
      printSuccess('All AI coding assistant configuration files have been removed.');
    }

    if (!includeVSCode) {
      printInfo('Note: VS Code settings were not modified to avoid disrupting your editor configuration.');
      printInfo('If desired, you can manually remove AI assistant settings from your VS Code settings.json.');
      printInfo('To include VS Code settings in the removal, use the --remove-all flag.');
    }
    
    return { 
      success: true, 
      removed: { 
        files: removedFiles,
        directories: removedDirectories,
        settings: removedSettings
      }
    };
  } catch (err) {
    printError(`Error during uninstall: ${err.message}`);
    if (logger) {
      logger.error(err.stack);
    }
    return { success: false, removed: { files: [], directories: [], settings: {} } };
  }
}

export default {
  uninstall,
  findAIAssistantFiles
};