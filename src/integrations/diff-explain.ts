/**
 * Git Diff Explain
 *
 * This module provides functionality to enhance git diff output with AI-powered
 * explanations. It captures git diff output, processes it, sends it to Claude AI,
 * and formats the enhanced output with explanations, context, and potential issues.
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { Feedback } from '../utils/feedback';
import { Environment } from '../config/environment';
import ClaudeVerification, { ClaudeVerificationOptions } from './claude-verification';

/**
 * Configuration for diff-explain command
 */
export interface DiffExplainConfig {
  // Verbosity level for explanations ('brief' or 'detailed')
  verbosity: 'brief' | 'detailed';
  
  // Focus areas for explanations
  focusAreas: string[];
  
  // Max tokens to generate in Claude response
  maxTokens: number;
  
  // Maximum diff size to process (in characters)
  maxDiffSize: number;
  
  // Claude model to use
  model: string;
  
  // Temperature for generation
  temperature: number;
  
  // Output format ('inline', 'side-by-side', 'summary-only')
  outputFormat: 'inline' | 'side-by-side' | 'summary-only';
  
  // Whether to highlight potential issues
  highlightIssues: boolean;
  
  // Whether to include suggestions for improvements
  includeSuggestions: boolean;
  
  // Whether to include a summary of changes
  includeSummary: boolean;
  
  // Whether to prefer Claude CLI over API
  preferCli: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: DiffExplainConfig = {
  verbosity: 'detailed',
  focusAreas: ['functionality', 'security', 'performance', 'readability'],
  maxTokens: 4000,
  maxDiffSize: 100000,
  model: 'claude-3-opus-20240229',
  temperature: 0.7,
  outputFormat: 'inline',
  highlightIssues: true,
  includeSuggestions: true,
  includeSummary: true,
  preferCli: true
};

/**
 * Options for getting a Git diff
 */
export interface GitDiffOptions {
  commit?: string;
  branch?: string;
  files?: string[];
  staged?: boolean;
  since?: string;
  until?: string;
  diffOptions?: {
    ignoreWhitespace?: boolean;
    ignoreBlankLines?: boolean;
    context?: string;
  };
  projectRoot?: string;
}

/**
 * Statistics for a diff
 */
export interface DiffStats {
  additions: number;
  deletions: number;
  total: number;
  fileCount: number;
}

/**
 * File diff information
 */
export interface FileDiff {
  path: string;
  diff: string;
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };
}

/**
 * Processed diff information
 */
export interface ProcessedDiff {
  files: FileDiff[];
  stats: DiffStats;
  originalDiff: string;
}

/**
 * Issue identified in the diff
 */
export interface DiffIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  suggestion?: string;
}

/**
 * File explanation from Claude
 */
export interface FileExplanation {
  path: string;
  explanation: string;
  issues: DiffIssue[];
}

/**
 * Complete diff explanation
 */
export interface DiffExplanation {
  summary: string;
  files: FileExplanation[];
  rawResponse?: string;
}

/**
 * Options for explaining a diff
 */
export interface DiffExplainOptions extends GitDiffOptions {
  outputFormat?: 'inline' | 'side-by-side' | 'summary-only';
  verbosity?: 'brief' | 'detailed';
  focusAreas?: string[];
  highlightIssues?: boolean;
  includeSuggestions?: boolean;
  includeSummary?: boolean;
}

/**
 * Capture git diff output for specified parameters
 */
