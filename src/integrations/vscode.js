/**
 * VS Code Integration
 * 
 * Functions for configuring VS Code settings and extensions.
 */

import fs from 'fs-extra';
import path from 'path';
import { 
  getVSCodeUserConfigPath, 
  getVSCodeExtensionsPath,
  isMac, 
  isWindows 
} from '../config/paths.js';
import { 
  fileExists, 
  safeReadJson, 
  safeWriteJson, 
  ensureDirectory 
} from '../utils/file.js';
import { 
  printInfo, 
  printSuccess, 
  printWarning, 
  printDebug 
} from '../utils/logger.js';

/**
 * Detect if GitHub Copilot is installed in VS Code
 * @returns {Promise<{installed: boolean, path: string|null}>} Object indicating if Copilot is installed and its path
 */
export async function detectGitHubCopilot() {
  printDebug('Checking for GitHub Copilot installation...');

  try {
    // Get the VS Code extensions directory
    const extensionsPath = getVSCodeExtensionsPath();

    // Check for different Copilot extension patterns
    const copilotPatterns = [
      // Main GitHub Copilot extension
      'github.copilot-*',
      // GitHub Copilot Chat
      'github.copilot-chat-*',
      // Other Copilot variants
      '*copilot*'
    ];

    // Check for Copilot in extensions directory
    for (const pattern of copilotPatterns) {
      const extensionPath = path.join(extensionsPath, pattern);
      printDebug(`Checking for Copilot extensions matching: ${extensionPath}`);

      try {
        // Use glob-like pattern to find matching directories
        const matches = await fs.readdir(extensionsPath);
        const copilotMatches = matches.filter(dir => {
          return dir.toLowerCase().includes('copilot') && dir.toLowerCase().includes('github');
        });

        if (copilotMatches.length > 0) {
          const copilotPath = path.join(extensionsPath, copilotMatches[0]);
          printDebug(`Found GitHub Copilot at: ${copilotPath}`);
          return { installed: true, path: copilotPath };
        }
      } catch (err) {
        printDebug(`Error searching for Copilot with pattern ${pattern}: ${err.message}`);
        // Continue checking other patterns
      }
    }

    // Also check in VS Code integrated extensions
    // This location is used for extensions installed directly via VS Code
    const integratedExtPaths = [
      // Possible locations for integrated extensions
      path.join(getVSCodeUserConfigPath(), '..', 'extensions'),
      // For VS Code Insiders
      path.join(getVSCodeUserConfigPath(), '..', '..', 'Code - Insiders', 'User', 'extensions')
    ];

    for (const extPath of integratedExtPaths) {
      try {
        if (await fileExists(extPath)) {
          const matches = await fs.readdir(extPath);
          const copilotMatches = matches.filter(dir => {
            return dir.toLowerCase().includes('copilot') && dir.toLowerCase().includes('github');
          });

          if (copilotMatches.length > 0) {
            const copilotPath = path.join(extPath, copilotMatches[0]);
            printDebug(`Found GitHub Copilot at integrated location: ${copilotPath}`);
            return { installed: true, path: copilotPath };
          }
        }
      } catch (err) {
        printDebug(`Error checking integrated extension path ${extPath}: ${err.message}`);
        // Continue checking other locations
      }
    }

    printDebug('GitHub Copilot not found');
    return { installed: false, path: null };
  } catch (err) {
    printWarning(`Error detecting GitHub Copilot: ${err.message}`);
    return { installed: false, path: null };
  }
}

/**
 * Setup VS Code settings for AI assistants
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @param {boolean} [options.nonInteractive=false] Whether to run in non-interactive mode
 * @param {boolean} [options.forceOverwrite=false] Whether to force overwrite of existing configurations
 * @param {Function} [options.confirm] Function to confirm user choices
 * @returns {Promise<void>}
 */
export async function setupVSCodeSettings(options) {
  const { 
    projectRoot, 
    dryRun = false, 
    nonInteractive = false, 
    forceOverwrite = false,
    confirm = async () => true
  } = options;

  const vscodeDir = path.join(projectRoot, '.vscode');
  await ensureDirectory(vscodeDir, dryRun);

  const settingsPath = path.join(vscodeDir, 'settings.json');
  let settings = {};

  // Read existing settings if they exist
  const settingsExist = await fileExists(settingsPath);
  if (settingsExist) {
    settings = await safeReadJson(settingsPath) || {};
  }

  // Check for GitHub Copilot installation
  const { installed: copilotInstalled, path: copilotPath } = await detectGitHubCopilot();

  if (copilotInstalled) {
    printInfo(`GitHub Copilot detected at: ${copilotPath}`);

    // Ask user if they want to disable Copilot for this workspace
    let disableCopilot = false;
    if (!nonInteractive) {
      disableCopilot = await confirm({
        message: 'GitHub Copilot detected. Would you like to disable it for this workspace to avoid conflicts?',
        default: true
      });
    }

    if (disableCopilot || nonInteractive) {
      printInfo('Configuring settings to disable GitHub Copilot for this workspace');

      // Disable GitHub Copilot
      settings['github.copilot.enable'] = false;
      settings['github.copilot.editor.enableAutoCompletions'] = false;

      // If Copilot Chat is likely installed based on the path
      if (copilotPath && copilotPath.toLowerCase().includes('chat')) {
        settings['github.copilot.chat.enabled'] = false;
      }

      printSuccess('GitHub Copilot disabled for this workspace');
    } else {
      printInfo('GitHub Copilot will remain active alongside Claude/Roo - be aware of potential conflicts');

      // Configure settings to reduce conflicts
      settings['editor.inlineSuggest.suppressSuggestions'] = false;
      settings['editor.inlineSuggest.enabled'] = true;
      settings['editor.inlineSuggest.showToolbar'] = 'always';

      // Prioritize your preferred AI assistant
      const prioritizeClaudeRoo = await confirm({
        message: 'Would you like to prioritize Claude/Roo over GitHub Copilot?',
        default: true
      });
      
      if (prioritizeClaudeRoo) {
        // These settings favor Claude/Roo over Copilot
        settings['github.copilot.inlineSuggest.enable'] = true;
        settings['github.copilot.inlineSuggest.count'] = 1; // Reduce suggestions from Copilot

        printSuccess('Settings configured to prioritize Claude/Roo over GitHub Copilot');
      }
    }
  } else {
    printInfo('GitHub Copilot not detected');
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

  await safeWriteJson(settingsPath, settings, dryRun);
  printSuccess('VS Code settings updated for AI assistants.');

  // Update extensions.json to recommend required extensions
  const extensionsPath = path.join(vscodeDir, 'extensions.json');
  let extensions = {};

  // Read existing extensions if they exist
  const extensionsExist = await fileExists(extensionsPath);
  if (extensionsExist) {
    extensions = await safeReadJson(extensionsPath) || {};
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

  await safeWriteJson(extensionsPath, extensions, dryRun);
  printSuccess('VS Code extensions recommendations updated.');
}

export default {
  detectGitHubCopilot,
  setupVSCodeSettings
};