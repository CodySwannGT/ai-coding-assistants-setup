#!/usr/bin/env node

/**
 * AI Coding Assistants Setup CLI
 * 
 * This is the main entry point for the npx command.
 * It provides an interactive setup tool for configuring AI coding assistants
 * in any project by copying templates and updating package.json scripts.
 */

import chalk from 'chalk';
import prompts from 'prompts';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(PACKAGE_ROOT, 'src', 'templates');
const MIN_NODE_VERSION = '18.0.0';

/**
 * Display welcome message
 */
function displayWelcome() {
  console.log('\n' + chalk.bold.cyan('🚀 AI Coding Assistants Setup'));
  console.log(chalk.gray('Enterprise-grade development workflow automation powered by AI\n'));
}

/**
 * Check Node.js version
 */
function checkNodeVersion() {
  const currentVersion = process.version;
  const requiredVersion = MIN_NODE_VERSION;
  
  const current = currentVersion.replace('v', '').split('.').map(Number);
  const required = requiredVersion.split('.').map(Number);
  
  for (let i = 0; i < required.length; i++) {
    if (current[i] < required[i]) {
      console.error(chalk.red(`❌ Node.js version ${requiredVersion} or higher is required.`));
      console.error(chalk.yellow(`   Current version: ${currentVersion}`));
      process.exit(1);
    }
    if (current[i] > required[i]) break;
  }
}

/**
 * Display help message
 */
function displayHelp() {
  console.log(`
${chalk.bold('Usage:')} npx ai-coding-assistants-setup [options]

${chalk.bold('Options:')}
  -h, --help       Display this help message
  -v, --version    Display version information
  -y, --yes        Accept all defaults (non-interactive mode)
  --verbose        Enable verbose output

${chalk.bold('Description:')}
  This tool sets up AI coding assistant configurations in your project by:
  - Copying workflow templates (.github/workflows/)
  - Setting up Git hooks (.husky/)
  - Configuring Claude and Roo Code (.claude/, .roo/)
  - Adding MCP server configuration (.mcp.json)
  - Setting up code quality tools (ESLint, Prettier, CommitLint)
  - Updating package.json with required scripts

${chalk.bold('Learn more:')}
  Documentation: https://github.com/CodySwannGT/ai-coding-assistants-setup
  Issues: https://github.com/CodySwannGT/ai-coding-assistants-setup/issues
`);
}

/**
 * Display version information
 */
async function displayVersion() {
  try {
    const packageJson = await fs.readJson(path.join(PACKAGE_ROOT, 'package.json'));
    console.log(`v${packageJson.version}`);
  } catch (error) {
    console.log('v2.0.0');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    help: false,
    version: false,
    yes: false,
    verbose: false
  };

  for (const arg of args) {
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '-v':
      case '--version':
        options.version = true;
        break;
      case '-y':
      case '--yes':
        options.yes = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
    }
  }

  return options;
}

/**
 * Walk a directory recursively and return all file paths
 */
async function walkDirectory(dir, baseDir = dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  // Files to skip
  const skipFiles = ['.DS_Store', 'Thumbs.db', '.gitkeep'];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and .git directories
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      
      const subFiles = await walkDirectory(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      // Skip system files
      if (skipFiles.includes(entry.name)) {
        continue;
      }
      
      // Get relative path from base directory
      const relativePath = path.relative(baseDir, fullPath);
      files.push(relativePath);
    }
  }
  
  return files;
}

/**
 * Check if a file already exists and handle conflict
 */
async function handleFileConflict(targetPath, options) {
  if (!await fs.pathExists(targetPath)) {
    return 'copy'; // File doesn't exist, safe to copy
  }
  
  if (options.yes) {
    return 'skip'; // In non-interactive mode, skip existing files
  }
  
  // Interactive mode - ask user
  const relativePath = path.relative(process.cwd(), targetPath);
  const response = await prompts({
    type: 'select',
    name: 'action',
    message: `File ${chalk.yellow(relativePath)} already exists. What would you like to do?`,
    choices: [
      { title: 'Skip', value: 'skip', description: 'Keep existing file' },
      { title: 'Overwrite', value: 'overwrite', description: 'Replace with template' },
      { title: 'View diff', value: 'diff', description: 'Show differences (TODO)' }
    ],
    initial: 0
  });
  
  if (response.action === 'diff') {
    // TODO: Implement diff viewing
    console.log(chalk.gray('Diff viewing not yet implemented. Defaulting to skip.'));
    return 'skip';
  }
  
  return response.action;
}

/**
 * Copy templates from source to target directory
 */
