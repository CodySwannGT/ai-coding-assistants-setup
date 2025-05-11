/**
 * Git Integration
 * 
 * Functions for configuring Git hooks and ignore patterns.
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import {
  fileExists,
  // safeReadTextFile is unused,
  writeTextFile
} from '../utils/file.js';
import { 
  printHeader, 
  printInfo, 
  printWarning, 
  printSuccess, 
  printDebug 
} from '../utils/logger.js';
import { loadEnvironmentVars } from '../config/environment.js';

/**
 * Setup Git hooks with Claude integration
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {Object} options.logger Winston logger instance
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @param {boolean} [options.nonInteractive=false] Whether to run in non-interactive mode
 * @param {Function} [options.confirm] Function to confirm user choices
 * @returns {Promise<void>}
 */
export async function setupGitHooks(options) {
  const { 
    projectRoot, 
    logger, 
    dryRun = false, 
    nonInteractive = false,
    confirm = async () => true
  } = options;
  
  printHeader('Setting up Git Hooks with Claude Integration');

  // Check if .git directory exists
  const gitDir = path.join(projectRoot, '.git');
  if (!await fileExists(gitDir)) {
    printWarning('No .git directory found. Skipping Git hooks setup.');
    return;
  }

  // Get Claude API key if available
  const environmentVars = await loadEnvironmentVars(projectRoot);
  const claudeApiKey = environmentVars.ANTHROPIC_API_KEY;

  if (!claudeApiKey) {
    printWarning('No Anthropic API key found. Claude-based Git hooks require an API key.');

    if (!nonInteractive) {
      const setupAnyway = await confirm({
        message: 'Would you like to set up Git hooks anyway? (You can add the API key later)',
        default: false
      });

      if (!setupAnyway) {
        printInfo('Skipping Git hooks setup.');
        return;
      }
    } else {
      printInfo('Skipping Git hooks setup in non-interactive mode due to missing API key.');
      return;
    }
  }

  // Confirm hooks setup
  let setupConfirmed = true;
  if (!nonInteractive) {
    printInfo('Claude can enhance your Git workflow with AI-powered hooks:');
    printInfo('- Pre-commit code review');
    printInfo('- Commit message generation and validation');
    printInfo('- Security audits before pushing');
    printInfo('- Summaries of merged changes');
    printInfo('- Branch context when switching branches');
    printInfo('- Test-first development enforcement');
    printInfo('- Branch strategy enforcement');
    printInfo('- And more...');

    setupConfirmed = await confirm({
      message: 'Would you like to set up Git hooks with Claude integration?',
      default: true
    });

    // Create shared settings file for Claude and Roo
    if (setupConfirmed) {
      const enableTestFirst = await confirm({
        message: 'Would you like to promote test-first development in your project?',
        default: true
      });

      if (enableTestFirst) {
        // Create or update shared preferences file
        const sharedPrefsDir = path.join(projectRoot, '.ai-assistants');
        await fs.ensureDir(sharedPrefsDir);

        const sharedPrefsPath = path.join(sharedPrefsDir, 'shared-preferences.json');
        let sharedPrefs = {};

        // Check if the file already exists
        if (await fileExists(sharedPrefsPath)) {
          try {
            sharedPrefs = JSON.parse(await fs.readFile(sharedPrefsPath, 'utf8'));
          } catch (err) {
            printWarning(`Could not read shared preferences: ${err.message}`);
          }
        }

        // Update preferences
        sharedPrefs.codingPreferences = {
          ...sharedPrefs.codingPreferences,
          testFirstDevelopment: true,
          askAboutTestsWhenCoding: true
        };

        // Save preferences
        if (!dryRun) {
          await fs.writeJson(sharedPrefsPath, sharedPrefs, { spaces: 2 });
          printSuccess('Updated shared AI assistant preferences for test-first development.');
        } else {
          printInfo('[DRY RUN] Would update shared AI assistant preferences.');
        }
      }
    }
  }

  if (!setupConfirmed) {
    printInfo('Skipping Git hooks setup.');
    return;
  }

  try {
    // Import hooks module dynamically to avoid circular dependencies
    const { setupHooks } = await import('../hooks/index.js');

    // Setup hooks
    const results = await setupHooks({
      projectRoot,
      logger,
      dryRun,
      nonInteractive
    });

    // Report results
    if (results.success && results.success.length > 0) {
      printSuccess(`Successfully set up ${results.success.length} Git hooks:`);
      results.success.forEach(hook => {
        printInfo(`- ${hook}`);
      });
    }

    if (results.failed && results.failed.length > 0) {
      printWarning(`Failed to set up ${results.failed.length} Git hooks:`);
      results.failed.forEach(hook => {
        printWarning(`- ${hook}`);
      });
    }
    
    return results;
  } catch (err) {
    printWarning(`Failed to set up Git hooks: ${err.message}`);
    return { success: [], failed: ['all'] };
  }
}

