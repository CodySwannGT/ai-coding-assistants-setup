/**
 * Environment Configuration
 * 
 * Provides functions for loading and managing environment variables.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileExists } from '../utils/file.js';
import { printWarning } from '../utils/logger.js';

/**
 * Load environment variables from .env file
 * @param {string} projectRoot Path to project root
 * @returns {Promise<Object>} Environment variables
 */
export async function loadEnvironmentVars(projectRoot) {
  const envPath = path.join(projectRoot, '.env');
  if (!await fileExists(envPath)) {
    return {};
  }

  try {
    const envContent = await fs.readFile(envPath, 'utf8');
    const env = {};

    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) {
        return;
      }
      
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        env[key] = value;
      }
    });

    return env;
  } catch (err) {
    printWarning(`Failed to load .env file: ${err.message}`);
    return {};
  }
}

/**
 * Create or update .env file with environment variables
 * @param {string} projectRoot Path to project root
 * @param {Object} env Environment variables
 * @param {boolean} [dryRun=false] Whether to actually write the file
 */
export async function saveEnvironmentVars(projectRoot, env, dryRun = false) {
  if (dryRun) {
    return;
  }
  
  try {
    const envPath = path.join(projectRoot, '.env');
    let envContent = '';
    
    for (const [key, value] of Object.entries(env)) {
      envContent += `${key}=${value}\n`;
    }
    
    await fs.writeFile(envPath, envContent, 'utf8');
  } catch (err) {
    printWarning(`Failed to save .env file: ${err.message}`);
  }
}

/**
 * Get an environment variable with fallback
 * @param {string} key Environment variable key
 * @param {Object} env Loaded environment variables
 * @param {string} [defaultValue=''] Default value if not found
 * @returns {string} Environment variable value or default
 */
export function getEnvValue(key, env, defaultValue = '') {
  return env[key] || process.env[key] || defaultValue;
}

export default {
  loadEnvironmentVars,
  saveEnvironmentVars,
  getEnvValue
};