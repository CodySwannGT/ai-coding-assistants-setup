/**
 * Project Detector
 * 
 * Utility functions to detect various technologies and tools in a project.
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Check if a package is installed in the project
 * @param {string} projectRoot Path to the project root
 * @param {string} packageName Name of the package to check for
 * @returns {Promise<boolean>} Whether the package is installed
 */
export async function isPackageInstalled(projectRoot, packageName) {
  try {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    
    if (!await fs.pathExists(packageJsonPath)) {
      return false;
    }
    
    const packageJson = await fs.readJson(packageJsonPath);
    const dependencies = { 
      ...packageJson.dependencies, 
      ...packageJson.devDependencies 
    };
    
    return !!dependencies[packageName];
  } catch (err) {
    return false;
  }
}

/**
 * Check if a script exists in package.json
 * @param {string} projectRoot Path to the project root
 * @param {string} scriptName Name of the script to check for
 * @returns {Promise<boolean>} Whether the script exists
 */
export async function hasNpmScript(projectRoot, scriptName) {
  try {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    
    if (!await fs.pathExists(packageJsonPath)) {
      return false;
    }
    
    const packageJson = await fs.readJson(packageJsonPath);
    return !!(packageJson.scripts && packageJson.scripts[scriptName]);
  } catch (err) {
    return false;
  }
}

/**
 * Check if TypeScript is used in the project
 * @param {string} projectRoot Path to the project root
 * @returns {Promise<boolean>} Whether TypeScript is used
 */
export async function isTypeScriptProject(projectRoot) {
  // Look for tsconfig.json
  const hasTsConfig = await fs.pathExists(path.join(projectRoot, 'tsconfig.json'));
  if (hasTsConfig) return true;
  
  // Look for typescript as a dependency
  const hasTypeScriptDep = await isPackageInstalled(projectRoot, 'typescript');
  if (hasTypeScriptDep) return true;
  
  // Look for .ts files in the project
  try {
    const srcDir = path.join(projectRoot, 'src');
    if (await fs.pathExists(srcDir)) {
      const files = await fs.readdir(srcDir, { recursive: true });
      return files.some(file => file.endsWith('.ts') || file.endsWith('.tsx'));
    }
  } catch (err) {
    // Ignore directory read errors
  }
  
  return false;
}

/**
 * Check if TypeScript type checking is configured
 * @param {string} projectRoot Path to the project root
 * @returns {Promise<{hasTypesCheck: boolean, scriptName: string|null}>} Type checking info
 */
export async function hasTypeScriptTypeChecking(projectRoot) {
  const commonTypeCheckScripts = [
    'type-check', 
    'typecheck', 
    'types:check', 
    'check-types', 
    'check:types',
    'tsc',
    'tsc:check'
  ];
  
  for (const scriptName of commonTypeCheckScripts) {
    if (await hasNpmScript(projectRoot, scriptName)) {
      return { hasTypesCheck: true, scriptName };
    }
  }
  
  return { hasTypesCheck: false, scriptName: null };
}

/**
 * Detect linter used in the project
 * @param {string} projectRoot Path to the project root
 * @returns {Promise<{linter: string|null, scriptName: string|null}>} Linter info
 */
export async function detectLinter(projectRoot) {
  // Check for ESLint
  if (await isPackageInstalled(projectRoot, 'eslint')) {
    // Look for ESLint config files
    const eslintConfigFiles = [
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc',
      '.eslintrc.yaml'
    ];
    
    for (const configFile of eslintConfigFiles) {
      if (await fs.pathExists(path.join(projectRoot, configFile))) {
        const commonScripts = ['lint', 'eslint', 'lint:js', 'lint:ts'];
        for (const scriptName of commonScripts) {
          if (await hasNpmScript(projectRoot, scriptName)) {
            return { linter: 'eslint', scriptName };
          }
        }
        return { linter: 'eslint', scriptName: null };
      }
    }
  }
  
  // Check for TSLint (legacy)
  if (await isPackageInstalled(projectRoot, 'tslint')) {
    if (await hasNpmScript(projectRoot, 'lint')) {
      return { linter: 'tslint', scriptName: 'lint' };
    }
    return { linter: 'tslint', scriptName: null };
  }
  
  // Check for standard.js
  if (await isPackageInstalled(projectRoot, 'standard')) {
    if (await hasNpmScript(projectRoot, 'lint')) {
      return { linter: 'standard', scriptName: 'lint' };
    }
    return { linter: 'standard', scriptName: null };
  }
  
  return { linter: null, scriptName: null };
}

/**
 * Detect formatter used in the project
 * @param {string} projectRoot Path to the project root
 * @returns {Promise<{formatter: string|null, scriptName: string|null}>} Formatter info
 */
export async function detectFormatter(projectRoot) {
  // Check for Prettier
  if (await isPackageInstalled(projectRoot, 'prettier')) {
    // Look for Prettier config files
    const prettierConfigFiles = [
      '.prettierrc',
      '.prettierrc.js',
      '.prettierrc.json',
      '.prettierrc.yml',
      '.prettierrc.yaml',
      'prettier.config.js'
    ];
    
    for (const configFile of prettierConfigFiles) {
      if (await fs.pathExists(path.join(projectRoot, configFile))) {
        const commonScripts = ['format', 'prettier', 'pretty', 'fmt'];
        for (const scriptName of commonScripts) {
          if (await hasNpmScript(projectRoot, scriptName)) {
            return { formatter: 'prettier', scriptName };
          }
        }
        return { formatter: 'prettier', scriptName: null };
      }
    }
  }
  
  // Check if ESLint is used with formatting plugins
  const { linter } = await detectLinter(projectRoot);
  if (linter === 'eslint') {
    try {
      const eslintConfigPath = path.join(projectRoot, '.eslintrc.json');
      const eslintConfig = await fs.readJson(eslintConfigPath);
      if (eslintConfig.extends?.includes('prettier') || 
          eslintConfig.plugins?.includes('prettier')) {
        const scriptName = await hasNpmScript(projectRoot, 'lint:fix') ? 'lint:fix' : null;
        return { formatter: 'eslint+prettier', scriptName };
      }
    } catch (err) {
      // Ignore config file errors
    }
  }
  
  return { formatter: null, scriptName: null };
}

