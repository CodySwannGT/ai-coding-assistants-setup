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
 * @param {string} [options.model='claude-3-opus-20240229'] The Claude model to use
 * @param {number} [options.maxTokens=2000] Maximum number of tokens to generate
 * @param {number} [options.temperature=0.7] Temperature for generation
 * @param {string} [options.format='json'] Output format ('json' or 'text')
 * @param {string} [options.jsonSchema] JSON schema for structured output (if format is 'json')
 * @returns {Promise<Object|string>} Claude's response
 */
export async function callClaudeCli({ 
  prompt, 
  model = 'claude-3-opus-20240229', 
  maxTokens = 2000, 
  temperature = 0.7,
  format = 'json',
  jsonSchema
}) {
  // Check if Claude CLI is available
  const cliAvailable = await isClaudeCliAvailable();
  if (!cliAvailable) {
    throw new Error('Claude CLI is not available');
  }
  
  // Split the content into instructions (for -p flag) and data (for piping)
  // For our use case, we'll treat everything as instructions
  const instructions = prompt;
  
  // Create a temporary file for any data that needs to be piped
  const tempDir = path.join(process.cwd(), '.claude', 'temp');
  await fs.ensureDir(tempDir);
  const dataFile = path.join(tempDir, `data-${Date.now()}.txt`);
  
  // We'll create an empty file - our prompt will go in the -p parameter
  // In hooks that need to pipe git data, they should modify this approach
  await fs.writeFile(dataFile, '');
  
  try {
    // Build the Claude CLI command using the pipe approach
    let command = `cat ${dataFile} | claude`;
    
    // Add command-line options
    command += ` -p "${instructions.replace(/"/g, '\\"')}"`;
    command += ` --max-tokens ${maxTokens}`;
    command += ` --temperature ${temperature}`;
    
    if (model) {
      command += ` --model ${model}`;
    }
    
    // Add format-specific options
    if (format === 'json') {
      command += ' --format json';
      
      if (jsonSchema) {
        const schemaFile = path.join(tempDir, `schema-${Date.now()}.json`);
        await fs.writeFile(schemaFile, JSON.stringify(jsonSchema));
        command += ` --json-schema ${schemaFile}`;
      }
    }
    
    // Log the command for debugging (with abbreviated prompt for readability)
    const logPrompt = instructions.length > 50 
      ? instructions.substring(0, 50) + '...' 
      : instructions;
      
    console.log(`Executing Claude CLI command: cat ${dataFile} | claude -p "${logPrompt}" [... args]`);
    
    // Execute the command
    const output = execSync(command, { encoding: 'utf8' });
    
    // Parse the output
    if (format === 'json') {
      try {
        return JSON.parse(output);
      } catch (parseErr) {
        console.error('Failed to parse JSON output:', parseErr.message);
        console.error('Raw output:', output);
        return output; // Return raw output if JSON parsing fails
      }
    }
    
    return output;
  } catch (err) {
    throw new Error(`Failed to call Claude CLI: ${err.message}`);
  } finally {
    // Clean up temporary files
    await fs.remove(dataFile);
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