/**
 * Git Diff Explain Command
 *
 * This module provides functionality to enhance git diff output with AI-powered
 * explanations. It captures git diff output, processes it, sends it to Claude AI,
 * and formats the enhanced output with explanations, context, and potential issues.
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { callClaudeCli, isClaudeCliAvailable } from './claude-cli.js';
import { loadEnvironmentVars } from '../config/environment.js';
import { printHeader, printInfo, printWarning, printError, printSuccess, printDebug } from '../utils/logger.js';

/**
 * Configuration for diff-explain command
 */
const DEFAULT_CONFIG = {
  // Verbosity level for explanations
  verbosity: 'detailed', // 'brief', 'detailed'
  
  // Focus areas for explanations
  focusAreas: ['functionality', 'security', 'performance', 'readability'],
  
  // Max tokens to generate in Claude response
  maxTokens: 4000,
  
  // Maximum diff size to process (in characters)
  maxDiffSize: 100000,
  
  // Claude model to use
  model: 'claude-3-opus-20240229',
  
  // Temperature for generation
  temperature: 0.7,
  
  // Output format ('inline', 'side-by-side', 'summary-only')
  outputFormat: 'inline',
  
  // Whether to highlight potential issues
  highlightIssues: true,
  
  // Whether to include suggestions for improvements
  includeSuggestions: true,
  
  // Whether to include a summary of changes
  includeSummary: true
};

/**
 * Capture git diff output for specified parameters
 * @param {Object} options Options for the diff command
 * @param {string} [options.commit] Specific commit to diff against
 * @param {string} [options.branch] Branch to diff against
 * @param {Array<string>} [options.files] Specific files to include in diff
 * @param {boolean} [options.staged] Whether to show staged changes
 * @param {string} [options.since] Show changes since this reference (e.g., HEAD~3)
 * @param {string} [options.until] Show changes until this reference
 * @param {Object} [options.diffOptions] Additional git diff options
 * @param {boolean} [options.diffOptions.ignoreWhitespace] Ignore whitespace changes
 * @param {boolean} [options.diffOptions.ignoreBlankLines] Ignore blank line changes
 * @param {string} [options.diffOptions.context] Context lines (number)
 * @param {string} [options.projectRoot] Project root directory
 * @returns {string} Git diff output
 */
export function getGitDiff(options = {}) {
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
  } catch (err) {
    // If the command fails, return an empty string
    return '';
  }
}

/**
 * Process git diff output to prepare it for Claude API
 * @param {string} diffOutput Raw git diff output
 * @param {Object} options Processing options
 * @param {boolean} [options.removeContext=false] Whether to remove context lines
 * @param {boolean} [options.removeFilenames=false] Whether to remove filenames
 * @param {number} [options.maxDiffSize=DEFAULT_CONFIG.maxDiffSize] Maximum diff size to process
 * @returns {Object} Processed diff information
 */
export function processDiff(diffOutput, options = {}) {
  const {
    _removeContext = false,
    _removeFilenames = false,
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
    const startIdx = match.index;
    const endIdx = (index < fileMatches.length - 1) ? fileMatches[index + 1].index : diffOutput.length;
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
  }, { additions: 0, deletions: 0, total: 0, fileCount: 0 });
  
  // Return processed diff
  return {
    files,
    stats,
    originalDiff: diffOutput
  };
}

/**
 * Create a prompt for Claude to explain the diff
 * @param {Object} diffInfo Processed diff information
 * @param {Object} options Prompt options
 * @param {string} [options.verbosity=DEFAULT_CONFIG.verbosity] Verbosity level
 * @param {Array<string>} [options.focusAreas=DEFAULT_CONFIG.focusAreas] Focus areas
 * @param {boolean} [options.highlightIssues=DEFAULT_CONFIG.highlightIssues] Whether to highlight issues
 * @param {boolean} [options.includeSuggestions=DEFAULT_CONFIG.includeSuggestions] Whether to include suggestions
 * @returns {string} Prompt for Claude
 */
