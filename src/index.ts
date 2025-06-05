#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { Feedback } from './utils/feedback.js';
import { TemplateScanner } from './utils/template-scanner.js';
import {
  updatePackageScripts,
  getExistingScripts,
} from './utils/package-scripts.js';

// Initialize the command line parser
const program = new Command();

// Set up program metadata
program
  .name('ai-coding-assistants-setup')
  .description(
    'Setup tool for integrating AI coding assistants into development workflows'
  )
  .version('2.0.0');

// Default command handler
program
  .option('-n, --non-interactive', 'Run in non-interactive mode')
  .option('-f, --force', 'Force overwrite of existing files')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-d, --dry-run', 'Preview what would be done without making changes')
  .action(async options => {
    const interactive = !options.nonInteractive;
    const verbose = options.verbose;
    const dryRun = options.dryRun;
    const force = options.force;

    try {
      await setupAiCodingAssistants(interactive, verbose, dryRun, force);
    } catch (error) {
      Feedback.error(
        `Setup failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

/**
 * Main setup function - simplified to only copy files and update package.json
 */
async function setupAiCodingAssistants(
  interactive: boolean = true,
  verbose: boolean = false,
  dryRun: boolean = false,
  force: boolean = false
): Promise<void> {
  // Welcome message
  Feedback.section('AI Coding Assistants Setup');

  if (dryRun) {
    Feedback.warning('DRY RUN MODE - No files will be modified');
  }

  Feedback.info(
    'Setting up AI coding assistants configuration in your project...'
  );

  // Get the current working directory
  const cwd = process.cwd();
  if (verbose) {
    Feedback.info(`Working directory: ${cwd}`);
  }

  // Get the package directory (where our templates are)
  // This file will be at dist/index.js, so we need to go up one level from dist
  const distDir = path.dirname(new URL(import.meta.url).pathname);
  const packageDir = path.dirname(distDir);
  const templateDir = path.join(packageDir, 'src', 'templates');

  if (verbose) {
    Feedback.info(`Template directory: ${templateDir}`);
  }

  // Check if templates directory exists
  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }

  // Get files to copy
  Feedback.info('Scanning for template files...');
  const filesToCopy = await getFilesToCopy(templateDir, cwd, verbose);

  if (filesToCopy.size === 0) {
    Feedback.warning('No files to copy. Setup complete.');
    return;
  }

  // In dry-run mode, just show what would be done
  if (dryRun) {
    Feedback.section('Files that would be copied:');
    let fileCount = 0;
    for (const [_source, target] of filesToCopy) {
      const relativePath = path.relative(cwd, target);
      const exists = await fs.pathExists(target);
      if (exists) {
        Feedback.info(`   [UPDATE] ${relativePath}`);
      } else {
        Feedback.info(`   [CREATE] ${relativePath}`);
      }
      fileCount++;
    }
    Feedback.info(`\nTotal files: ${fileCount}`);

    // Show what scripts would be added
    Feedback.info('\nPackage.json scripts that would be added:');
    const existingScripts = await getExistingScripts(cwd);
    const requiredScripts = [
      'lint',
      'typecheck',
      'format:check',
      'build',
      'test',
      'test:unit',
      'test:integration',
      'test:e2e',
    ];
    const missingScripts = requiredScripts.filter(
      script => !existingScripts || !existingScripts[script]
    );
    if (missingScripts.length > 0) {
      Feedback.info(`   ${missingScripts.join(', ')}`);
    } else {
      Feedback.info('   All required scripts already exist');
    }

    Feedback.success('\nDry run completed - no files were modified');
    return;
  }

  // Copy files
  Feedback.section('Copying configuration files...');

  let copiedCount = 0;
  let skippedCount = 0;

  for (const [source, target] of filesToCopy) {
    const relativePath = path.relative(cwd, target);
    const exists = await fs.pathExists(target);

    if (exists && !force) {
      if (interactive) {
        const { default: inquirer } = await import('inquirer');
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `File ${relativePath} already exists. Overwrite?`,
            default: false,
          },
        ]);

        if (!overwrite) {
          if (verbose) {
            Feedback.info(`   [SKIP] ${relativePath}`);
          }
          skippedCount++;
          continue;
        }
      } else {
        // In non-interactive mode, skip existing files
        if (verbose) {
          Feedback.info(`   [SKIP] ${relativePath} (already exists)`);
        }
        skippedCount++;
        continue;
      }
    }

    // Copy the file
    try {
      await fs.ensureDir(path.dirname(target));
      await fs.copyFile(source, target);
      Feedback.success(`   [COPIED] ${relativePath}`);
      copiedCount++;
    } catch (error) {
      Feedback.error(`   [ERROR] Failed to copy ${relativePath}: ${error}`);
    }
  }

  // Update package.json scripts
  Feedback.section('Updating package.json scripts...');
  await updatePackageScripts(cwd);

  // Final summary
  Feedback.section('Setup Summary');
  Feedback.info(`Files copied: ${copiedCount}`);
  if (skippedCount > 0) {
    Feedback.info(`Files skipped: ${skippedCount}`);
  }

  Feedback.success('\nSetup completed successfully!');

  // Show next steps
  Feedback.section('Next Steps');
  Feedback.info('1. Review the copied configuration files');
  Feedback.info('2. Install any needed dependencies:');
  Feedback.info(
    '   npm install --save-dev eslint prettier husky @commitlint/cli @commitlint/config-conventional'
  );
  Feedback.info(
    '3. Update the placeholder npm scripts in package.json with your actual commands'
  );
  Feedback.info(
    '4. Configure your API keys in .env and .claude/settings.local.json'
  );
}

/**
 * Get a map of files to copy from template directory to target directory
 */
async function getFilesToCopy(
  templateDir: string,
  targetDir: string,
  verbose: boolean = false
): Promise<Map<string, string>> {
  try {
    const scanner = new TemplateScanner(templateDir, targetDir, verbose);
    const templates = await scanner.scan();

    if (templates.length === 0) {
      return new Map<string, string>();
    }

    // Get the map of source to target paths
    const filesToCopy = scanner.getTemplateMap();

    if (verbose) {
      Feedback.info(`Found ${filesToCopy.size} files to copy`);
    }

    return filesToCopy;
  } catch (error) {
    Feedback.error(
      `Error scanning template files: ${error instanceof Error ? error.message : String(error)}`
    );
    return new Map<string, string>();
  }
}

// Parse command line arguments and run the program
program.parse();
