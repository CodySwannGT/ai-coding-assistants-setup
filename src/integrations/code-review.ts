/**
 * Code Review Integration
 * 
 * CLI command to run Claude AI-powered code reviews directly from the command line.
 */

import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { Feedback } from '../utils/feedback';
import ClaudeVerification, { VerificationResult, ClaudeVerificationOptions, IssueSeverity } from './claude-verification';

/**
 * Configuration for code review
 */
export interface CodeReviewConfig {
  // File patterns to include in review (glob patterns)
  includePatterns: string[];
  
  // File patterns to exclude from review (glob patterns)
  excludePatterns: string[];
  
  // Maximum number of files to review in a single run
  maxFiles: number;
  
  // Maximum size of a single file to review (in bytes)
  maxFileSize: number;
  
  // Focus areas for the review
  focusAreas: string[];
  
  // Claude model to use
  model: string;
  
  // Max tokens for Claude response
  maxTokens: number;
  
  // Temperature for Claude generation
  temperature: number;
  
  // Whether to prefer Claude CLI over API
  preferCli: boolean;
  
  // Whether to save the review results to a file
  saveResults: boolean;
  
  // Output format ('markdown', 'json')
  outputFormat: 'markdown' | 'json';
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: CodeReviewConfig = {
  includePatterns: [
    'src/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}'
  ],
  excludePatterns: [
    'node_modules/**/*',
    'dist/**/*',
    'build/**/*',
    '**/*.min.js',
    '**/*.d.ts'
  ],
  maxFiles: 10,
  maxFileSize: 50000, // 50KB
  focusAreas: ['security', 'functionality', 'performance', 'style'],
  model: 'claude-3-haiku-20240307',
  maxTokens: 4000,
  temperature: 0.2,
  preferCli: true,
  saveResults: true,
  outputFormat: 'markdown'
};

/**
 * Options for running a code review
 */
export interface CodeReviewOptions {
  // File patterns to include (overrides config)
  includePatterns?: string[];
  
  // File patterns to exclude (overrides config)
  excludePatterns?: string[];
  
  // Specific file paths to review
  files?: string[];
  
  // Focus areas for the review
  focusAreas?: string[];
  
  // Claude model to use
  model?: string;
  
  // Path to configuration file
  configPath?: string;
  
  // Output format
  outputFormat?: 'markdown' | 'json';
  
  // Whether to save results to a file
  saveResults?: boolean;
  
