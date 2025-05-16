/**
 * Environment Configuration
 * 
 * Provides functions for loading and managing environment variables.
 */

import fs from 'fs-extra';
import path from 'path';
import { Feedback } from '../utils/feedback';

/**
 * Environment variables mapping
 */
export interface EnvVariables {
  [key: string]: string;
}

/**
 * Load environment variables from .env file
 * @param projectRoot Path to project root
 * @returns Environment variables object
 */
export async function loadEnvironmentVars(projectRoot: string): Promise<EnvVariables> {
  const envPath = path.join(projectRoot, '.env');
  if (!await fs.pathExists(envPath)) {
    return {};
  }

  try {
    const envContent = await fs.readFile(envPath, 'utf8');
    const env: EnvVariables = {};

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
  } catch (error) {
    Feedback.warning(`Failed to load .env file: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

/**
 * Create or update .env file with environment variables
 * @param projectRoot Path to project root
 * @param env Environment variables
 * @param dryRun Whether to actually write the file (default: false)
 */
export async function saveEnvironmentVars(
  projectRoot: string, 
  env: EnvVariables, 
  dryRun: boolean = false
): Promise<void> {
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
    Feedback.success('Environment variables saved successfully');
  } catch (error) {
    Feedback.warning(`Failed to save .env file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get an environment variable with fallback
 * @param key Environment variable key
 * @param env Loaded environment variables
 * @param defaultValue Default value if not found (default: '')
 * @returns Environment variable value or default
 */
export function getEnvValue(key: string, env: EnvVariables, defaultValue: string = ''): string {
  return env[key] || process.env[key] || defaultValue;
}

/**
 * Environment utilities
 */
export const Environment = {
  loadEnvironmentVars,
  saveEnvironmentVars,
  getEnvValue
};

export default Environment;