export function getGitDiff(options: GitDiffOptions = {}): string {
  const {
    commit,
    branch,
    files = [],
    staged = false,
    since,
    until,
    diffOptions = {},
    projectRoot = process.cwd()
  } = options;
  
  // Build the git diff command
  let diffCommand = 'git diff';
  
  // Add options for what to diff
  if (staged) {
    diffCommand += ' --staged';
  } else if (commit) {
    diffCommand += ` ${commit}`;
  } else if (branch) {
    diffCommand += ` ${branch}`;
  } else if (since && until) {
    diffCommand += ` ${since}..${until}`;
  } else if (since) {
    diffCommand += ` ${since}..HEAD`;
  }
  
  // Add diff options
  if (diffOptions.ignoreWhitespace) {
    diffCommand += ' --ignore-all-space';
  }
  
  if (diffOptions.ignoreBlankLines) {
    diffCommand += ' --ignore-blank-lines';
  }
  
  if (diffOptions.context) {
    diffCommand += ` --unified=${diffOptions.context}`;
  }
  
  // Add files if specified
  if (files.length > 0) {
    diffCommand += ` -- ${files.join(' ')}`;
  }
  
  try {
    return execSync(diffCommand, { encoding: 'utf8', cwd: projectRoot });
  } catch (error) {
    // If the command fails, return an empty string
    return '';
  }
}

/**
 * Process git diff output to prepare it for Claude API
 */
export function processDiff(
  diffOutput: string, 
  options: { maxDiffSize?: number } = {}
): ProcessedDiff {
  const {
    maxDiffSize = DEFAULT_CONFIG.maxDiffSize
  } = options;
  
  // Check if diff is too large
  if (diffOutput.length > maxDiffSize) {
    throw new Error(`Diff too large (${diffOutput.length} characters). Maximum size is ${maxDiffSize}.`);
  }
  
  // Split the diff into files and analyze
  const fileRegex = /^diff --git a\/(.*?) b\/(.*?)$/m;
  const fileMatches = [...diffOutput.matchAll(new RegExp(fileRegex, 'gm'))];
  
  // Get file paths and contents
  const files = fileMatches.map((match, index) => {
    const startIdx = match.index!;
    const endIdx = (index < fileMatches.length - 1) ? fileMatches[index + 1].index! : diffOutput.length;
    const fileDiff = diffOutput.substring(startIdx, endIdx);
    
    // Extract the file path
    const filePath = match[1];
    
    // Count additions and deletions
    const additionLines = (fileDiff.match(/^\+(?!\+\+)/gm) || []).length;
    const deletionLines = (fileDiff.match(/^-(?!--)/gm) || []).length;
    
    return {
      path: filePath,
      diff: fileDiff,
      stats: {
        additions: additionLines,
        deletions: deletionLines,
        total: additionLines + deletionLines
      }
    };
  });
  
  // If no files were found, handle the entire diff as one unit
  if (files.length === 0 && diffOutput.trim()) {
    const additionLines = (diffOutput.match(/^\+(?!\+\+)/gm) || []).length;
    const deletionLines = (diffOutput.match(/^-(?!--)/gm) || []).length;
    
    files.push({
      path: 'unknown',
      diff: diffOutput,
      stats: {
        additions: additionLines,
        deletions: deletionLines,
        total: additionLines + deletionLines
      }
    });
  }
  
  // Compute overall stats
  const stats = files.reduce((acc, file) => {
    acc.additions += file.stats.additions;
    acc.deletions += file.stats.deletions;
    acc.total += file.stats.total;
    acc.fileCount = files.length;
    return acc;
  }, { additions: 0, deletions: 0, total: 0, fileCount: 0 } as DiffStats);
  
  // Return processed diff
  return {
    files,
    stats,
    originalDiff: diffOutput
  };
}

/**
 * Create a prompt for Claude to explain the diff
 */