/**
 * Setup .gitignore for AI assistant files
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @param {boolean} [options.nonInteractive=false] Whether to run in non-interactive mode
 * @param {Function} [options.confirm] Function to confirm user choices
 * @returns {Promise<void>}
 */
export async function setupGitignore(options) {
  const { 
    projectRoot, 
    dryRun = false, 
    nonInteractive = false,
    confirm = async () => true
  } = options;
  
  printHeader('Setting up .gitignore patterns');
  
  const gitignorePath = path.join(projectRoot, '.gitignore');
  let gitignoreContent = '';
  
  // Read existing gitignore if it exists
  try {
    const exists = await fileExists(gitignorePath);
    if (exists) {
      gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
    }
  } catch (err) {
    printWarning(`Could not read .gitignore: ${err.message}`);
  }
  
  // Check for patterns that should NOT be in .gitignore
  const patternsToKeep = [
    '.roo/rules/',
    '.roo/mcp.json',
    '.mcp.json',
    'CLAUDE.md',
    '.roomodes',
    '.roo/rules-'
  ];
  
  let foundIncorrectPatterns = false;
  const incorrectPatterns = [];
  
  for (const pattern of patternsToKeep) {
    if (gitignoreContent.includes(pattern)) {
      incorrectPatterns.push(pattern);
      foundIncorrectPatterns = true;
    }
  }
  
  if (foundIncorrectPatterns) {
    printWarning('The following configuration files are currently ignored but should be shared:');
    for (const pattern of incorrectPatterns) {
      printWarning(`- "${pattern}" (team-shared configuration)`);
    }
    
    let removePatterns = false;
    if (nonInteractive) {
      removePatterns = true;
    } else {
      removePatterns = await confirm({
        message: 'Would you like to remove these from .gitignore?',
        default: true
      });
    }
    
    if (removePatterns) {
      for (const pattern of incorrectPatterns) {
        // Remove the pattern, handling various formatting possibilities
        const regex = new RegExp(`(^|\\n)${pattern}.*$`, 'gm');
        gitignoreContent = gitignoreContent.replace(regex, '');
      }
    }
  }
  
  // Check for Task Master AI patterns that might already exist
  const taskMasterPatterns = [
    '.taskmasterconfig',
    'tasks/*.txt',
    'tasks/task_*.txt',
    'tasks/'
  ];

  // Check for and remove existing Task Master patterns that might be defined elsewhere in the gitignore
  for (const pattern of taskMasterPatterns) {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '\\*')}$`, 'gm');
    if (regex.test(gitignoreContent)) {
      printInfo(`Found existing Task Master pattern: ${pattern}`);
      gitignoreContent = gitignoreContent.replace(regex, '');
    }
  }

  // Check for patterns that might expose sensitive files
  const sensitivePatterns = [
    '!.env',
    '!.env.example',
    '!credentials',
    '!secrets',
    '!*.key',
    '!*.pem'
  ];
  
  let foundSensitivePatterns = false;
  const sensitivePatternsFound = [];
  
  for (const pattern of sensitivePatterns) {
    if (gitignoreContent.includes(pattern)) {
      sensitivePatternsFound.push(pattern);
      foundSensitivePatterns = true;
    }
  }
  
  if (foundSensitivePatterns) {
    printWarning('The following patterns in .gitignore may cause issues:');
    for (const pattern of sensitivePatternsFound) {
      printWarning(`- "${pattern}" (may expose sensitive files)`);
    }
    
    let removePatterns = false;
    if (nonInteractive) {
      removePatterns = true;
    } else {
      removePatterns = await confirm({
        message: 'Would you like to remove these patterns?',
        default: true
      });
    }
    
    if (removePatterns) {
      for (const pattern of sensitivePatternsFound) {
        // Remove the pattern
        const regex = new RegExp(`(^|\\n)${pattern}.*$`, 'gm');
        gitignoreContent = gitignoreContent.replace(regex, '');
      }
    }
  }
  
  // Check if AI assistant patterns already exist
  if (gitignoreContent.includes('# AI Assistant files')) {
    const updatePatterns = nonInteractive || await confirm({
      message: 'AI assistant patterns already exist in .gitignore. Update them?',
      default: false
    });
    
    if (!updatePatterns) {
      printInfo('Skipping .gitignore update.');
      return;
    }
  }
  
  // Add AI assistant patterns
  const aiPatterns = `
# AI Assistant files (shared configurations)
# DO NOT ignore these files as they should be shared with the team
# .mcp.json
# .roo/mcp.json
# .roo/rules/
# CLAUDE.md
# .roomodes
# .roo/rules-*/

