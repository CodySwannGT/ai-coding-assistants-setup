#!/usr/bin/env node

/**
 * Claude Code Review Command - Simple CLI Implementation
 *
 * A streamlined command that uses the Claude CLI directly to review code.
 */

import { execSync } from 'child_process';
import { program } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { Feedback } from '../utils/feedback';

/**
 * Get a temporary file to store prompt
 */
function getTempFile(name: string): string {
  const tempDir = path.join(process.cwd(), '.claude', 'temp');
  fs.ensureDirSync(tempDir);
  return path.join(tempDir, `${name}-${Date.now()}.txt`);
}

/**
 * Run code review command
 */
/**
 * List of allowed Claude model names to prevent command injection
 */
const ALLOWED_CLAUDE_MODELS = [
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-2.1',
  'claude-2.0',
  'claude-instant-1.2',
];

/**
 * Validates a model name against the allowed list to prevent command injection
 * @param modelName The model name to validate
 * @returns The validated model name or the default model if invalid
 */
function validateModelName(modelName: string): string {
  const defaultModel = 'claude-3-opus-20240229';
  
  if (!modelName || typeof modelName !== 'string') {
    Feedback.warning(`Invalid model name provided. Using default model: ${defaultModel}`);
    return defaultModel;
  }
  
  // Check if the model name is in the allowed list
  if (!ALLOWED_CLAUDE_MODELS.includes(modelName)) {
    Feedback.warning(`Model "${modelName}" not in allowed list. Using default model: ${defaultModel}`);
    return defaultModel;
  }
  
  return modelName;
}

