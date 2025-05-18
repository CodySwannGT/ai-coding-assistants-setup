#!/usr/bin/env node

/**
 * Claude Code Review Command - Simple CLI Implementation
 *
 * A streamlined command that uses the Claude CLI directly to review code.
 */

import { execSync, spawn } from 'child_process';
import { program } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { Feedback } from '../utils/feedback';

/**
 * Get a temporary file to store prompt
 */
import crypto from 'crypto';
import { tmpdir } from 'os';

/**
 * Creates a secure temporary file with unpredictable name in a safe location
 * @param name Base name for the temporary file
 * @returns Path to the secure temporary file
 */
function getTempFile(name: string): string {
  // Use system temp directory instead of project directory
  const tempDir = path.join(tmpdir(), '.claude', 'temp');
  fs.ensureDirSync(tempDir);

  // Use crypto to generate a random filename to prevent predictability
  const randomSuffix = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now();
  const pid = process.pid;

  // Combine multiple entropy sources for filename
  return path.join(tempDir, `${name}-${timestamp}-${pid}-${randomSuffix}.txt`);
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
    Feedback.warning(
      `Invalid model name provided. Using default model: ${defaultModel}`
    );
    return defaultModel;
  }

  // Check if the model name is in the allowed list
  if (!ALLOWED_CLAUDE_MODELS.includes(modelName)) {
    Feedback.warning(
      `Model "${modelName}" not in allowed list. Using default model: ${defaultModel}`
    );
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
    const validateAndNormalizePath = (
      filePath: string,
      expectedDir: string
    ): string => {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path provided');
      }

      try {
        // Normalize the path to resolve '..' and '.' segments
        const normalizedPath = path.normalize(filePath);

        // Convert to absolute path if not already
        const absolutePath = path.isAbsolute(normalizedPath)
          ? normalizedPath
          : path.resolve(process.cwd(), normalizedPath);

        // Ensure the path is within the expected directory
        if (!absolutePath.startsWith(expectedDir)) {
          throw new Error(
            `Security error: Path "${filePath}" resolves outside of the expected directory`
          );
        }

        // Check for path traversal attempts using realpath to resolve symlinks
        const realPath = fs.realpathSync(absolutePath);
        if (!realPath.startsWith(expectedDir)) {
          throw new Error(
            `Security error: Path "${filePath}" resolves outside of the expected directory through symlinks`
          );
        }

        // Additional check for path traversal attempts
        const relativePath = path.relative(expectedDir, absolutePath);
        if (relativePath.includes('..')) {
          throw new Error(
            `Security error: Path "${filePath}" contains traversal patterns`
          );
        }

        return absolutePath;
      } catch (error) {
        // Catch any file system errors and convert to security errors
        if (error instanceof Error) {
          throw new Error(`Security validation error: ${error.message}`);
        }
        throw new Error('Unknown security validation error occurred');
      }
    };

    // Apply validation to both files
    const expectedTempDir = path.join(tmpdir(), '.claude', 'temp');

    // Use a finally block for cleanup
    let response = '';
    let normalizedPromptFile = '';
    let normalizedContentFile = '';

    try {
      normalizedPromptFile = validateAndNormalizePath(
        promptFile,
        expectedTempDir
      );
      normalizedContentFile = validateAndNormalizePath(
        contentFile,
        expectedTempDir
      );

      // Write prompt and content to temp files
      await fs.writeFile(normalizedPromptFile, prompt);
      await fs.writeFile(normalizedContentFile, content);

      // Step 3: Call Claude CLI
      Feedback.info('Calling Claude CLI for code review...');

      // Execute commands safely to prevent command injection
      const startTime = Date.now();

      // Read the prompt file content
      const promptContent = await fs.readFile(normalizedPromptFile, 'utf8');

      // Create a child process with spawn to safely handle arguments
      const claudeProcess = spawn('claude', [
        '-p',
        promptContent,
        '--model',
        model,
        '--file',
        normalizedContentFile,
      ]);

      // Set up promise to handle process completion
      const processPromise = new Promise<string>((resolve, reject) => {
        let output = '';

        claudeProcess.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        claudeProcess.stderr.on('data', (data: Buffer) => {
          Feedback.warning(`Claude stderr: ${data}`);
        });

        claudeProcess.on('close', (code: number | null) => {
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`Claude process exited with code ${code}`));
          }
        });

        claudeProcess.on('error', (err: Error) => {
          reject(err);
        });
      });

      // Wait for the process to complete
      response = await processPromise;
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      Feedback.success(`Claude completed code review in ${duration}s`);

      // Step 4: Save result if output path is provided
      if (output) {
        // Validate output path
        const outputDir = path.dirname(output);
        const normalizedOutputPath = path.resolve(process.cwd(), output);

        // Ensure the output path is within the current working directory
        if (!normalizedOutputPath.startsWith(process.cwd())) {
          throw new Error(
            'Security error: Output path resolves outside of the current working directory'
          );
        }

        await fs.ensureDir(outputDir);
        await fs.writeFile(normalizedOutputPath, response);
        Feedback.success(`Review saved to ${output}`);
      }
    } finally {
      // Clean up temp files - ensure this happens even if an error occurs
      try {
        if (promptFile) await fs.remove(promptFile);
        if (contentFile) await fs.remove(contentFile);
      } catch (cleanupError) {
        Feedback.warning(
          `Failed to clean up temporary files: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
        );
      }
    }

    return response;
  } catch (error) {
    Feedback.error(
      `Error running code review: ${error instanceof Error ? error.message : String(error)}`
    );
    return `Error running code review: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Read content from multiple files with enhanced security validation
 */
async function readFiles(files: string[]): Promise<string> {
  const fileContents: string[] = [];
  const expectedDir = process.cwd();

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Validate and normalize the file path
        if (!file || typeof file !== 'string') {
          Feedback.warning(`Invalid file path provided: ${file}`);
          continue;
        }

        // Normalize the path to resolve '..' and '.' segments
        const normalizedPath = path.normalize(file);

        // Convert to absolute path if not already
        const absolutePath = path.isAbsolute(normalizedPath)
          ? normalizedPath
          : path.resolve(process.cwd(), normalizedPath);

        // Ensure the path is within the expected directory
        if (!absolutePath.startsWith(expectedDir)) {
          Feedback.warning(
            `Security error: Path "${file}" resolves outside of the expected directory`
          );
          continue;
        }

        // Check for path traversal attempts using realpath to resolve symlinks
        try {
          const realPath = fs.realpathSync(absolutePath);
          if (!realPath.startsWith(expectedDir)) {
            Feedback.warning(
              `Security error: Path "${file}" resolves outside of the expected directory through symlinks`
            );
            continue;
          }
        } catch (realpathError) {
          // If realpath fails, the file might not exist or there might be permission issues
          Feedback.warning(
            `Failed to resolve real path for ${file}: ${realpathError instanceof Error ? realpathError.message : String(realpathError)}`
          );
          continue;
        }

        // Additional check for path traversal attempts
        const relativePath = path.relative(expectedDir, absolutePath);
        if (relativePath.includes('..')) {
          Feedback.warning(
            `Security error: Path "${file}" contains traversal patterns`
          );
          continue;
        }

        // Check if file exists before attempting to read
        if (!(await fs.pathExists(absolutePath))) {
          Feedback.warning(`File does not exist: ${file}`);
          continue;
        }

        const content = await fs.readFile(absolutePath, 'utf8');
        fileContents.push(
          `### File: ${file}\n\n\`\`\`\n${content}\n\`\`\`\n\n`
        );
      } catch (error) {
        Feedback.warning(
          `Failed to read file ${file}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return fileContents.join('\n');
  } catch (error) {
    Feedback.error(
      `Error processing files: ${error instanceof Error ? error.message : String(error)}`
    );
    return '';
  }
}

/**
 * Find files matching a pattern with input validation
 */
async function findFiles(pattern: string): Promise<string[]> {
  try {
    // Validate pattern input
    if (!pattern || typeof pattern !== 'string') {
      Feedback.warning('Invalid pattern provided');
      return [];
    }

    // Check for potentially dangerous patterns
    if (
      pattern.includes('..') ||
      pattern.startsWith('/') ||
      pattern.startsWith('~')
    ) {
      Feedback.warning(
        'Potentially unsafe pattern detected. Patterns should be relative to the current directory.'
      );
      return [];
    }

    // Use glob to find files with additional security options
    const { glob } = await import('glob');
    const files = await glob(pattern, {
      ignore: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
      // Use standard glob options that are supported
      dot: false, // Don't include dot files by default
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