export function createDiffExplainPrompt(
  diffInfo: ProcessedDiff, 
  options: {
    verbosity?: 'brief' | 'detailed';
    focusAreas?: string[];
    highlightIssues?: boolean;
    includeSuggestions?: boolean;
  } = {}
): string {
  const {
    verbosity = DEFAULT_CONFIG.verbosity,
    focusAreas = DEFAULT_CONFIG.focusAreas,
    highlightIssues = DEFAULT_CONFIG.highlightIssues,
    includeSuggestions = DEFAULT_CONFIG.includeSuggestions
  } = options;
  
  // Create focus area instructions
  const focusInstructions = focusAreas.map(area => {
    switch (area) {
      case 'functionality':
        return '- Explain what the functional changes accomplish and their purpose';
      case 'security':
        return '- Identify any security implications or vulnerabilities introduced or fixed';
      case 'performance':
        return '- Analyze performance impacts of the changes';
      case 'readability':
        return '- Comment on code readability, structure and maintainability';
      default:
        return `- ${area}`;
    }
  }).join('\n');
  
  // Create verbosity instruction
  const verbosityInstruction = verbosity === 'brief' 
    ? 'Be concise, focus only on the most important aspects of the changes.'
    : 'Provide detailed explanations of the changes and their implications.';
  
  // Create issue highlighting instruction
  const issuesInstruction = highlightIssues 
    ? 'Identify potential issues, bugs, or code smells in the changes.'
    : 'Focus on explaining the changes without highlighting potential issues.';
  
  // Create suggestions instruction
  const suggestionsInstruction = includeSuggestions
    ? 'Suggest improvements or alternatives when appropriate.'
    : 'Do not include suggestions for improvement.';
  
  // Build the prompt
  const prompt = `You are an expert code reviewer. 
Please analyze and explain the following git diff output:

# Git Diff Stats
Files changed: ${diffInfo.stats.fileCount}
Additions: ${diffInfo.stats.additions}
Deletions: ${diffInfo.stats.deletions}
Total changes: ${diffInfo.stats.total}

# Instructions
${verbosityInstruction}
${issuesInstruction}
${suggestionsInstruction}

Focus on these aspects:
${focusInstructions}

# Format your response as JSON with the following structure:
{
  "summary": "Brief summary of overall changes",
  "files": [
    {
      "path": "file/path.ext",
      "explanation": "Explanation of changes to this file",
      "issues": [
        {
          "severity": "critical|high|medium|low",
          "description": "Issue description",
          "suggestion": "Suggested fix"
        }
      ]
    }
  ]
}

# Git Diff
\`\`\`diff
${diffInfo.originalDiff}
\`\`\`
`;

  return prompt;
}

/**
 * Call Claude to explain the diff
 */
export async function explainDiffWithClaude(
  prompt: string, 
  options: ClaudeVerificationOptions = {}
): Promise<DiffExplanation> {
  const {
    model = DEFAULT_CONFIG.model,
    maxTokens = DEFAULT_CONFIG.maxTokens,
    temperature = DEFAULT_CONFIG.temperature,
    useCliIfAvailable = DEFAULT_CONFIG.preferCli
  } = options;
  
  try {
    // Use Claude verification utilities
    const cliAvailable = useCliIfAvailable && await ClaudeVerification.isClaudeCliAvailable();
    
    let response: string;
    
    if (cliAvailable) {
      // Use Claude CLI
      response = await ClaudeVerification.callClaudeCli(prompt, undefined, {
        json: true,
        model,
        maxTokens,
        temperature
      });
    } else {
      // Get API key
      const env = await Environment.loadEnvironmentVars(process.cwd());
      const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        throw new Error('Claude API key required when Claude CLI is not available');
      }
      
      // Use Claude API
      response = await ClaudeVerification.callClaudeApi(prompt, undefined, {
        apiKey,
        model,
        maxTokens,
        temperature
      });
    }
    
    // Parse the response
    const explanation = parseClaudeResponse(response);
    
    return explanation;
  } catch (error) {
    Feedback.error(`Failed to explain diff with Claude: ${error instanceof Error ? error.message : String(error)}`);
    
    // Return a basic explanation
    return {
      summary: `Error getting explanation: ${error instanceof Error ? error.message : String(error)}`,
      files: [],
      rawResponse: ''
    };
  }
}

/**
 * Parse Claude's response to extract the explanation
 */
