/**
 * File Utils
 * 
 * Provides utilities for file operations.
 */

import fs from 'fs-extra';
import path from 'path';
import { printDebug } from './logger.js';

/**
 * Ensure a directory exists
 * @param {string} dirPath Directory path to ensure
 * @param {boolean} [dryRun=false] Whether to actually create the directory
 */
export async function ensureDirectory(dirPath, dryRun = false) {
  if (dryRun) {
    printDebug(`Would create directory: ${dirPath}`);
    return;
  }
  
  try {
    await fs.ensureDir(dirPath);
    printDebug(`Ensured directory exists: ${dirPath}`);
  } catch (err) {
    throw new Error(`Failed to create directory ${dirPath}: ${err.message}`);
  }
}

/**
 * Check if a file exists
 * @param {string} filePath File path to check
 * @returns {Promise<boolean>} Whether the file exists
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Safely read a JSON file, returns null if file doesn't exist
 * @param {string} filePath Path to JSON file
 * @returns {Promise<Object|null>} Parsed JSON or null
 */
export async function safeReadJson(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Safely write JSON to a file
 * @param {string} filePath Path to write JSON file
 * @param {Object} data Data to write
 * @param {boolean} [dryRun=false] Whether to actually write the file
 */
export async function safeWriteJson(filePath, data, dryRun = false) {
  if (dryRun) {
    printDebug(`Would write JSON to: ${filePath}`);
    printDebug(JSON.stringify(data, null, 2));
    return;
  }
  
  const dirPath = path.dirname(filePath);
  await ensureDirectory(dirPath);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  printDebug(`Wrote JSON to: ${filePath}`);
}

/**
 * Write text to a file
 * @param {string} filePath Path to write file
 * @param {string} content Text content to write
 * @param {boolean} [dryRun=false] Whether to actually write the file
 */
export async function writeTextFile(filePath, content, dryRun = false) {
  if (dryRun) {
    printDebug(`Would write text to: ${filePath}`);
    return;
  }
  
  const dirPath = path.dirname(filePath);
  await ensureDirectory(dirPath);
  await fs.writeFile(filePath, content, 'utf8');
  printDebug(`Wrote text to: ${filePath}`);
}

/**
 * Safely read a text file, returns empty string if file doesn't exist
 * @param {string} filePath Path to text file
 * @returns {Promise<string>} File content or empty string
 */
export async function safeReadTextFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return '';
    }
    throw err;
  }
}

/**
 * Find the project root (searches for package.json)
 * @returns {Promise<string>} Project root path
 */
export async function findProjectRoot() {
  let currentDir = process.cwd();
  const root = path.parse(currentDir).root;
  
  while (currentDir !== root) {
    try {
      const packageJsonPath = path.join(currentDir, 'package.json');
      await fs.access(packageJsonPath);
      return currentDir;
    } catch (err) {
      // Continue searching upward
    }
    
    currentDir = path.dirname(currentDir);
  }
  
  throw new Error('Could not find a project root. Make sure you are inside a JavaScript project with a package.json file.');
}

/**
 * Detect if this is a monorepo
 * @param {string} projectRoot Project root path
 * @returns {Promise<boolean>} Whether this is a monorepo
 */
export async function isMonorepo(projectRoot) {
  try {
    // Check for various monorepo indicators
    const hasTurbo = await fileExists(path.join(projectRoot, 'turbo.json'));
    const hasPnpmWorkspace = await fileExists(path.join(projectRoot, 'pnpm-workspace.yaml'));
    
    let hasWorkspacesInPackageJson = false;
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (await fileExists(packageJsonPath)) {
      const packageJson = await safeReadJson(packageJsonPath);
      hasWorkspacesInPackageJson = !!packageJson?.workspaces;
    }
    
    return hasTurbo || hasPnpmWorkspace || hasWorkspacesInPackageJson;
  } catch (err) {
    console.warn(`Error detecting monorepo: ${err.message}`);
    return false;
  }
}

export default {
  ensureDirectory,
  fileExists,
  safeReadJson,
  safeWriteJson,
  writeTextFile,
  safeReadTextFile,
  findProjectRoot,
  isMonorepo
};