export function createDiffExplainPrompt(diffInfo, options = {}) {
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
 * Call Claude API to explain the diff
 * @param {string} prompt Prompt for Claude
 * @param {Object} options Claude API options
 * @param {string} [options.model=DEFAULT_CONFIG.model] Claude model to use
 * @param {number} [options.maxTokens=DEFAULT_CONFIG.maxTokens] Max tokens to generate
 * @param {number} [options.temperature=DEFAULT_CONFIG.temperature] Temperature for generation
 * @param {boolean} [options.preferCli=true] Whether to prefer Claude CLI over API
 * @param {string} [options.claudeApiKey] Claude API key (needed if not using CLI)
 * @returns {Promise<Object>} Explanation from Claude
 */
export async function explainDiffWithClaude(prompt, options = {}) {
  const {
    model = DEFAULT_CONFIG.model,
    maxTokens = DEFAULT_CONFIG.maxTokens,
    temperature = DEFAULT_CONFIG.temperature,
    preferCli = true,
    claudeApiKey
  } = options;
  
  // Check if Claude CLI is available
  const cliAvailable = preferCli && await isClaudeCliAvailable();
  
  if (cliAvailable) {
    try {
      // Use Claude CLI
      const response = await callClaudeCli({
        prompt,
        model,
        maxTokens,
        temperature,
        format: 'json'
      });
      
      // Parse the response and return
      return parseClaudeResponse(response);
    } catch (err) {
      throw new Error(`Failed to call Claude CLI: ${err.message}`);
    }
  } else {
    // Use Claude API
    if (!claudeApiKey) {
      throw new Error('Claude API key required when Claude CLI is not available');
    }
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error (${response.status}): ${errorText}`);
      }
      
      const responseData = await response.json();
      return parseClaudeResponse(responseData);
    } catch (err) {
      throw new Error(`Failed to call Claude API: ${err.message}`);
    }
  }
}

/**
 * Parse Claude's response to extract the explanation
 * @param {Object} response Claude API response
 * @returns {Object} Parsed explanation
 */
function parseClaudeResponse(response) {
  try {
    let responseText;
    
    if (typeof response === 'string') {
      // Direct text response from CLI
      responseText = response;
    } else if (response.content && Array.isArray(response.content)) {
      // API response format
      responseText = response.content[0]?.text || '';
    } else if (response.content) {
      // CLI JSON response format
      responseText = response.content;
    } else {
      throw new Error('Unrecognized Claude response format');
    }
    
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                     responseText.match(/```([\s\S]*?)```/) ||
                     responseText.match(/\{[\s\S]*"summary"[\s\S]*"files"[\s\S]*\}/);
    
    if (jsonMatch && jsonMatch[1]) {
      const jsonStr = jsonMatch[1].trim();
      return JSON.parse(jsonStr);
    } else if (responseText.startsWith('{') && responseText.endsWith('}')) {
      // Try to parse the entire response as JSON
      return JSON.parse(responseText);
    }
    
    // If no JSON found, create a basic structure from the text
    return {
      summary: 'Failed to parse Claude response as JSON',
      files: [{
        path: '',
        explanation: 'Claude response could not be parsed as JSON',
        issues: []
      }],
      rawResponse: responseText
    };
  } catch (err) {
    return {
      summary: `Failed to parse Claude response: ${err.message}`,
      files: [],
      rawResponse: response
    };
  }
}

/**
 * Format the enhanced diff output for display
 * @param {Object} diffInfo Original diff information
 * @param {Object} explanation Explanation from Claude
 * @param {Object} options Formatting options
 * @param {string} [options.outputFormat=DEFAULT_CONFIG.outputFormat] Output format ('inline', 'side-by-side', 'summary-only')
 * @param {boolean} [options.includeSummary=DEFAULT_CONFIG.includeSummary] Whether to include a summary
 * @param {boolean} [options.highlightIssues=DEFAULT_CONFIG.highlightIssues] Whether to highlight issues
 * @returns {string} Formatted output
 */
export function formatDiffOutput(diffInfo, explanation, options = {}) {
  const {
    outputFormat = DEFAULT_CONFIG.outputFormat,
    includeSummary = DEFAULT_CONFIG.includeSummary,
    highlightIssues = DEFAULT_CONFIG.highlightIssues
  } = options;
  
  let output = '';
  
  // Add header
  output += chalk.bold.blue('=== Claude AI Git Diff Explanation ===\n\n');
  
  // Add summary if requested
  if (includeSummary && explanation.summary) {
    output += chalk.bold('Summary: ') + explanation.summary + '\n\n';
  }
  
  // Add file explanations based on output format
  if (outputFormat === 'summary-only') {
    // Only show the summary and file-level explanations without the diff
    explanation.files.forEach(file => {
      const filePath = file.path || 'Unknown file';
      output += chalk.bold.yellow(`File: ${filePath}\n`);
      output += file.explanation + '\n\n';
      
      // Add issues if any and highlighting is enabled
      if (highlightIssues && file.issues && file.issues.length > 0) {
        output += chalk.bold('Issues:\n');
        
        file.issues.forEach(issue => {
          // Color code by severity
          let severityColor;
          switch (issue.severity) {
            case 'critical':
              severityColor = chalk.bgRed.white;
              break;
            case 'high':
              severityColor = chalk.red;
              break;
            case 'medium':
              severityColor = chalk.yellow;
              break;
            case 'low':
              severityColor = chalk.blue;
              break;
            default:
              severityColor = chalk.white;
          }
          
          output += severityColor(`[${issue.severity.toUpperCase()}] `) + issue.description + '\n';
          
          if (issue.suggestion) {
            output += chalk.green('Suggestion: ') + issue.suggestion + '\n';
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
        output += chalk.bold.yellow(`File: ${diffFile.path}\n`);
        output += 'No specific explanation available for this file.\n\n';
        output += diffFile.diff + '\n\n';
        return;
      }
      
      // Add file header with path
      output += chalk.bold.yellow(`File: ${diffFile.path}\n`);
      
      // Add file explanation
      output += chalk.cyan('Explanation: ') + explFile.explanation + '\n\n';
      
      // Add issues if any and highlighting is enabled
      if (highlightIssues && explFile.issues && explFile.issues.length > 0) {
        output += chalk.bold('Issues:\n');
        
        explFile.issues.forEach(issue => {
          // Color code by severity
          let severityColor;
          switch (issue.severity) {
            case 'critical':
              severityColor = chalk.bgRed.white;
              break;
            case 'high':
              severityColor = chalk.red;
              break;
            case 'medium':
              severityColor = chalk.yellow;
              break;
            case 'low':
              severityColor = chalk.blue;
              break;
            default:
              severityColor = chalk.white;
          }
          
          output += severityColor(`[${issue.severity.toUpperCase()}] `) + issue.description + '\n';
          
          if (issue.suggestion) {
            output += chalk.green('Suggestion: ') + issue.suggestion + '\n';
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
    output += chalk.yellow('Side-by-side view is not yet implemented.\n');
    output += 'Showing inline view instead.\n\n';
    
    // Fall back to inline view
    return formatDiffOutput(diffInfo, explanation, { ...options, outputFormat: 'inline' });
  }
  
  // Add footer
  output += chalk.bold.blue('======================================\n');
  
  return output;
}

/**
 * Load environment variables and config
 * @param {string} projectRoot Project root directory
 * @returns {Promise<Object>} Environment variables and config
 */
async function loadEnvAndConfig(projectRoot) {
  // Load environment variables
  const env = await loadEnvironmentVars(projectRoot);
  
  // Load user configuration if available
  const configPath = path.join(projectRoot, '.claude', 'diff-explain-config.json');
  let userConfig = {};
  
  try {
    if (await fs.pathExists(configPath)) {
      userConfig = await fs.readJson(configPath);
    }
  } catch (err) {
    printWarning(`Failed to load user configuration: ${err.message}`);
  }
  
  // Merge with default config
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  
  return { env, config };
}

/**
 * Main function to explain a git diff
 * @param {Object} options Command options
 * @param {string} [options.commit] Specific commit to diff against
 * @param {string} [options.branch] Branch to diff against
 * @param {Array<string>} [options.files=[]] Specific files to include in diff
 * @param {boolean} [options.staged=false] Whether to show staged changes
 * @param {string} [options.since] Show changes since this reference
 * @param {string} [options.until] Show changes until this reference
 * @param {string} [options.outputFormat] Output format
 * @param {string} [options.verbosity] Verbosity level
 * @param {Array<string>} [options.focusAreas] Focus areas
 * @param {boolean} [options.highlightIssues] Whether to highlight issues
 * @param {boolean} [options.includeSuggestions] Whether to include suggestions
 * @param {boolean} [options.includeSummary] Whether to include a summary
 * @param {string} [options.projectRoot=process.cwd()] Project root directory
 * @returns {Promise<string>} Formatted explanation
 */
export async function explainDiff(options = {}) {
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
    const { env, config } = await loadEnvAndConfig(projectRoot);
    
    // Get the git diff
    printInfo('Capturing git diff...');
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
    printInfo('Processing diff...');
    const diffInfo = processDiff(diffOutput, {
      maxDiffSize: config.maxDiffSize
    });
    
    // Create prompt for Claude
    printInfo('Creating prompt for Claude...');
    const prompt = createDiffExplainPrompt(diffInfo, {
      verbosity: verbosity || config.verbosity,
      focusAreas: focusAreas || config.focusAreas,
      highlightIssues: highlightIssues !== undefined ? highlightIssues : config.highlightIssues,
      includeSuggestions: includeSuggestions !== undefined ? includeSuggestions : config.includeSuggestions
    });
    
    // Call Claude
    printInfo('Calling Claude API for explanation...');
    const explanation = await explainDiffWithClaude(prompt, {
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      preferCli: true,
      claudeApiKey: env.ANTHROPIC_API_KEY
    });
    
    // Format the output
    printInfo('Formatting explanation...');
    const formattedOutput = formatDiffOutput(diffInfo, explanation, {
      outputFormat: outputFormat || config.outputFormat,
      includeSummary: includeSummary !== undefined ? includeSummary : config.includeSummary,
      highlightIssues: highlightIssues !== undefined ? highlightIssues : config.highlightIssues
    });
    
    return formattedOutput;
  } catch (err) {
    printError(`Error explaining diff: ${err.message}`);
    return `Error explaining diff: ${err.message}`;
  }
}

export default {
  getGitDiff,
  processDiff,
  createDiffExplainPrompt,
  explainDiffWithClaude,
  formatDiffOutput,
  explainDiff
};