function parseClaudeResponse(response: string): DiffExplanation {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                     response.match(/```([\s\S]*?)```/) ||
                     response.match(/\{[\s\S]*"summary"[\s\S]*"files"[\s\S]*\}/);
    
    if (jsonMatch && jsonMatch[1]) {
      const jsonStr = jsonMatch[1].trim();
      const parsedResponse = JSON.parse(jsonStr);
      return {
        ...parsedResponse,
        rawResponse: response
      };
    } else if (response.startsWith('{') && response.endsWith('}')) {
      // Try to parse the entire response as JSON
      const parsedResponse = JSON.parse(response);
      return {
        ...parsedResponse,
        rawResponse: response
      };
    }
    
    // If no JSON found, create a basic structure from the text
    return {
      summary: 'Failed to parse Claude response as JSON',
      files: [{
        path: '',
        explanation: 'Claude response could not be parsed as JSON',
        issues: []
      }],
      rawResponse: response
    };
  } catch (error) {
    return {
      summary: `Failed to parse Claude response: ${error instanceof Error ? error.message : String(error)}`,
      files: [],
      rawResponse: response
    };
  }
}

/**
 * Format the enhanced diff output for display
 */
export function formatDiffOutput(
  diffInfo: ProcessedDiff, 
  explanation: DiffExplanation, 
  options: {
    outputFormat?: 'inline' | 'side-by-side' | 'summary-only';
    includeSummary?: boolean;
    highlightIssues?: boolean;
  } = {}
): string {
  const {
    outputFormat = DEFAULT_CONFIG.outputFormat,
    includeSummary = DEFAULT_CONFIG.includeSummary,
    highlightIssues = DEFAULT_CONFIG.highlightIssues
  } = options;
  
  let output = '';
  
  // Add header
  output += '=== Claude AI Git Diff Explanation ===\n\n';
  
  // Add summary if requested
  if (includeSummary && explanation.summary) {
    output += `Summary: ${explanation.summary}\n\n`;
  }
  
  // Add file explanations based on output format
  if (outputFormat === 'summary-only') {
    // Only show the summary and file-level explanations without the diff
    explanation.files.forEach(file => {
      const filePath = file.path || 'Unknown file';
      output += `File: ${filePath}\n`;
      output += file.explanation + '\n\n';
      
      // Add issues if any and highlighting is enabled
      if (highlightIssues && file.issues && file.issues.length > 0) {
        output += 'Issues:\n';
        
        file.issues.forEach(issue => {
          output += `[${issue.severity.toUpperCase()}] ${issue.description}\n`;
          
          if (issue.suggestion) {
            output += `Suggestion: ${issue.suggestion}\n`;
          }
          
          output += '\n';
        });
      }
    });
  } else if (outputFormat === 'inline') {
    // Find corresponding file information
    diffInfo.files.forEach(diffFile => {
      const explFile = explanation.files.find(f => f.path === diffFile.path);
      
      if (!explFile) {
        // If no explanation found for this file, just show the diff
        output += `File: ${diffFile.path}\n`;
        output += 'No specific explanation available for this file.\n\n';
        output += diffFile.diff + '\n\n';
        return;
      }
      
      // Add file header with path
      output += `File: ${diffFile.path}\n`;
      
      // Add file explanation
      output += `Explanation: ${explFile.explanation}\n\n`;
      
      // Add issues if any and highlighting is enabled
      if (highlightIssues && explFile.issues && explFile.issues.length > 0) {
        output += 'Issues:\n';
        
        explFile.issues.forEach(issue => {
          output += `[${issue.severity.toUpperCase()}] ${issue.description}\n`;
          
          if (issue.suggestion) {
            output += `Suggestion: ${issue.suggestion}\n`;
          }
          
          output += '\n';
        });
      }
      
      // Add the original diff
      output += diffFile.diff + '\n\n';
    });
  } else if (outputFormat === 'side-by-side') {
    // Side-by-side view is more complex and would require calculating terminal width
    // For now, let's just say it's not implemented
    output += 'Side-by-side view is not yet implemented.\n';
    output += 'Showing inline view instead.\n\n';
    
    // Fall back to inline view
    return formatDiffOutput(diffInfo, explanation, { ...options, outputFormat: 'inline' });
  }
  
  // Add footer
  output += '======================================\n';
  
  return output;
}