/**
 * Check if commitlint is used in the project
 * @param {string} projectRoot Path to the project root
 * @returns {Promise<{hasCommitlint: boolean, configType: string|null}>} Whether commitlint is used
 */
export async function hasCommitlint(projectRoot) {
  // Check for commitlint as a dependency
  const hasCommitlintDep = await isPackageInstalled(projectRoot, '@commitlint/cli');
  
  if (hasCommitlintDep) {
    // Check for commitlint config files
    const configFiles = [
      'commitlint.config.js',
      '.commitlintrc.js',
      '.commitlintrc.json',
      '.commitlintrc.yml'
    ];
    
    for (const configFile of configFiles) {
      if (await fs.pathExists(path.join(projectRoot, configFile))) {
        return { hasCommitlint: true, configType: path.basename(configFile) };
      }
    }
    
    // Check for configuration in package.json
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.commitlint) {
        return { hasCommitlint: true, configType: 'package.json' };
      }
    } catch (err) {
      // Ignore package.json read errors
    }
    
    return { hasCommitlint: true, configType: null };
  }
  
  return { hasCommitlint: false, configType: null };
}

/**
 * Add a script to package.json
 * @param {string} projectRoot Path to the project root
 * @param {string} scriptName Name of the script to add
 * @param {string} scriptCommand Command to run for the script
 * @returns {Promise<boolean>} Whether the script was added successfully
 */
export async function addNpmScript(projectRoot, scriptName, scriptCommand) {
  try {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    
    if (!await fs.pathExists(packageJsonPath)) {
      return false;
    }
    
    const packageJson = await fs.readJson(packageJsonPath);
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    packageJson.scripts[scriptName] = scriptCommand;
    
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Get recommended type checking npm script for TypeScript projects
 * @param {string} projectRoot Path to the project root
 * @returns {Promise<{scriptName: string, scriptCommand: string}>} Recommended script
 */
export async function getRecommendedTypeCheckScript(projectRoot) {
  // Default typescript type checking command
  let scriptCommand = 'tsc --noEmit';
  
  // Check for project-specific configurations
  try {
    const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
    if (await fs.pathExists(tsConfigPath)) {
      const tsConfig = await fs.readJson(tsConfigPath);
      
      // Adjust for various tsconfig settings
      if (tsConfig.compilerOptions) {
        // For older TypeScript versions or specific configurations
        if (tsConfig.compilerOptions.noEmit === false) {
          scriptCommand = 'tsc --noEmit';
        }
        
        // For Next.js projects
        if (await isPackageInstalled(projectRoot, 'next')) {
          scriptCommand = 'tsc --project tsconfig.json';
        }
      }
    }
  } catch (err) {
    // Use default if we can't read tsconfig
  }
  
  return {
    scriptName: 'types:check',
    scriptCommand
  };
}

/**
 * Get recommended linting npm script
 * @param {string} projectRoot Path to the project root
 * @param {string} linter Detected linter
 * @returns {Promise<{scriptName: string, scriptCommand: string}>} Recommended script
 */
export async function getRecommendedLintScript(projectRoot, linter) {
  if (linter === 'eslint') {
    // For TypeScript projects
    if (await isTypeScriptProject(projectRoot)) {
      return {
        scriptName: 'lint',
        scriptCommand: 'eslint . --ext .js,.jsx,.ts,.tsx'
      };
    }
    
    // For JavaScript projects
    return {
      scriptName: 'lint',
      scriptCommand: 'eslint .'
    };
  }
  
  if (linter === 'tslint') {
    return {
      scriptName: 'lint',
      scriptCommand: 'tslint -p tsconfig.json'
    };
  }
  
  if (linter === 'standard') {
    return {
      scriptName: 'lint',
      scriptCommand: 'standard'
    };
  }
  
  // Default fallback (eslint)
  return {
    scriptName: 'lint',
    scriptCommand: 'eslint .'
  };
}

/**
 * Get recommended formatting npm script
 * @param {string} projectRoot Path to the project root
 * @param {string} formatter Detected formatter
 * @returns {Promise<{scriptName: string, scriptCommand: string}>} Recommended script
 */
export async function getRecommendedFormatScript(projectRoot, formatter) {
  if (formatter === 'prettier') {
    return {
      scriptName: 'format',
      scriptCommand: 'prettier --write "**/*.{js,jsx,ts,tsx,json,md}"'
    };
  }
  
  if (formatter === 'eslint+prettier') {
    return {
      scriptName: 'format',
      scriptCommand: 'eslint --fix .'
    };
  }
  
  // Default fallback (prettier)
  return {
    scriptName: 'format',
    scriptCommand: 'prettier --write "**/*.{js,jsx,ts,tsx,json,md}"'
  };
}

export default {
  isPackageInstalled,
  hasNpmScript,
  isTypeScriptProject,
  hasTypeScriptTypeChecking,
  detectLinter,
  detectFormatter,
  hasCommitlint,
  addNpmScript,
  getRecommendedTypeCheckScript,
  getRecommendedLintScript,
  getRecommendedFormatScript
};