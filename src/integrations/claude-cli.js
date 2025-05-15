/**
 * Claude CLI Integration
 * 
 * Functions for integrating with Claude CLI to provide AI-powered Git hooks.
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { safeReadJson, fileExists } from '../utils/file.js';

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
 * Call Claude CLI with a prompt
 * @param {Object} options Options for the Claude CLI call
 * @param {string} options.prompt The prompt to send to Claude
 * @param {string} [options.format='text'] Output format ('json' or 'text')
 * @returns {Promise<Object|string>} Claude's response
 */
export async function callClaudeCli({ 
  prompt,
  format = 'text'
}) {
  // Check if Claude CLI is available
  const cliAvailable = await isClaudeCliAvailable();
  if (!cliAvailable) {
    throw new Error('Claude CLI is not available');
  }
  
  // Create a temporary file for the prompt to avoid shell interpretation issues
  const tempDir = path.join(process.cwd(), '.claude', 'temp');
  await fs.ensureDir(tempDir);
  const promptFile = path.join(tempDir, `prompt-${Date.now()}.txt`);
  await fs.writeFile(promptFile, prompt);
  
  try {
    // Create a safe command using the cat | claude pattern with the --print flag
    // We write the prompt to a file to avoid shell interpretation issues
    let command = `cat ${promptFile} | claude --print`;
    
    // Add output format if needed
    if (format === 'json') {
      command += ' --output-format json';
    }
    
    // Log the command for debugging (with abbreviated prompt for readability)
    const logPrompt = prompt.length > 50 
      ? prompt.substring(0, 50) + '...' 
      : prompt;
      
    console.log(`Executing Claude CLI command: cat prompt.txt | claude --print ${format === 'json' ? '--output-format json' : ''}`);
    console.log(`Prompt content starts with: ${logPrompt}`);
    
    // Execute the command
    const output = execSync(command, { encoding: 'utf8' });
    
    // Parse JSON if requested
    if (format === 'json') {
      try {
        return JSON.parse(output);
      } catch (parseErr) {
        console.error('Failed to parse JSON output:', parseErr.message);
        return output; // Return raw output if JSON parsing fails
      }
    }
    
    return output;
  } catch (err) {
    console.error(`Claude CLI error: ${err.message}`);
    throw new Error(`Failed to call Claude CLI: ${err.message}`);
  } finally {
    // Clean up the temporary file
    await fs.remove(promptFile);
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