/**
 * Main function to explain a git diff
 */
export async function explainDiff(options: DiffExplainOptions = {}): Promise<string> {
  const {
    commit,
    branch,
    files = [],
    staged = false,
    since,
    until,
    outputFormat,
    verbosity,
    focusAreas,
    highlightIssues,
    includeSuggestions,
    includeSummary,
    projectRoot = process.cwd()
  } = options;
  
  try {
    // Load environment variables and configuration
    const env = await Environment.loadEnvironmentVars(projectRoot);
    
    // Load user configuration if available
    const configPath = path.join(projectRoot, '.claude', 'diff-explain-config.json');
    let userConfig: Partial<DiffExplainConfig> = {};
    
    try {
      if (await fs.pathExists(configPath)) {
        userConfig = await fs.readJson(configPath);
      }
    } catch (error) {
      Feedback.warning(`Failed to load user configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Merge with default config
    const config = { ...DEFAULT_CONFIG, ...userConfig };
    
    // Get the git diff
    Feedback.info('Capturing git diff...');
    const diffOutput = getGitDiff({
      commit,
      branch,
      files,
      staged,
      since,
      until,
      projectRoot
    });
    
    if (!diffOutput || diffOutput.trim() === '') {
      return 'No changes to explain.';
    }
    
    // Process the diff
    Feedback.info('Processing diff...');
    const diffInfo = processDiff(diffOutput, {
      maxDiffSize: config.maxDiffSize
    });
    
    // Create prompt for Claude
    Feedback.info('Creating prompt for Claude...');
    const prompt = createDiffExplainPrompt(diffInfo, {
      verbosity: verbosity || config.verbosity,
      focusAreas: focusAreas || config.focusAreas,
      highlightIssues: highlightIssues !== undefined ? highlightIssues : config.highlightIssues,
      includeSuggestions: includeSuggestions !== undefined ? includeSuggestions : config.includeSuggestions
    });
    
    // Call Claude
    Feedback.info('Calling Claude for explanation...');
    const explanation = await explainDiffWithClaude(prompt, {
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      useCliIfAvailable: config.preferCli
    });
    
    // Format the output
    Feedback.info('Formatting explanation...');
    const formattedOutput = formatDiffOutput(diffInfo, explanation, {
      outputFormat: outputFormat || config.outputFormat,
      includeSummary: includeSummary !== undefined ? includeSummary : config.includeSummary,
      highlightIssues: highlightIssues !== undefined ? highlightIssues : config.highlightIssues
    });
    
    return formattedOutput;
  } catch (error) {
    Feedback.error(`Error explaining diff: ${error instanceof Error ? error.message : String(error)}`);
    return `Error explaining diff: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Save the diff explanation to a file
 */
export async function saveDiffExplanation(
  explanation: DiffExplanation, 
  outputPath?: string
): Promise<string> {
  try {
    const outputDir = path.join(process.cwd(), '.claude', 'diff-explanations');
    await fs.ensureDir(outputDir);
    
    const filepath = outputPath || path.join(outputDir, `diff-explanation-${Date.now()}.json`);
    
    await fs.writeJson(filepath, explanation, { spaces: 2 });
    
    return filepath;
  } catch (error) {
    Feedback.error(`Error saving diff explanation: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

/**
 * Diff explain API
 */
export const DiffExplain = {
  getGitDiff,
  processDiff,
  createDiffExplainPrompt,
  explainDiffWithClaude,
  formatDiffOutput,
  explainDiff,
  saveDiffExplanation
};

export default DiffExplain;