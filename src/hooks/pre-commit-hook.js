/**
 * Pre-Commit Hook
 *
 * Implements a pre-commit hook for Git that uses Claude to review staged changes
 * before they are committed. It can block commits that don't meet quality standards.
 */

// fs-extra is used in the parent class
import path from 'path';
import chalk from 'chalk';
import { BaseHook } from './base-hook.js';

class PreCommitHook extends BaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Claude Pre-Commit Review',
      description: 'Uses Claude to review staged changes before they are committed',
      gitHookName: 'pre-commit'
    });
    
    // Additional configuration specific to pre-commit
    this.blockingMode = config.blockingMode || false; // Whether to block commits on issues
    this.reviewTypes = config.reviewTypes || ['bugs', 'security', 'best-practices']; // What to review for
    this.includePatterns = config.includePatterns || ['*.js', '*.jsx', '*.ts', '*.tsx', '*.py', '*.rb']; // Files to include
    this.excludePatterns = config.excludePatterns || ['**/node_modules/**', '**/dist/**', '**/build/**']; // Files to exclude
    this.maxDiffSize = config.maxDiffSize || 50000; // Maximum diff size to review
    this.blockOnSeverity = config.blockOnSeverity || 'none'; // Block commits with issues at or above this severity
  }

  /**
   * Generate the hook script content
   * @returns {string} The hook script content
   */
  generateHookScript() {
    return `#!/bin/sh
# AI Coding Assistants Hook: ${this.name}
# Description: ${this.description}
# Generated: ${new Date().toISOString()}

# Check if any files are staged
if [ -z "$(git diff --cached --name-only)" ]; then
  echo "No files staged for commit, skipping ${this.name} hook"
  exit 0
fi

# Run linting if available
if [ -f "package.json" ] && grep -q "\"lint\"" package.json; then
  npm run lint
fi

# Run the Claude hook for pre-commit validation
npx ai-coding-assistants-setup claude-hook-runner pre-commit --non-interactive "$@"
exit $?
`;
  }

  /**
   * Execute the pre-commit hook logic
   * @param {Array<string>} _args Command-line arguments (unused)
   * @returns {Promise<void>}
   */
  async execute(_args) {
    this.info('Executing pre-commit hook...');
    
    try {
      // Get staged files
      const stagedFiles = await this.getStagedFiles();
      if (stagedFiles.length === 0) {
        this.info('No files staged for commit, skipping review');
        return;
      }
      
      // Get the diff of staged changes
      const diff = await this.getStagedDiff();
      if (!diff || diff.length === 0) {
        this.info('No changes in staged files, skipping review');
        return;
      }
      
      // Check if the diff is too large
      if (diff.length > this.maxDiffSize) {
        this.warn(`Diff too large (${diff.length} bytes), skipping review`);
        if (this.blockingMode) {
          this.error('Blocking mode enabled, but diff is too large for review');
          this.error('Please make smaller commits or disable blocking mode');
          process.exit(1);
        }
        return;
      }
      
      // Review the changes with Claude
      const review = await this.reviewChanges(diff);
      
      // Output the review
      this.outputReview(review);
      
      // Block commit if necessary
      if (this.blockingMode && this.shouldBlockCommit(review.issues)) {
        this.error(`Issues with severity ${this.blockOnSeverity} or higher found, blocking commit`);
        process.exit(1);
      }
    } catch (err) {
      this.error(`Failed to execute pre-commit hook: ${err.message}`);
      
      // Don't block the commit in case of hook failure
      if (!this.blockingMode) {
        this.warn('Allowing commit to proceed despite hook failure');
        process.exit(0);
      } else {
        this.error('Blocking mode enabled, blocking commit due to hook failure');
        process.exit(1);
      }
    }
  }

  /**
   * Get the list of staged files
   * @returns {Promise<Array<string>>} List of staged file paths
   */
  async getStagedFiles() {
    const output = this.executeCommand('git diff --cached --name-only');
    return output.split('\n').filter(line => line.trim() !== '');
  }

  /**
   * Get the diff of staged changes
   * @returns {Promise<string>} Git diff output
   */
  async getStagedDiff() {
    return this.executeCommand('git diff --cached');
  }

  /**
   * Review changes with Claude
   * @param {string} diff Git diff to review
   * @returns {Promise<Object>} Review results
   */
  async reviewChanges(diff) {
    // Load environment variables to get API key
    const env = this.loadEnv();
    this.setClaudeApiKey(env.ANTHROPIC_API_KEY || '');
    
    if (!this.claudeApiKey) {
      throw new Error('No Claude API key found. Please set ANTHROPIC_API_KEY in your .env file');
    }
    
    // Create a prompt for Claude
    const prompt = this.createReviewPrompt(diff);
    
    try {
      // Call Claude API
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-opus-20240229',
        maxTokens: 2000
      });
      
      // Parse the response
      return this.parseReviewResponse(response);
    } catch (err) {
      this.error(`Failed to review changes with Claude: ${err.message}`);
      return {
        summary: 'Failed to review changes with Claude',
        issues: []
      };
    }
  }

  /**
   * Create a prompt for Claude to review changes
   * @param {string} diff Git diff to review
   * @returns {string} Prompt for Claude
   */
  createReviewPrompt(diff) {
    const strictnessLevel = {
      low: 'Focus only on critical bugs and security issues',
      medium: 'Focus on bugs, security issues, and clear code quality problems',
      high: 'Be thorough and point out all potential issues including style and best practices'
    }[this.strictness] || 'Focus on bugs, security issues, and clear code quality problems';

    // Build more detailed instructions based on focus areas
    const focusInstructions = [];

    if (this.reviewTypes.includes('bugs')) {
      focusInstructions.push('- Look for logical errors, edge cases, and potential runtime exceptions');
    }

    if (this.reviewTypes.includes('security')) {
      focusInstructions.push('- Check for security vulnerabilities like injection risks, unvalidated inputs, and exposure of sensitive data');
    }

    if (this.reviewTypes.includes('performance')) {
      focusInstructions.push('- Identify performance issues like inefficient algorithms, unnecessary computations, or memory leaks');
    }

    if (this.reviewTypes.includes('best-practices')) {
      focusInstructions.push('- Evaluate adherence to coding best practices, design patterns, and maintainability concerns');
    }

    if (this.reviewTypes.includes('style')) {
      focusInstructions.push('- Check code style, formatting, naming conventions, and overall code readability');
    }

    const focusDetails = focusInstructions.length > 0 ?
      `\nSpecifically:\n${focusInstructions.join('\n')}` : '';

    return `You are an expert code reviewer. Please review the following Git diff and provide feedback.

Strictness level: ${this.strictness} - ${strictnessLevel}
Focus areas: ${this.reviewTypes.join(', ')}${focusDetails}

# Git Diff
\`\`\`diff
${diff}
\`\`\`

Please analyze the code changes and provide:
1. A brief summary of the changes
2. Any issues found, categorized by severity (critical, high, medium, low)
3. Suggestions for improvements

Format your response as JSON with the following structure:
{
  "summary": "Brief description of the changes",
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "description": "Issue description",
      "suggestion": "Suggested fix",
      "file": "affected file path",
      "line": "line number or range"
    }
  ]
}`;
  }

  /**
   * Parse Claude's response to extract review information
   * @param {Object} response Claude API response
   * @returns {Object} Parsed review information
   */
  parseReviewResponse(response) {
    try {
      const message = response.content[0]?.text || '';
      
      // Try to extract JSON from the response
      const jsonMatch = message.match(/```json\n([\s\S]*?)\n```/) || 
                       message.match(/```([\s\S]*?)```/) ||
                       message.match(/\{[\s\S]*"summary"[\s\S]*"issues"[\s\S]*\}/);
      
      if (jsonMatch && jsonMatch[1]) {
        const jsonStr = jsonMatch[1].trim();
        return JSON.parse(jsonStr);
      }
      
      // If no JSON found, try to create a basic structure from the text
      return {
        summary: 'Claude response could not be parsed as JSON',
        issues: [{
          severity: 'low',
          description: 'Claude review completed, but response format was not as expected',
          suggestion: 'Check the complete Claude response',
          file: '',
          line: ''
        }]
      };
    } catch (err) {
      this.error(`Failed to parse Claude review response: ${err.message}`);
      return {
        summary: 'Failed to parse Claude review response',
        issues: []
      };
    }
  }

  /**
   * Determine whether to block the commit based on issue severity
   * @param {Array<Object>} issues Review issues
   * @returns {boolean} Whether to block the commit
   */
  shouldBlockCommit(issues) {
    if (this.blockOnSeverity === 'none') {
      return false;
    }

    const severityLevels = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1,
      'none': 0
    };

    const thresholdLevel = severityLevels[this.blockOnSeverity] || 0;

    return issues.some(issue => {
      const issueSeverityLevel = severityLevels[issue.severity] || 0;
      return issueSeverityLevel >= thresholdLevel;
    });
  }

  /**
   * Output the review results to the console
   * @param {Object} review Review results
   */
  outputReview(review) {
    console.log('\n=== Claude Code Review ===\n');
    console.log(review.summary);
    
    if (review.issues && review.issues.length > 0) {
      console.log('\nIssues found:');
      
      const severityColors = {
        critical: chalk.bgRed.white,
        high: chalk.red,
        medium: chalk.yellow,
        low: chalk.blue
      };
      
      review.issues.forEach(issue => {
        const severityColor = severityColors[issue.severity] || chalk.white;
        const location = issue.file ? `${issue.file}${issue.line ? `:${issue.line}` : ''}` : '';
        
        console.log(`\n${severityColor(issue.severity.toUpperCase())}: ${location ? `[${location}] ` : ''}${issue.description}`);
        if (issue.suggestion) {
          console.log(`  Suggestion: ${issue.suggestion}`);
        }
      });
    } else {
      console.log('\nNo issues found!');
    }
    
    console.log('\n===========================\n');
  }
}

export default PreCommitHook;