/**
 * Claude CLI Integration
 * 
 * Functions for integrating with Claude CLI to provide AI-powered Git hooks.
 */

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileExists, safeReadJson } from '../utils/file.js';

/**
 * Check if Claude CLI is installed and available
 * @returns {Promise<boolean>} Whether Claude CLI is available
 */
export async function isClaudeCliAvailable() {
  try {
    execSync('which claude', { stdio: 'ignore' });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Get the Claude CLI version
 * @returns {Promise<string|null>} Claude CLI version or null if not available
 */
export async function getClaudeCliVersion() {
  try {
    const output = execSync('claude --version', { encoding: 'utf8' });
    const versionMatch = output.match(/claude\s+version\s+(\S+)/i);
    return versionMatch ? versionMatch[1] : null;
  } catch (err) {
    return null;
  }
}

/**
 * Call Claude CLI with a prompt and content file
 * @param {Object} options Options for the Claude CLI call
 * @param {string} options.prompt The instructions to send to Claude (via -p flag)
 * @param {string} [options.contentFile] Path to a file to pipe to Claude as input
 * @param {string} [options.content] Content to pipe to Claude as input (alternative to contentFile)
 * @param {boolean} [options.json=false] Whether to expect JSON output
 * @returns {Promise<string>} Claude's response
 */
export async function callClaudeCli({ 
  prompt,
  contentFile,
  content,
  json = false
}) {
  // Check if Claude CLI is available
  const cliAvailable = await isClaudeCliAvailable();
  if (!cliAvailable) {
    throw new Error('Claude CLI is not available');
  }
  
  // If content is provided but not a file, create a temporary file
  let tempFile = null;
  let fileToUse = contentFile;
  
  if (!contentFile && content) {
    const tempDir = path.join(process.cwd(), '.claude', 'temp');
    await fs.ensureDir(tempDir);
    tempFile = path.join(tempDir, `content-${Date.now()}.txt`);
    await fs.writeFile(tempFile, content);
    fileToUse = tempFile;
  }
  
  try {
    // Prepare the command
    // If there's a content file, pipe it to Claude
    // Otherwise, use an empty echo command to pipe nothing
    let command;
    
    if (fileToUse) {
      command = `cat "${fileToUse}"`;
    } else {
      command = 'echo ""';
    }
    
    // Safely escape the prompt for the -p parameter
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    
    // Complete the command with claude and the -p (--print) flag
    command += ` | claude -p '${escapedPrompt}'`;
    
    // Add JSON output format if requested
    if (json) {
      command += ' --output-format json';
    }
    
    // Log a simpler version of the command for debugging
    console.log(`Executing Claude CLI command: cat [content] | claude -p [prompt]`);
    
    if (fileToUse) {
      console.log(`Using content from file: ${fileToUse}`);
    }
    
    // Execute the command
    const output = execSync(command, { encoding: 'utf8' });
    
    return output;
  } catch (err) {
    console.error(`Claude CLI error: ${err.message}`);
    throw new Error(`Failed to call Claude CLI: ${err.message}`);
  } finally {
    // Clean up any temporary files
    if (tempFile) {
      await fs.remove(tempFile);
    }
  }
}

/**
 * Get Claude CLI configuration
 * @param {Object} options Options
 * @param {string} options.projectRoot Project root directory
 * @returns {Promise<Object>} Claude CLI configuration
 */
export async function getClaudeCliConfig({ projectRoot }) {
  const configPath = path.join(projectRoot, '.claude', 'settings.json');
  if (await fileExists(configPath)) {
    return safeReadJson(configPath);
  }
  
  return {
    model: 'claude-3-opus-20240229',
    maxTokens: 2000,
    temperature: 0.7
  };
}

export default {
  isClaudeCliAvailable,
  getClaudeCliVersion,
  callClaudeCli,
  getClaudeCliConfig
};