  // Root directory of the project
  projectRoot?: string;
}

/**
 * Load code review configuration
 */
export async function loadCodeReviewConfig(
  configPath?: string,
  projectRoot: string = process.cwd()
): Promise<CodeReviewConfig> {
  try {
    // Use provided config path or look in standard locations
    const configFilePath = configPath || path.join(projectRoot, '.claude', 'code-review-config.json');
    
    // Check if config file exists
    if (await fs.pathExists(configFilePath)) {
      const userConfig = await fs.readJson(configFilePath);
      return { ...DEFAULT_CONFIG, ...userConfig };
    }
    
    // If no config file found, use defaults
    return DEFAULT_CONFIG;
  } catch (error) {
    Feedback.warning(`Failed to load code review configuration: ${error instanceof Error ? error.message : String(error)}`);
    return DEFAULT_CONFIG;
  }
}

/**
 * Find files for review based on patterns and options
 */
export async function findFilesForReview(
  options: {
    includePatterns?: string[];
    excludePatterns?: string[];
    files?: string[];
    maxFiles?: number;
    maxFileSize?: number;
  },
  projectRoot: string = process.cwd()
): Promise<string[]> {
  const {
    includePatterns,
    excludePatterns,
    files,
    maxFiles = DEFAULT_CONFIG.maxFiles,
    maxFileSize = DEFAULT_CONFIG.maxFileSize
  } = options;
  
  // If specific files are provided, use those
  if (files && files.length > 0) {
    const validFiles = await Promise.all(
      files.map(async (file) => {
        const resolvedPath = path.resolve(projectRoot, file);
        if (await fs.pathExists(resolvedPath)) {
          const stats = await fs.stat(resolvedPath);
          if (stats.isFile() && stats.size <= maxFileSize) {
            return resolvedPath;
          }
        }
        return null;
      })
    );
    
    return validFiles.filter(Boolean) as string[];
  }
  
  // Otherwise, use include/exclude patterns
  const patterns = includePatterns || DEFAULT_CONFIG.includePatterns;
  const ignorePatterns = excludePatterns || DEFAULT_CONFIG.excludePatterns;
  
  try {
    const matchedFiles = await glob(patterns, {
      cwd: projectRoot,
      ignore: ignorePatterns,
      absolute: true
    });
    
    // Filter out files that are too large
    const validFiles = await Promise.all(
      matchedFiles.map(async (file) => {
        const stats = await fs.stat(file);
        if (stats.size <= maxFileSize) {
          return file;
        }
        Feedback.warning(`Skipping file ${file} (size ${stats.size} exceeds limit of ${maxFileSize} bytes)`);
        return null;
      })
    );
    
    // Limit the number of files
    return validFiles.filter(Boolean).slice(0, maxFiles) as string[];
  } catch (error) {
    Feedback.error(`Error finding files for review: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Format a verification result as markdown
 */
export function formatReviewAsMarkdown(result: VerificationResult): string {
  let output = '';
  
  // Add header
  output += '# Claude AI Code Review\n\n';
  
  // Add summary
  output += `## Summary\n\n${result.summary}\n\n`;
  
  // Count issues by severity
  let totalIssues = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  
  for (const file of result.files) {
    for (const issue of file.issues) {
      totalIssues++;
      switch (issue.severity) {
        case IssueSeverity.CRITICAL:
          criticalCount++;
          break;
        case IssueSeverity.HIGH:
          highCount++;
          break;
        case IssueSeverity.MEDIUM:
          mediumCount++;
          break;
        case IssueSeverity.LOW:
          lowCount++;
          break;
      }
    }
  }
  
  // Add issue summary
  output += `## Issues Summary\n\n`;
  output += `Total issues: **${totalIssues}**\n\n`;
  output += `- 🔴 **Critical**: ${criticalCount}\n`;
  output += `- 🟠 **High**: ${highCount}\n`;
  output += `- 🟡 **Medium**: ${mediumCount}\n`;
  output += `- 🔵 **Low**: ${lowCount}\n\n`;
  
  // Add files and their issues
  for (const file of result.files) {
    output += `## File: ${file.path}\n\n`;
    output += `${file.analysis}\n\n`;
    
    if (file.issues && file.issues.length > 0) {
      output += `### Issues\n\n`;
      
      for (const issue of file.issues) {
        // Add severity emoji
        let severityEmoji = '';
        switch (issue.severity) {
          case IssueSeverity.CRITICAL:
            severityEmoji = '🔴';
            break;
          case IssueSeverity.HIGH:
            severityEmoji = '🟠';
            break;
          case IssueSeverity.MEDIUM:
            severityEmoji = '🟡';
            break;
          case IssueSeverity.LOW:
            severityEmoji = '🔵';
            break;
        }
        
        output += `#### ${severityEmoji} ${issue.severity.toUpperCase()}: ${issue.description}\n\n`;
        
        if (issue.location) {
          output += `**Location**: ${issue.location}\n\n`;
        }
        
        if (issue.suggestion) {
          output += `**Suggestion**: ${issue.suggestion}\n\n`;
        }
      }
    } else {
      output += `No issues detected in this file.\n\n`;
    }
  }
  
  // Add footer
  output += `\n\n---\n\n`;
  output += `Generated with Claude AI | ${new Date().toISOString()}\n`;
  
  return output;
}

/**
 * Save review results to a file
 */
export async function saveReviewResults(
  result: VerificationResult,
  format: 'markdown' | 'json',
  projectRoot: string = process.cwd()
): Promise<string> {
  try {
    // Create output directory
    const outputDir = path.join(projectRoot, '.claude', 'code-reviews');
    await fs.ensureDir(outputDir);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format === 'markdown' ? 'md' : 'json';
    const filename = `code-review-${timestamp}.${extension}`;
    const outputPath = path.join(outputDir, filename);
    
    // Format and save the content
    if (format === 'markdown') {
      const markdown = formatReviewAsMarkdown(result);
      await fs.writeFile(outputPath, markdown);
    } else {
      await fs.writeJson(outputPath, result, { spaces: 2 });
    }
    
    return outputPath;
  } catch (error) {
    Feedback.error(`Error saving review results: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

/**
 * Read file contents for review
 */
export async function readFilesForReview(
  filePaths: string[]
): Promise<{ path: string, content: string }[]> {
  const fileContents = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const relativePath = path.relative(process.cwd(), filePath);
        return { path: relativePath, content };
      } catch (error) {
        Feedback.warning(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }
    })
  );
  
  return fileContents.filter(Boolean) as { path: string, content: string }[];
}

/**
 * Run a code review on specified files
 */
export async function runCodeReview(options: CodeReviewOptions = {}): Promise<VerificationResult> {
  const {
    includePatterns,
    excludePatterns,
    files,
    focusAreas,
    model,
    configPath,
    outputFormat = 'markdown',
    saveResults = true,
    projectRoot = process.cwd()
  } = options;
  
  try {
    // Load configuration
    Feedback.info('Loading code review configuration...');
    const config = await loadCodeReviewConfig(configPath, projectRoot);
    
    // Find files to review
    Feedback.info('Finding files to review...');
    const filesToReview = await findFilesForReview({
      includePatterns: includePatterns || config.includePatterns,
      excludePatterns: excludePatterns || config.excludePatterns,
      files,
      maxFiles: config.maxFiles,
      maxFileSize: config.maxFileSize
    }, projectRoot);
    
    if (filesToReview.length === 0) {
      Feedback.warning('No files found for review');
      return {
        summary: 'No files found for review',
        files: [],
        shouldBlock: false
      };
    }
    
    Feedback.info(`Found ${filesToReview.length} files to review`);
    
    // Read file contents
    Feedback.info('Reading file contents...');
    const filesWithContent = await readFilesForReview(filesToReview);
    
    if (filesWithContent.length === 0) {
      Feedback.warning('Could not read any files for review');
      return {
        summary: 'Could not read any files for review',
        files: [],
        shouldBlock: false
      };
    }
    
    // Create verification options
    const verificationOptions: ClaudeVerificationOptions = {
      model: model || config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      focusAreas: focusAreas || config.focusAreas,
      useCliIfAvailable: config.preferCli
    };
    
    // Create verification prompt
    Feedback.info('Creating review prompt...');
    const prompt = ClaudeVerification.createVerificationPrompt(filesWithContent, verificationOptions);
    
    // Call Claude
    Feedback.info('Running code review with Claude...');
    
    // Use Claude CLI if available and preferred
    let response: string;
    
    if (config.preferCli && await ClaudeVerification.isClaudeCliAvailable()) {
      response = await ClaudeVerification.callClaudeCli(prompt, undefined, {
        json: true,
        model: verificationOptions.model,
        maxTokens: verificationOptions.maxTokens,
        temperature: verificationOptions.temperature
      });
    } else {
      // Use Claude API
      const env = await fs.readJson(path.join(projectRoot, '.env'), { throws: false }) || {};
      const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        throw new Error('Anthropic API key required when Claude CLI is not available');
      }
      
      response = await ClaudeVerification.callClaudeApi(prompt, undefined, {
        apiKey,
        model: verificationOptions.model,
        maxTokens: verificationOptions.maxTokens,
        temperature: verificationOptions.temperature
      });
    }
    
    // Parse response
    const result = ClaudeVerification.parseClaudeResponse(response);
    
    // Save results if requested
    if (saveResults) {
      const format = outputFormat || config.outputFormat;
      const outputPath = await saveReviewResults(result, format, projectRoot);
      
      if (outputPath) {
        Feedback.info(`Review results saved to: ${outputPath}`);
      }
    }
    
    return result;
  } catch (error) {
    Feedback.error(`Error running code review: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      summary: `Error running code review: ${error instanceof Error ? error.message : String(error)}`,
      files: [],
      shouldBlock: false
    };
  }
}

/**
 * Code Review API
 */
export const CodeReview = {
  runCodeReview,
  loadCodeReviewConfig,
  findFilesForReview,
  formatReviewAsMarkdown,
  saveReviewResults
};

export default CodeReview;