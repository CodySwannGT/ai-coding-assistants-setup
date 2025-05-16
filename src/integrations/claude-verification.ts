/**
 * Claude Verification
 * 
 * Functions for using Claude AI to verify code quality, security, and performance
 * in Git hooks and other integrations.
 */

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { Environment } from '../config/environment';
import { Feedback } from '../utils/feedback';

/**
 * Options for Claude verification
 */
export interface ClaudeVerificationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  focusAreas?: string[];
  includeSuggestions?: boolean;
  useCliIfAvailable?: boolean;
  blockOnCritical?: boolean;
  blockOnHigh?: boolean;
  blockOnMedium?: boolean;
}

/**
 * Issue severity levels
 */
export enum IssueSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

/**
 * Code issue identified by Claude
 */
export interface CodeIssue {
  severity: IssueSeverity;
  description: string;
  suggestion?: string;
  location?: string;
}

/**
 * File verification result
 */
export interface FileVerificationResult {
  path: string;
  analysis: string;
  issues: CodeIssue[];
}

/**
 * Complete verification result
 */
export interface VerificationResult {
  summary: string;
  files: FileVerificationResult[];
  shouldBlock: boolean;
  rawResponse?: string;
}

/**
 * Default verification options
 */
export const DEFAULT_VERIFICATION_OPTIONS: ClaudeVerificationOptions = {
  model: 'claude-3-opus-20240229',
  maxTokens: 4000,
  temperature: 0.2,
  focusAreas: ['security', 'functionality', 'performance', 'style'],
  includeSuggestions: true,
  useCliIfAvailable: true,
  blockOnCritical: true,
  blockOnHigh: false,
  blockOnMedium: false
};

/**
 * Check if Claude CLI is available
 */