async function copyTemplates(targetDir, options) {
  const results = {
    copied: [],
    skipped: [],
    overwritten: [],
    errors: []
  };
  
  // Get all template files
  const templateFiles = await walkDirectory(TEMPLATES_DIR);
  const totalFiles = templateFiles.length;
  
  if (options.verbose) {
    console.log(chalk.gray(`Found ${totalFiles} template files to process.\n`));
  }
  
  // Process each file
  for (let i = 0; i < templateFiles.length; i++) {
    const relativePath = templateFiles[i];
    const sourcePath = path.join(TEMPLATES_DIR, relativePath);
    const targetPath = path.join(targetDir, relativePath);
    
    // Show progress
    if (!options.verbose && i % 10 === 0) {
      process.stdout.write(`\r${chalk.cyan('→')} Processing files... ${Math.round((i / totalFiles) * 100)}%`);
    }
    
    try {
      // Ensure target directory exists
      await fs.ensureDir(path.dirname(targetPath));
      
      // Check for conflicts and handle them
      const action = await handleFileConflict(targetPath, options);
      
      switch (action) {
        case 'copy':
          await fs.copy(sourcePath, targetPath);
          results.copied.push(relativePath);
          if (options.verbose) {
            console.log(chalk.green('✓'), chalk.gray(relativePath));
          }
          break;
          
        case 'overwrite':
          await fs.copy(sourcePath, targetPath, { overwrite: true });
          results.overwritten.push(relativePath);
          if (options.verbose) {
            console.log(chalk.yellow('↻'), chalk.gray(relativePath), chalk.yellow('(overwritten)'));
          }
          break;
          
        case 'skip':
          results.skipped.push({
            file: relativePath,
            templateLocation: sourcePath
          });
          if (options.verbose) {
            console.log(chalk.gray('○'), chalk.gray(relativePath), chalk.gray('(skipped)'));
          }
          break;
      }
    } catch (error) {
      results.errors.push({
        file: relativePath,
        error: error.message
      });
      if (options.verbose) {
        console.error(chalk.red('✗'), chalk.gray(relativePath), chalk.red(error.message));
      }
    }
  }
  
  // Clear progress line
  if (!options.verbose) {
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
  }
  
  return results;
}

/**
 * Display the results of the copy operation
 */
function displayCopyResults(results) {
  const total = results.copied.length + results.skipped.length + results.overwritten.length + results.errors.length;
  
  console.log(chalk.bold('\n📊 Setup Summary:\n'));
  
  if (results.copied.length > 0) {
    console.log(chalk.green(`✓ ${results.copied.length} files copied successfully`));
  }
  
  if (results.overwritten.length > 0) {
    console.log(chalk.yellow(`↻ ${results.overwritten.length} files overwritten`));
  }
  
  if (results.skipped.length > 0) {
    console.log(chalk.gray(`○ ${results.skipped.length} files skipped (already exist)`));
    
    // Show skipped files with template locations
    if (results.skipped.length <= 10) {
      console.log(chalk.gray('\n  Skipped files:'));
      results.skipped.forEach(({ file, templateLocation }) => {
        console.log(chalk.gray(`  - ${file}`));
        console.log(chalk.gray(`    Template: ${templateLocation}`));
      });
    } else {
      console.log(chalk.gray(`\n  Run with --verbose to see all skipped files`));
    }
  }
  
  if (results.errors.length > 0) {
    console.log(chalk.red(`✗ ${results.errors.length} errors occurred`));
    results.errors.forEach(({ file, error }) => {
      console.log(chalk.red(`  - ${file}: ${error}`));
    });
  }
  
  console.log(chalk.gray(`\n📁 Total files processed: ${total}`));
  
  if (results.copied.length === 0 && results.overwritten.length === 0) {
    console.log(chalk.yellow('\n⚠️  No new files were added. All templates already exist in your project.'));
  } else {
    console.log(chalk.green('\n✅ Setup completed successfully!'));
  }
}

/**
 * Main setup function
 */
async function main() {
  // Parse command line arguments
  const options = parseArgs();

  // Handle help and version flags
  if (options.help) {
    displayHelp();
    process.exit(0);
  }

  if (options.version) {
    await displayVersion();
    process.exit(0);
  }

  // Check Node.js version
  checkNodeVersion();

  // Display welcome message
  displayWelcome();

  // Check if templates directory exists
  if (!await fs.pathExists(TEMPLATES_DIR)) {
    console.error(chalk.red('❌ Templates directory not found.'));
    console.error(chalk.yellow('   This may be a development environment issue.'));
    process.exit(1);
  }

  // Get the current working directory (where the user is running the command)
  const targetDir = process.cwd();

  // Check if we're in a git repository
  const gitDir = path.join(targetDir, '.git');
  if (!await fs.pathExists(gitDir)) {
    console.warn(chalk.yellow('⚠️  Warning: Not in a git repository.'));
    console.warn(chalk.gray('   Some features like Git hooks may not work properly.\n'));
  }

  // Check if package.json exists
  const packageJsonPath = path.join(targetDir, 'package.json');
  if (!await fs.pathExists(packageJsonPath)) {
    console.error(chalk.red('❌ No package.json found in the current directory.'));
    console.error(chalk.yellow('   Please run this command from the root of your Node.js project.'));
    process.exit(1);
  }

  // If not in yes mode, ask for confirmation
  if (!options.yes) {
    const response = await prompts({
      type: 'confirm',
      name: 'continue',
      message: 'This will set up AI coding assistant configurations in your project. Continue?',
      initial: true
    });

    if (!response.continue) {
      console.log(chalk.gray('\n👋 Setup cancelled.'));
      process.exit(0);
    }
  }

  console.log(chalk.cyan('\n📦 Setting up AI coding assistants...\n'));

  // Copy templates
  try {
    const results = await copyTemplates(targetDir, options);
    
    // Display results
    displayCopyResults(results);
    
    // Display next steps
    console.log(chalk.gray('\n📚 Next steps:'));
    console.log(chalk.gray('   1. Create a .env file with your ANTHROPIC_API_KEY'));
    console.log(chalk.gray('   2. Configure GitHub secrets for CI/CD workflows'));
    console.log(chalk.gray('   3. Review and customize the generated configurations'));
    console.log(chalk.gray('\n📖 Full documentation: https://github.com/CodySwannGT/ai-coding-assistants-setup'));
  } catch (error) {
    throw error;
  }
}

// Run the main function
main().catch(error => {
  console.error(chalk.red('\n❌ Setup failed:'), error.message);
  if (process.argv.includes('--verbose')) {
    console.error(error);
  }
  process.exit(1);
});