export async function runCodeReview(
  options: {
    files?: string[];
    staged?: boolean;
    pattern?: string;
    model?: string;
    output?: string;
    focusAreas?: string[];
  } = {}
): Promise<string> {
  const {
    files = [],
    staged = false,
    pattern,
    model: requestedModel = 'claude-3-opus-20240229',
    output,
    focusAreas = ['security', 'functionality', 'performance', 'style'],
  } = options;
  
  // Validate the model name to prevent command injection
  const model = validateModelName(requestedModel);

  try {
    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), '.claude', 'temp');
    await fs.ensureDir(tempDir);

    // Create the output directory if saving results
    if (output) {
      const outputDir = path.dirname(output);
      await fs.ensureDir(outputDir);
    }

    // Step 1: Get file content to review
    let content: string;

    if (staged) {
      // Get staged changes
      Feedback.info('Getting staged changes...');
      content = execSync('git diff --staged', { encoding: 'utf8' });
    } else if (files.length > 0) {
      // Read specific files
      Feedback.info('Reading specified files...');
      content = await readFiles(files);
    } else if (pattern) {
      // Find files matching pattern
      Feedback.info('Finding files matching pattern...');
      const matchedFiles = await findFiles(pattern);
      if (matchedFiles.length === 0) {
        return 'No files found matching pattern.';
      }
      content = await readFiles(matchedFiles);
    } else {
      return 'No files specified. Please provide files, use --staged, or specify a pattern.';
    }

    if (!content || content.trim() === '') {
      return 'No content to review.';
    }

    // Step 2: Create prompt for code review
    const promptFile = getTempFile('code-review-prompt');
    const contentFile = getTempFile('code-review-content');

    // Create a prompt that focuses on the specified areas
    const focusAreaText = focusAreas
      .map(area => {
        switch (area) {
          case 'security':
            return '- Identify security vulnerabilities, potential injection points, or unsafe practices';
          case 'functionality':
            return '- Check for logical errors, edge cases, and functionality issues';
          case 'performance':
            return '- Identify performance bottlenecks and inefficient code patterns';
          case 'style':
            return '- Check for code style issues, inconsistencies, and maintainability problems';
          default:
            return `- ${area}`;
        }
      })
      .join('\n');

    const prompt = `You are an expert code reviewer for a software development team. 
Please analyze the provided code for quality, security, and correctness issues:

Focus on these aspects:
${focusAreaText}

For each issue identified, provide:
1. The location in the code
2. The severity (critical, high, medium, low)
3. A clear explanation of the issue
4. A suggested fix

Please organize your response with:
- A brief summary of overall code quality
- Categorized issues by severity
- A section for each file with specific issues
- Recommendations for improvement

You're helping a developer who wants clear, actionable feedback to improve this code.`;

    // Validate and normalize file paths to prevent path traversal attacks
    const validateAndNormalizePath = (filePath: string, expectedDir: string): string => {
      // Normalize the path to resolve '..' and '.' segments
      const normalizedPath = path.normalize(filePath);
      
      // Convert to absolute path if not already
      const absolutePath = path.isAbsolute(normalizedPath)
        ? normalizedPath
        : path.resolve(process.cwd(), normalizedPath);
      
      // Ensure the path is within the expected directory
      if (!absolutePath.startsWith(expectedDir)) {
        throw new Error(`Security error: Path "${filePath}" resolves outside of the expected directory`);
      }
      
      // Check for suspicious path components that might indicate an attack attempt
      const pathParts = absolutePath.split(path.sep);
      const suspiciousPatterns = ['..', '.', '~', '%', '$'];
      
      for (const part of pathParts) {
        // Check for suspicious patterns in path components
        if (suspiciousPatterns.some(pattern => part.includes(pattern))) {
          throw new Error(`Security error: Path "${filePath}" contains suspicious components`);
        }
      }
      
      return absolutePath;
    };
    
    // Apply validation to both files
    const expectedTempDir = path.join(process.cwd(), '.claude', 'temp');
    const normalizedPromptFile = validateAndNormalizePath(promptFile, expectedTempDir);
    const normalizedContentFile = validateAndNormalizePath(contentFile, expectedTempDir);

    // Write prompt and content to temp files
    await fs.writeFile(normalizedPromptFile, prompt);
    await fs.writeFile(normalizedContentFile, content);

    // Step 3: Call Claude CLI
    Feedback.info('Calling Claude CLI for code review...');

    // Use normalized paths in the command to prevent command injection
    const claudeCommand = `cat "${normalizedContentFile}" | claude -p "$(cat ${normalizedPromptFile})" --model ${model}`;

    const startTime = Date.now();
    const response = execSync(claudeCommand, { encoding: 'utf8' });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    Feedback.success(`Claude completed code review in ${duration}s`);

    // Step 4: Save result if output path is provided
    if (output) {
      await fs.writeFile(output, response);
      Feedback.success(`Review saved to ${output}`);
    }

    // Clean up temp files
    await fs.remove(promptFile);
    await fs.remove(contentFile);

    return response;
  } catch (error) {
    Feedback.error(
      `Error running code review: ${error instanceof Error ? error.message : String(error)}`
    );
    return `Error running code review: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Read content from multiple files
 */
async function readFiles(files: string[]): Promise<string> {
  const fileContents: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const content = await fs.readFile(file, 'utf8');
      fileContents.push(`### File: ${file}\n\n\`\`\`\n${content}\n\`\`\`\n\n`);
    } catch (error) {
      Feedback.warning(
        `Failed to read file ${file}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return fileContents.join('\n');
}

/**
 * Find files matching a pattern
 */
async function findFiles(pattern: string): Promise<string[]> {
  try {
    // Use glob to find files
    const { glob } = await import('glob');
    const files = await glob(pattern, {
      ignore: ['node_modules/**', 'dist/**', 'build/**'],
    });
    return files;
  } catch (error) {
    Feedback.error(
      `Error finding files: ${error instanceof Error ? error.message : String(error)}`
    );
    return [];
  }
}

// Register code review as a standalone command
program
  .name('claude code-review')
  .description('Run AI-powered code reviews using Claude CLI')
  .option('-f, --files <files...>', 'Specific files to review')
  .option('-s, --staged', 'Review staged changes', false)
  .option(
    '-p, --pattern <pattern>',
    'File pattern to match (e.g., "src/**/*.ts")'
  )
  .option(
    '-m, --model <model>',
    'Claude model to use',
    'claude-3-opus-20240229'
  )
  .option('-o, --output <path>', 'Save review to file')
  .option(
    '--focus <areas...>',
    'Focus areas (security, functionality, performance, style)',
    ['security', 'functionality', 'performance', 'style']
  )
  .action(async options => {
    try {
      Feedback.section('Claude Code Review');

      // Run the code review
      const review = await runCodeReview({
        files: options.files,
        staged: options.staged,
        pattern: options.pattern,
        model: options.model,
        output: options.output,
        focusAreas: options.focus,
      });

      // Display the result
      if (!options.output) {
        console.log(review);
      }
    } catch (error) {
      Feedback.error(
        `Error running code review: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

export default { runCodeReview };
