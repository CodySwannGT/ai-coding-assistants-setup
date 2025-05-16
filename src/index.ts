#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import { Command } from 'commander';
import { FileMerger, MergeOption } from './utils/file-merger';
import { ConfigMerger, ConflictStrategy } from './utils/config-merger';
import { Feedback } from './utils/feedback';
import { HuskySetup } from './utils/husky-setup';
import { TemplateScanner, TemplateCategory } from './utils/template-scanner';
import ESLintSetup from './utils/linting-setup';
import PrettierSetup from './utils/formatting-setup';
import CommitLintSetup from './utils/commit-lint-setup';
import TypeScriptSetup from './utils/typescript-setup';

// Initialize the command line parser
const program = new Command();

// Set up program metadata
program
  .name('ai-coding-assistants-setup')
  .description('Setup tool for integrating AI coding assistants into development workflows')
  .version('2.0.0');

// Add husky setup command
program
  .command('setup-husky')
  .description('Set up husky Git hooks for code quality and AI integration')
  .action(async () => {
    try {
      Feedback.section('Husky Git Hooks Setup');
      
      const huskySetup = new HuskySetup();
      const isInstalled = await huskySetup.setupAll();
      
      if (isInstalled) {
        Feedback.success('Husky Git hooks setup completed successfully!');
      } else {
        Feedback.error('Failed to set up Husky Git hooks.');
        process.exit(1);
      }
    } catch (error) {
      Feedback.error(`Husky setup failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Add ESLint setup command
program
  .command('setup-eslint')
  .description('Set up ESLint for code quality and linting')
  .action(async () => {
    try {
      Feedback.section('ESLint Setup');
      
      const eslintSetup = new ESLintSetup();
      const isSetup = await eslintSetup.setupESLint();
      
      if (isSetup) {
        Feedback.success('ESLint setup completed successfully!');
      } else {
        Feedback.error('Failed to set up ESLint.');
        process.exit(1);
      }
    } catch (error) {
      Feedback.error(`ESLint setup failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Add Prettier setup command
program
  .command('setup-prettier')
  .description('Set up Prettier for code formatting')
  .action(async () => {
    try {
      Feedback.section('Prettier Setup');
      
      const prettierSetup = new PrettierSetup();
      const isSetup = await prettierSetup.setupPrettier();
      
      if (isSetup) {
        Feedback.success('Prettier setup completed successfully!');
      } else {
        Feedback.error('Failed to set up Prettier.');
        process.exit(1);
      }
    } catch (error) {
      Feedback.error(`Prettier setup failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
  
// Add code quality setup command (ESLint + Prettier)
program
  .command('setup-code-quality')
  .description('Set up both ESLint and Prettier for code quality and formatting')
  .action(async () => {
    try {
      Feedback.section('Code Quality Setup');
      
      // Setup ESLint
      Feedback.info('Setting up ESLint...');
      const eslintSetup = new ESLintSetup();
      const eslintResult = await eslintSetup.setupESLint();
      
      if (!eslintResult) {
        Feedback.error('Failed to set up ESLint.');
        process.exit(1);
      }
      
      // Setup Prettier
      Feedback.info('Setting up Prettier...');
      const prettierSetup = new PrettierSetup();
      const prettierResult = await prettierSetup.setupPrettier();
      
      if (!prettierResult) {
        Feedback.error('Failed to set up Prettier.');
        process.exit(1);
      }
      
      Feedback.success('Code quality tools (ESLint + Prettier) setup completed successfully!');
    } catch (error) {
      Feedback.error(`Code quality setup failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Add commitlint setup command
program
  .command('setup-commitlint')
  .description('Set up commitlint for commit message validation')
  .option('--no-husky', 'Skip husky integration')
  .option('--commitizen', 'Install commitizen for interactive commits', false)
  .action(async (options) => {
    try {
      // Create the commitlint setup instance
      const commitlintSetup = new CommitLintSetup();
      
      // Set up commitlint
      const isSetup = await commitlintSetup.setupCommitLint({
        setupHusky: options.husky,
        installCommitizen: options.commitizen
      });
      
      if (isSetup) {
        Feedback.success('CommitLint setup completed successfully!');
      } else {
        Feedback.error('Failed to set up CommitLint.');
        process.exit(1);
      }
    } catch (error) {
      Feedback.error(`CommitLint setup failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Add code review command
program
  .command('code-review')
  .description('Run Claude AI-powered code reviews on project files')
  .option('-i, --include <patterns...>', 'File patterns to include (glob syntax)')
  .option('-e, --exclude <patterns...>', 'File patterns to exclude (glob syntax)')
  .option('-f, --files <files...>', 'Specific files to review')
  .option('--focus <areas...>', 'Focus areas for review (security, functionality, performance, style)')
  .option('-m, --model <model>', 'Claude model to use', 'claude-3-haiku-20240307')
  .option('-c, --config <path>', 'Path to config file')
  .option('-o, --output <format>', 'Output format (markdown, json)', 'markdown')
  .option('--no-save', 'Do not save review results to file')
  .action(async (options) => {
    try {
      Feedback.section('Claude Code Review');
      
      // Import and run code review command
      const { CodeReview } = await import('./integrations/code-review');
      
      // Run the code review
      const result = await CodeReview.runCodeReview({
        includePatterns: options.include,
        excludePatterns: options.exclude,
        files: options.files,
        focusAreas: options.focus, 
        model: options.model,
        configPath: options.config,
        outputFormat: options.output,
        saveResults: options.save
      });
      
      // Output the results
      if (options.output === 'json') {
        // Output as JSON
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Output as formatted markdown
        const markdown = CodeReview.formatReviewAsMarkdown(result);
        console.log(markdown);
      }
      
      // Print summary
      const issueCount = result.files.reduce((count, file) => count + file.issues.length, 0);
      Feedback.info(`Review completed. Found ${issueCount} issues`);
      
    } catch (error) {
      Feedback.error(`Code review failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Add TypeScript setup command
program
  .command('setup-typescript')
  .description('Set up TypeScript in the project')
  .option('--no-strict', 'Disable strict type checking')
  .option('--react', 'Set up React/JSX support')
  .option('--node', 'Set up Node.js support')
  .option('--no-scripts', 'Skip adding scripts to package.json')
  .option('--no-eslint', 'Skip ESLint integration')
  .option('--no-samples', 'Skip creating sample TypeScript files')
  .action(async (options) => {
    try {
      // Create the TypeScript setup instance
      const typescriptSetup = new TypeScriptSetup();
      
      // Set up TypeScript
      const isSetup = await typescriptSetup.setupTypeScript({
        strict: options.strict,
        react: options.react,
        node: options.node,
        updateScripts: options.scripts,
        eslintIntegration: options.eslint
      });
      
      if (isSetup) {
        Feedback.success('TypeScript setup completed successfully!');
      } else {
        Feedback.error('Failed to set up TypeScript.');
        process.exit(1);
      }
    } catch (error) {
      Feedback.error(`TypeScript setup failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Add merge-configs command
program
  .command('merge-configs')
  .description('Merge configuration files from templates to target project')
  .option('-s, --source-dir <path>', 'Source directory for template files', './src/templates')
  .option('-t, --target-dir <path>', 'Target directory for merging files', process.cwd())
  .option('-n, --non-interactive', 'Run in non-interactive mode', false)
  .option('-f, --force', 'Force overwrite of existing files', false)
  .option('-v, --verbose', 'Enable verbose output', false)
  .action(async (options) => {
    try {
      Feedback.section('Configuration Merging');
      
      // Set up options
      const sourceDir = path.resolve(options.sourceDir);
      const targetDir = path.resolve(options.targetDir);
      const interactive = !options.nonInteractive;
      const defaultMergeOption = options.force ? MergeOption.OVERWRITE : MergeOption.SKIP;
      const verbose = options.verbose;
      
      // Verify directories
      if (!fs.existsSync(sourceDir)) {
        Feedback.error(`Source directory does not exist: ${sourceDir}`);
        process.exit(1);
      }
      
      if (!fs.existsSync(targetDir)) {
        Feedback.error(`Target directory does not exist: ${targetDir}`);
        process.exit(1);
      }
      
      // Get files to merge
      Feedback.info(`Scanning templates from ${sourceDir} to ${targetDir}...`);
      const filesToMerge = await getFilesToMerge(sourceDir, targetDir, verbose);
      
      if (filesToMerge.size === 0) {
        Feedback.warning('No files to merge.');
        return;
      }
      
      // Merge files
      const configOptions = {
        interactive,
        defaultStrategy: interactive ? ConflictStrategy.MERGE : ConflictStrategy.MERGE,
        defaultMergeOption,
        verbose
      };
      
      Feedback.info(`Merging ${filesToMerge.size} files...`);
      const mergedCount = await ConfigMerger.mergeConfigFiles(filesToMerge, configOptions);
      
      // Show summary
      if (mergedCount === filesToMerge.size) {
        Feedback.success(`Merged all ${mergedCount} files successfully!`);
      } else {
        Feedback.warning(`Merged ${mergedCount} of ${filesToMerge.size} files. Some files were skipped.`);
      }
    } catch (error) {
      Feedback.error(`Error merging configurations: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Default command handler
program
  .option('-n, --non-interactive', 'Run in non-interactive mode')
  .option('-f, --force', 'Force overwrite of existing files')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (options) => {
    const interactive = !options.nonInteractive;
    const defaultOption = options.force ? MergeOption.OVERWRITE : MergeOption.SKIP;
    const verbose = options.verbose;

    try {
      await setupAiCodingAssistants(interactive, defaultOption, verbose);
    } catch (error) {
      Feedback.error(`Setup failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

/**
 * Main setup function
 * 
 * @param interactive Whether to run in interactive mode
 * @param defaultOption Default file merging option
 * @param verbose Whether to enable verbose output
 */
async function setupAiCodingAssistants(
  interactive: boolean = true,
  defaultOption: MergeOption = MergeOption.SKIP,
  verbose: boolean = false
): Promise<void> {
  // Welcome message
  Feedback.section('AI Coding Assistants Setup');
  Feedback.info('Setting up AI coding assistants in your project...');

  // Get the current working directory
  const cwd = process.cwd();
  if (verbose) {
    Feedback.info(`Working directory: ${cwd}`);
  }

  // Get the package directory (where our templates are)
  const packageDir = path.dirname(path.dirname(__filename));
  const templateDir = path.join(packageDir, 'src', 'templates');
  
  if (verbose) {
    Feedback.info(`Template directory: ${templateDir}`);
  }

  // Check if templates directory exists
  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }

  // Detect project features
  const { ProjectDetector } = await import('./utils/project-detector');
  const projectFeatures = await ProjectDetector.detectFeatures(cwd);
  
  // Show detected features
  Feedback.section('Project Analysis');
  Feedback.info('Detected project features:');
  console.log(ProjectDetector.getFeaturesSummary(projectFeatures));
  
  // Setup husky if not already installed
  if (!projectFeatures.hasHusky) {
    Feedback.info('Husky Git hooks not detected. Setting up...');
    const huskySetup = new HuskySetup(cwd);
    await huskySetup.setupAll();
  } else {
    Feedback.info('Husky Git hooks already installed. Skipping setup.');
  }
  
  // Setup ESLint if not already installed
  if (!projectFeatures.hasEslint) {
    Feedback.info('ESLint not detected. Setting up...');
    const eslintSetup = new ESLintSetup(cwd);
    await eslintSetup.setupESLint();
  } else {
    Feedback.info('ESLint already installed. Skipping setup.');
  }
  
  // Setup Prettier if not already installed
  if (!projectFeatures.hasPrettier) {
    Feedback.info('Prettier not detected. Setting up...');
    const prettierSetup = new PrettierSetup(cwd);
    await prettierSetup.setupPrettier();
  } else {
    Feedback.info('Prettier already installed. Skipping setup.');
  }
  
  // Setup CommitLint if not already installed
  if (!projectFeatures.hasCommitlint) {
    Feedback.info('CommitLint not detected. Setting up...');
    const commitlintSetup = new CommitLintSetup(cwd);
    await commitlintSetup.setupCommitLint({
      setupHusky: projectFeatures.hasHusky 
    });
  } else {
    Feedback.info('CommitLint already installed. Skipping setup.');
  }
  
  // Setup TypeScript if not already installed
  if (!projectFeatures.hasTypeScript) {
    Feedback.info('TypeScript not detected. Setting up...');
    const typescriptSetup = new TypeScriptSetup(cwd);
    await typescriptSetup.setupTypeScript({
      strict: true,
      updateScripts: true,
      eslintIntegration: projectFeatures.hasEslint
    });
  } else {
    Feedback.info('TypeScript already installed. Skipping setup.');
  }

  // Set up file merging
  const filesToMerge = await getFilesToMerge(templateDir, cwd, verbose);
  
  if (filesToMerge.size === 0) {
    Feedback.warning('No files to merge. Setup complete.');
    return;
  }

  // Merge the files - use ConfigMerger for better config file handling
  Feedback.info('Using intelligent file merging for configuration files...');
  
  // Default strategies
  const configOptions = {
    interactive,
    defaultStrategy: interactive ? ConflictStrategy.MERGE : ConflictStrategy.MERGE,
    defaultMergeOption: defaultOption,
    verbose
  };
  
  // Use the advanced ConfigMerger which handles both config and regular files
  const mergedCount = await ConfigMerger.mergeConfigFiles(filesToMerge, configOptions);
  
  // Final message
  if (mergedCount === filesToMerge.size) {
    Feedback.success(`Setup completed successfully! ${mergedCount} files merged.`);
  } else {
    Feedback.warning(`Setup completed with some skipped files. ${mergedCount} of ${filesToMerge.size} files merged.`);
  }
}

/**
 * Get a map of files to merge from template directory to target directory
 * 
 * @param templateDir Template directory
 * @param targetDir Target directory
 * @param verbose Whether to enable verbose output
 * @returns Map of source to target file paths
 */
async function getFilesToMerge(templateDir: string, targetDir: string, verbose: boolean = false): Promise<Map<string, string>> {
  Feedback.info('Scanning for template files...');
  
  try {
    // Create a template scanner
    const scanner = new TemplateScanner(templateDir, targetDir, verbose);
    
    // Scan for templates
    const templates = await scanner.scan();
    
    if (templates.length === 0) {
      Feedback.warning('No template files found in template directory.');
      return new Map<string, string>();
    }
    
    // Display summary of found templates by category
    if (verbose) {
      const categories = Object.values(TemplateCategory);
      for (const category of categories) {
        const categoryTemplates = scanner.getTemplatesByCategory(category as TemplateCategory);
        if (categoryTemplates.length > 0) {
          Feedback.info(`Found ${categoryTemplates.length} ${category} files`);
        }
      }
    }
    
    // Get the map of source to target paths
    const filesToMerge = scanner.getTemplateMap();
    
    Feedback.info(`Prepared ${filesToMerge.size} files for merging.`);
    return filesToMerge;
  } catch (error) {
    Feedback.error(`Error preparing files for merging: ${error instanceof Error ? error.message : String(error)}`);
    return new Map<string, string>();
  }
}

// Parse command line arguments and run the program
program.parse();