# AI Assistant files (sensitive/personal configurations)
.mcp.json.local
.roo/mcp.json.local
.claude/credentials.json.enc
.roo/credentials.json.enc
.ai-credentials/
.ai-credentials.json
.env

# Task Master AI files
.taskmasterconfig
tasks/*.txt
tasks/task_*.txt
# Allow tracking tasks.json for project structure but not individual task files
!tasks/tasks.json
`;
  
  // Make sure .env.example is not ignored
  if (gitignoreContent.includes('.env.example')) {
    gitignoreContent = gitignoreContent.replace(/^\.env\.example$/gm, '');
    gitignoreContent = gitignoreContent.replace(/^\.env\.\*$/gm, '.env\n!.env.example');
  }

  // Check if we need to append the patterns or if they already exist
  if (!gitignoreContent.includes('# AI Assistant files')) {
    gitignoreContent += aiPatterns;
    await writeTextFile(gitignorePath, gitignoreContent, dryRun);
    printSuccess('.gitignore updated with AI assistant patterns.');
  } else {
    // Replace existing patterns
    const newContent = gitignoreContent.replace(
      /# AI Assistant files(\r?\n.*?)+?(?=\r?\n\r?\n|$)/g,
      aiPatterns.trim()
    );

    await writeTextFile(gitignorePath, newContent, dryRun);
    printSuccess('.gitignore patterns for AI assistants updated.');
  }

  // Create or update .env.example file
  const envExamplePath = path.join(projectRoot, '.env.example');
  const envExampleContent = `# AI Coding Assistants Environment Variables Example
# This file contains examples of required environment variables
# Make a copy of this file named .env and fill in your own values

# GitHub MCP Server
GITHUB_PERSONAL_ACCESS_TOKEN=your-github-token-here

# Context7 MCP Server
CONTEXT7_API_KEY=your-context7-key-here

# Memory MCP Server
MEMORY_PATH=/path/to/your/memory.jsonl

# StackOverflow MCP Server
STACKEXCHANGE_API_KEY=your-stackexchange-key-here
SO_MAX_SEARCH_RESULTS=5
SO_SEARCH_TIMEOUT_MS=5000
SO_INCLUDE_CODE_SNIPPETS=true
SO_PREFER_ACCEPTED_ANSWERS=true

# Command Shell MCP Server
ALLOWED_COMMANDS=git,npm,node,yarn,ls,cat,echo
BLOCKED_COMMANDS=rm,sudo,chmod,chown,dd,mkfs,mount,umount,reboot,shutdown
COMMAND_TIMEOUT_MS=5000
COMMAND_WORKING_DIRECTORY=
COMMAND_LOG_COMMANDS=true
COMMAND_ENABLE_ENV_VARS=false

# Anthropic API Key (for Claude Code and Task-Master AI)
ANTHROPIC_API_KEY=your-anthropic-key-here

# OpenAI API Key (optional, for Roo Code)
OPENAI_API_KEY=your-openai-key-here
`;

  await writeTextFile(envExamplePath, envExampleContent, dryRun);
  printSuccess('Created/updated .env.example file for reference.');
}

/**
 * Remove Git hooks
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {Object} options.logger Winston logger instance
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @returns {Promise<{success: string[], failed: string[]}>} Results
 */
export async function removeGitHooks(options) {
  const { projectRoot, logger, dryRun = false } = options;
  
  try {
    // Import hooks module dynamically to avoid circular dependencies
    const { removeHooks } = await import('../hooks/index.js');
    
    // Remove hooks
    return await removeHooks({
      projectRoot,
      logger,
      dryRun
    });
  } catch (err) {
    printWarning(`Failed to remove Git hooks: ${err.message}`);
    return { success: [], failed: ['all'] };
  }
}

/**
 * Detect if repository uses GitHub
 * @param {string} projectRoot Path to project root
 * @returns {Promise<{usesGithub: boolean, owner: string, repo: string}>} Result object
 */
export async function detectGitHubRepository(projectRoot) {
  const gitDir = path.join(projectRoot, '.git');
  if (!await fileExists(gitDir)) {
    return { usesGithub: false, owner: '', repo: '' };
  }
  
  try {
    // Try to detect repository info from git
    const remoteUrl = execSync('git remote get-url origin', { 
      encoding: 'utf8',
      cwd: projectRoot
    }).trim();
    
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)(\.git)?$/);
    
    if (match) {
      const [, owner, repo] = match;
      return {
        usesGithub: true,
        owner,
        repo,
        branch: 'main' // Default, could be detected more accurately
      };
    }
  } catch (err) {
    printDebug(`Could not detect GitHub repository information: ${err.message}`);
  }
  
  return { usesGithub: false, owner: '', repo: '' };
}

export default {
  setupGitHooks,
  setupGitignore,
  removeGitHooks,
  detectGitHubRepository
};