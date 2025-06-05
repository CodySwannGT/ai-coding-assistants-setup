import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

// Required scripts for CI/CD workflows
const requiredScripts = {
  'lint': 'echo "lint not configured yet"',
  'typecheck': 'echo "typecheck not configured yet"',
  'format:check': 'echo "format:check not configured yet"',
  'build': 'echo "build not configured yet"',
  'test': 'echo "test not configured yet"',
  'test:unit': 'echo "test:unit not configured yet"',
  'test:integration': 'echo "test:integration not configured yet"',
  'test:e2e': 'echo "test:e2e not configured yet"'
};

interface PackageJson {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  [key: string]: any;
}

export interface ScriptUpdateResult {
  success: boolean;
  addedScripts: string[];
  skippedScripts: string[];
  error?: string;
}

/**
 * Updates package.json with required CI/CD scripts
 * Only adds missing scripts, preserves existing ones
 */
export async function updatePackageScripts(projectRoot: string): Promise<ScriptUpdateResult> {
  const pkgPath = path.join(projectRoot, 'package.json');
  
  try {
    // Check if package.json exists
    if (!await fs.pathExists(pkgPath)) {
      console.log(chalk.yellow('⚠️  No package.json found, skipping script updates'));
      return {
        success: false,
        addedScripts: [],
        skippedScripts: [],
        error: 'No package.json found'
      };
    }
    
    // Read and parse package.json
    const pkgContent = await fs.readFile(pkgPath, 'utf8');
    let pkg: PackageJson;
    
    try {
      pkg = JSON.parse(pkgContent);
    } catch (parseError) {
      console.error(chalk.red('❌ Failed to parse package.json'));
      return {
        success: false,
        addedScripts: [],
        skippedScripts: [],
        error: 'Invalid JSON in package.json'
      };
    }
    
    // Initialize scripts object if it doesn't exist
    pkg.scripts = pkg.scripts || {};
    
    // Track what we add and skip
    const addedScripts: string[] = [];
    const skippedScripts: string[] = [];
    
    // Add only missing scripts
    for (const [scriptName, scriptCommand] of Object.entries(requiredScripts)) {
      if (!pkg.scripts[scriptName]) {
        pkg.scripts[scriptName] = scriptCommand;
        addedScripts.push(scriptName);
      } else {
        skippedScripts.push(scriptName);
      }
    }
    
    // Only write back if we made changes
    if (addedScripts.length > 0) {
      // Preserve formatting style from original file
      const indent = detectIndent(pkgContent);
      const formatted = JSON.stringify(pkg, null, indent) + '\n';
      
      await fs.writeFile(pkgPath, formatted);
      
      console.log(chalk.green('✅ Updated package.json with missing scripts'));
      console.log(chalk.gray(`   Added: ${addedScripts.join(', ')}`));
      
      if (skippedScripts.length > 0) {
        console.log(chalk.gray(`   Preserved existing: ${skippedScripts.join(', ')}`));
      }
    } else {
      console.log(chalk.gray('ℹ️  All required scripts already exist'));
    }
    
    return {
      success: true,
      addedScripts,
      skippedScripts
    };
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to update package.json scripts'));
    console.error(error);
    return {
      success: false,
      addedScripts: [],
      skippedScripts: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Detects the indentation used in a JSON string
 */
function detectIndent(jsonString: string): number {
  const lines = jsonString.split('\n');
  for (const line of lines) {
    const match = line.match(/^(\s+)"/);
    if (match) {
      return match[1].length;
    }
  }
  return 2; // Default to 2 spaces
}

/**
 * Gets information about existing scripts in package.json
 */
export async function getExistingScripts(projectRoot: string): Promise<Record<string, string> | null> {
  const pkgPath = path.join(projectRoot, 'package.json');
  
  try {
    if (!await fs.pathExists(pkgPath)) {
      return null;
    }
    
    const pkg: PackageJson = await fs.readJson(pkgPath);
    return pkg.scripts || {};
  } catch {
    return null;
  }
}

/**
 * Checks if all required scripts exist in package.json
 */
export async function hasAllRequiredScripts(projectRoot: string): Promise<boolean> {
  const existingScripts = await getExistingScripts(projectRoot);
  if (!existingScripts) return false;
  
  return Object.keys(requiredScripts).every(script => script in existingScripts);
}