export async function isClaudeCliAvailable(): Promise<boolean> {
  try {
    execSync('which claude', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the Claude CLI version
 */
export async function getClaudeCliVersion(): Promise<string | null> {
  try {
    const output = execSync('claude --version', { encoding: 'utf8' });
    const versionMatch = output.match(/claude\s+version\s+(\S+)/i);
    return versionMatch ? versionMatch[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Call Claude CLI with a prompt
 */
export async function callClaudeCli(
  prompt: string, 
  content?: string,
  options: {
    json?: boolean;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  // Check if Claude CLI is available
  const cliAvailable = await isClaudeCliAvailable();
  if (!cliAvailable) {
    throw new Error('Claude CLI is not available');
  }

  // If content is provided, create a temporary file
  let tempFile: string | null = null;
  
  if (content) {
    const tempDir = path.join(process.cwd(), '.claude', 'temp');
    await fs.ensureDir(tempDir);
    tempFile = path.join(tempDir, `content-${Date.now()}.txt`);
    await fs.writeFile(tempFile, content);
  }
  
  try {
    // Prepare the command
    let command: string;
    
    if (tempFile) {
      command = `cat "${tempFile}"`;
    } else {
      command = 'echo ""';
    }
    
    // Safely escape the prompt for the shell
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    
    // Complete the command with claude and the -p flag
    command += ` | claude -p '${escapedPrompt}'`;
    
    // Add model flag if specified
    if (options.model) {
      command += ` --model=${options.model}`;
    }
    
    // Add max tokens flag if specified
    if (options.maxTokens) {
      command += ` --max-tokens=${options.maxTokens}`;
    }
    
    // Add temperature flag if specified
    if (options.temperature !== undefined) {
      command += ` --temperature=${options.temperature}`;
    }
    
    // Add JSON output format if requested
    if (options.json) {
      command += ' --output-format json';
    }
    
    Feedback.info(`Calling Claude CLI to analyze code...`);
    
    // Execute the command
    const output = execSync(command, { encoding: 'utf8' });
    
    return output;
  } catch (error) {
    Feedback.error(`Claude CLI error: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to call Claude CLI: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // Clean up any temporary files
    if (tempFile) {
      await fs.remove(tempFile);
    }
  }
}

/**
 * Call Claude API with a prompt
 */
export async function callClaudeApi(
  prompt: string, 
  content?: string,
  options: {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  try {
    const fullPrompt = content ? `${prompt}\n\n${content}` : prompt;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || DEFAULT_VERIFICATION_OPTIONS.model,
        max_tokens: options.maxTokens || DEFAULT_VERIFICATION_OPTIONS.maxTokens,
        temperature: options.temperature !== undefined ? options.temperature : DEFAULT_VERIFICATION_OPTIONS.temperature,
        messages: [{ role: 'user', content: fullPrompt }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorText}`);
    }
    
    const responseData = await response.json();
    return responseData.content[0]?.text || '';
  } catch (error) {
    Feedback.error(`Claude API error: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to call Claude API: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse Claude's response to extract the verification result
 */
export function parseClaudeResponse(response: string): VerificationResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                     response.match(/```([\s\S]*?)```/) ||
                     response.match(/\{[\s\S]*"summary"[\s\S]*"files"[\s\S]*\}/);
    
    let parsedResponse: any = null;
    
    if (jsonMatch && jsonMatch[1]) {
      const jsonStr = jsonMatch[1].trim();
      parsedResponse = JSON.parse(jsonStr);
    } else if (response.startsWith('{') && response.endsWith('}')) {
      // Try to parse the entire response as JSON
      parsedResponse = JSON.parse(response);
    }
    
    if (!parsedResponse) {
      // If no JSON found, create a basic structure from the text
      return {
        summary: 'Failed to parse Claude response as JSON',
        files: [{
          path: '',
          analysis: 'Claude response could not be parsed as JSON',
          issues: []
        }],
        shouldBlock: false,
        rawResponse: response
      };
    }
    
    // Check if any issues should block the commit
    const shouldBlock = parsedResponse.files.some((file: any) => {
      return file.issues && file.issues.some((issue: any) => {
        const severity = issue.severity.toLowerCase();
        return (
          (severity === IssueSeverity.CRITICAL && DEFAULT_VERIFICATION_OPTIONS.blockOnCritical) ||
          (severity === IssueSeverity.HIGH && DEFAULT_VERIFICATION_OPTIONS.blockOnHigh) ||
          (severity === IssueSeverity.MEDIUM && DEFAULT_VERIFICATION_OPTIONS.blockOnMedium)
        );
      });
    });
    
    return {
      ...parsedResponse,
      shouldBlock,
      rawResponse: response
    };
  } catch (error) {
    return {
      summary: `Failed to parse Claude response: ${error instanceof Error ? error.message : String(error)}`,
      files: [],
      shouldBlock: false,
      rawResponse: response
    };
  }
}

/**
 * Create verification prompt for Claude
 */
export function createVerificationPrompt(
  files: { path: string, content: string }[],
  options: ClaudeVerificationOptions = DEFAULT_VERIFICATION_OPTIONS
): string {
  const { focusAreas, includeSuggestions } = options;
  
  // Create focus area instructions
  const focusInstructions = (focusAreas || []).map(area => {
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
  }).join('\n');
  
  // Create suggestions instruction
  const suggestionsInstruction = includeSuggestions
    ? 'Include specific suggestions for how to fix each issue.'
    : 'Focus on identifying issues without providing detailed fix suggestions.';
  
  // Build the prompt
  let prompt = `You are an expert code reviewer for a software development team. 
Please analyze the following code files for quality, security, and correctness issues:

# Instructions
${suggestionsInstruction}

Focus on these aspects:
${focusInstructions}

For each file, identify issues with the following severity levels:
- CRITICAL: Issues that must be fixed immediately (security vulnerabilities, major bugs)
- HIGH: Serious issues that should be addressed soon (potential bugs, significant maintenance problems)
- MEDIUM: Issues that affect code quality but aren't critical (code smells, minor performance issues)
- LOW: Minor issues or suggestions for improvement (style inconsistencies, readability)

# Format your response as JSON with the following structure:
{
  "summary": "Brief summary of overall code quality",
  "files": [
    {
      "path": "file/path.ext",
      "analysis": "Brief analysis of this file",
      "issues": [
        {
          "severity": "critical|high|medium|low",
          "description": "Issue description",
          "suggestion": "Suggested fix",
          "location": "Line number or code snippet context"
        }
      ]
    }
  ]
}

# Files to Review
`;

  // Add file information to the prompt
  for (const file of files) {
    prompt += `\nFile: ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n`;
  }
  
  return prompt;
}

/**
 * Generate a verification report from the verification result
 */
export function formatVerificationReport(result: VerificationResult): string {
  let report = '';
  
  report += `# Code Verification Report\n\n`;
  report += `${result.summary}\n\n`;
  
  let totalIssues = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  
  // Count issues by severity
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
  report += `## Issues Summary\n\n`;
  report += `Total issues: ${totalIssues}\n`;
  report += `- ❌ Critical: ${criticalCount}\n`;
  report += `- ⚠️ High: ${highCount}\n`;
  report += `- 🔶 Medium: ${mediumCount}\n`;
  report += `- ℹ️ Low: ${lowCount}\n\n`;
  
  // Add file details
  for (const file of result.files) {
    report += `## ${file.path}\n\n`;
    report += `${file.analysis}\n\n`;
    
    if (file.issues.length > 0) {
      report += `### Issues\n\n`;
      
      for (const issue of file.issues) {
        // Add severity icon
        let severityIcon = '';
        switch (issue.severity) {
          case IssueSeverity.CRITICAL:
            severityIcon = '❌';
            break;
          case IssueSeverity.HIGH:
            severityIcon = '⚠️';
            break;
          case IssueSeverity.MEDIUM:
            severityIcon = '🔶';
            break;
          case IssueSeverity.LOW:
            severityIcon = 'ℹ️';
            break;
        }
        
        report += `#### ${severityIcon} ${issue.severity.toUpperCase()}: ${issue.description}\n\n`;
        
        if (issue.location) {
          report += `Location: ${issue.location}\n\n`;
        }
        
        if (issue.suggestion) {
          report += `Suggestion: ${issue.suggestion}\n\n`;
        }
      }
    } else {
      report += `No issues detected!\n\n`;
    }
  }
  
  return report;
}

/**
 * Verify staged files using Claude
 */
export async function verifyStagedFiles(
  options: ClaudeVerificationOptions = DEFAULT_VERIFICATION_OPTIONS
): Promise<VerificationResult> {
  try {
    // Get list of staged files
    const stagedFilesOutput = execSync('git diff --staged --name-only', {
      encoding: 'utf8'
    }).trim();
    
    if (!stagedFilesOutput) {
      return {
        summary: 'No staged files to verify',
        files: [],
        shouldBlock: false
      };
    }
    
    const stagedFiles = stagedFilesOutput.split('\n');
    
    // Filter to only include relevant code files
    const relevantExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.vue', 
      '.java', '.py', '.rb', '.php', '.go',
      '.c', '.cpp', '.h', '.hpp', '.cs', 
      '.swift', '.kt', '.rs', '.scala'
    ];
    
    const codeFiles = stagedFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return relevantExtensions.includes(ext);
    });
    
    if (codeFiles.length === 0) {
      return {
        summary: 'No code files staged for verification',
        files: [],
        shouldBlock: false
      };
    }
    
    // Read file contents
    const filesWithContent = await Promise.all(
      codeFiles.map(async (filePath) => {
        try {
          // Get staged version of the file
          const content = execSync(`git show :${filePath}`, {
            encoding: 'utf8'
          });
          
          return { path: filePath, content };
        } catch (error) {
          Feedback.warning(`Failed to read staged content of ${filePath}`);
          return null;
        }
      })
    );
    
    // Filter out files that couldn't be read
    const validFiles = filesWithContent.filter(Boolean) as { path: string, content: string }[];
    
    if (validFiles.length === 0) {
      return {
        summary: 'No readable code files staged for verification',
        files: [],
        shouldBlock: false
      };
    }
    
    // Create the verification prompt
    const prompt = createVerificationPrompt(validFiles, options);
    
    // Get Claude response
    let claudeResponse: string;
    
    // Environment variables
    const projectRoot = process.cwd();
    const env = await Environment.loadEnvironmentVars(projectRoot);
    
    // Try CLI first if available and enabled
    const useCliIfAvailable = options.useCliIfAvailable !== undefined 
      ? options.useCliIfAvailable 
      : DEFAULT_VERIFICATION_OPTIONS.useCliIfAvailable;
      
    if (useCliIfAvailable && await isClaudeCliAvailable()) {
      claudeResponse = await callClaudeCli(prompt, undefined, {
        json: true,
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature
      });
    } else {
      // Use API as fallback
      const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        throw new Error('Anthropic API key required when Claude CLI is not available');
      }
      
      claudeResponse = await callClaudeApi(prompt, undefined, {
        apiKey,
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature
      });
    }
    
    // Parse the response
    const result = parseClaudeResponse(claudeResponse);
    
    return result;
  } catch (error) {
    Feedback.error(`Error verifying staged files: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      summary: `Error verifying staged files: ${error instanceof Error ? error.message : String(error)}`,
      files: [],
      shouldBlock: false
    };
  }
}

/**
 * Save verification result to project
 */
export async function saveVerificationResult(
  result: VerificationResult, 
  projectRoot: string = process.cwd()
): Promise<string> {
  try {
    // Create Claude directory if it doesn't exist
    const claudeDir = path.join(projectRoot, '.claude', 'verification');
    await fs.ensureDir(claudeDir);
    
    // Format timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(claudeDir, `verification-${timestamp}.md`);
    
    // Format the report
    const report = formatVerificationReport(result);
    
    // Write the report to file
    await fs.writeFile(filePath, report);
    
    return filePath;
  } catch (error) {
    Feedback.error(`Error saving verification result: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

/**
 * Verify a specific file using Claude
 */
export async function verifyFile(
  filePath: string,
  options: ClaudeVerificationOptions = DEFAULT_VERIFICATION_OPTIONS
): Promise<VerificationResult> {
  try {
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read file content
    const content = await fs.readFile(filePath, 'utf8');
    
    // Create file info object
    const fileInfo = { path: filePath, content };
    
    // Create the verification prompt
    const prompt = createVerificationPrompt([fileInfo], options);
    
    // Get Claude response
    let claudeResponse: string;
    
    // Environment variables
    const projectRoot = process.cwd();
    const env = await Environment.loadEnvironmentVars(projectRoot);
    
    // Try CLI first if available and enabled
    const useCliIfAvailable = options.useCliIfAvailable !== undefined 
      ? options.useCliIfAvailable 
      : DEFAULT_VERIFICATION_OPTIONS.useCliIfAvailable;
      
    if (useCliIfAvailable && await isClaudeCliAvailable()) {
      claudeResponse = await callClaudeCli(prompt, undefined, {
        json: true,
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature
      });
    } else {
      // Use API as fallback
      const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        throw new Error('Anthropic API key required when Claude CLI is not available');
      }
      
      claudeResponse = await callClaudeApi(prompt, undefined, {
        apiKey,
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature
      });
    }
    
    // Parse the response
    const result = parseClaudeResponse(claudeResponse);
    
    return result;
  } catch (error) {
    Feedback.error(`Error verifying file: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      summary: `Error verifying file: ${error instanceof Error ? error.message : String(error)}`,
      files: [],
      shouldBlock: false
    };
  }
}

/**
 * Verify a Git commit by analyzing changes
 */
export async function verifyCommit(
  commitHash: string = 'HEAD',
  options: ClaudeVerificationOptions = DEFAULT_VERIFICATION_OPTIONS
): Promise<VerificationResult> {
  try {
    // Get changes in the commit
    const changedFilesOutput = execSync(`git show --name-only --pretty=format: ${commitHash}`, {
      encoding: 'utf8'
    }).trim();
    
    if (!changedFilesOutput) {
      return {
        summary: 'No files changed in this commit',
        files: [],
        shouldBlock: false
      };
    }
    
    const changedFiles = changedFilesOutput.split('\n').filter(Boolean);
    
    // Filter to only include relevant code files
    const relevantExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.vue', 
      '.java', '.py', '.rb', '.php', '.go',
      '.c', '.cpp', '.h', '.hpp', '.cs', 
      '.swift', '.kt', '.rs', '.scala'
    ];
    
    const codeFiles = changedFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return relevantExtensions.includes(ext);
    });
    
    if (codeFiles.length === 0) {
      return {
        summary: 'No code files changed in this commit',
        files: [],
        shouldBlock: false
      };
    }
    
    // Read file contents at this commit
    const filesWithContent = await Promise.all(
      codeFiles.map(async (filePath) => {
        try {
          // Get file version at this commit
          const content = execSync(`git show ${commitHash}:${filePath}`, {
            encoding: 'utf8'
          });
          
          return { path: filePath, content };
        } catch (error) {
          Feedback.warning(`Failed to read content of ${filePath} at commit ${commitHash}`);
          return null;
        }
      })
    );
    
    // Filter out files that couldn't be read
    const validFiles = filesWithContent.filter(Boolean) as { path: string, content: string }[];
    
    if (validFiles.length === 0) {
      return {
        summary: 'No readable code files in this commit',
        files: [],
        shouldBlock: false
      };
    }
    
    // Create the verification prompt
    const prompt = createVerificationPrompt(validFiles, options);
    
    // Get Claude response
    let claudeResponse: string;
    
    // Environment variables
    const projectRoot = process.cwd();
    const env = await Environment.loadEnvironmentVars(projectRoot);
    
    // Try CLI first if available and enabled
    const useCliIfAvailable = options.useCliIfAvailable !== undefined 
      ? options.useCliIfAvailable 
      : DEFAULT_VERIFICATION_OPTIONS.useCliIfAvailable;
      
    if (useCliIfAvailable && await isClaudeCliAvailable()) {
      claudeResponse = await callClaudeCli(prompt, undefined, {
        json: true,
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature
      });
    } else {
      // Use API as fallback
      const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        throw new Error('Anthropic API key required when Claude CLI is not available');
      }
      
      claudeResponse = await callClaudeApi(prompt, undefined, {
        apiKey,
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature
      });
    }
    
    // Parse the response
    const result = parseClaudeResponse(claudeResponse);
    
    return result;
  } catch (error) {
    Feedback.error(`Error verifying commit: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      summary: `Error verifying commit: ${error instanceof Error ? error.message : String(error)}`,
      files: [],
      shouldBlock: false
    };
  }
}

/**
 * Claude verification API
 */
export const ClaudeVerification = {
  isClaudeCliAvailable,
  getClaudeCliVersion,
  callClaudeCli,
  callClaudeApi,
  createVerificationPrompt,
  verifyStagedFiles,
  verifyFile,
  verifyCommit,
  saveVerificationResult,
  formatVerificationReport,
  parseClaudeResponse
};

export default ClaudeVerification;