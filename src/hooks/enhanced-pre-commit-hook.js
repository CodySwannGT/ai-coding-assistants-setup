/**
 * Enhanced Pre-Commit Hook
 * 
 * Implements an enhanced pre-commit hook for Git that runs code quality checks 
 * including TypeScript type checking, linting, and formatting, as well as
 * using Claude to review staged changes.
 */

import _fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { EnhancedBaseHook } from './enhanced-base-hook.js';
import { HookLifecycle, HookResultStatus } from './hook-interfaces.js';

class EnhancedPreCommitHook extends EnhancedBaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Enhanced Pre-Commit Quality Check',
      description: 'Runs code quality checks and reviews staged changes',
      gitHookName: 'pre-commit'
    });
    
    // Code review configuration
    this.blockingMode = config.blockingMode || 'warn'; // 'block', 'warn', or 'none'
    this.reviewTypes = config.reviewTypes || ['bugs', 'security', 'best-practices']; // What to review for
    this.includePatterns = config.includePatterns || ['*.js', '*.jsx', '*.ts', '*.tsx', '*.py', '*.rb']; // Files to include
    this.excludePatterns = config.excludePatterns || ['**/node_modules/**', '**/dist/**', '**/build/**']; // Files to exclude
    this.maxDiffSize = config.maxDiffSize || 50000; // Maximum diff size to review
    this.blockOnSeverity = config.blockOnSeverity || 'high'; // Block commits with issues at or above this severity
    
    // Type checking configuration
    this.typeCheck = config.typeCheck || { enabled: false, scriptName: 'types:check' };
    
    // Linting configuration
    this.linting = config.linting || { enabled: false, linter: 'eslint', scriptName: 'lint' };
    
    // Formatting configuration
    this.formatting = config.formatting || { enabled: false, formatter: 'prettier', scriptName: 'format' };
    
    // Override the config schema for this specific hook
    this.configSchema = {
      properties: {
        ...this.configSchema.properties,
        blockingMode: { type: 'string', enum: ['block', 'warn', 'none'] },
        reviewTypes: { type: 'array', items: { type: 'string' } },
        includePatterns: { type: 'array', items: { type: 'string' } },
        excludePatterns: { type: 'array', items: { type: 'string' } },
        maxDiffSize: { type: 'number' },
        blockOnSeverity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'none'] },
        typeCheck: { 
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            scriptName: { type: 'string' }
          }
        },
        linting: { 
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            linter: { type: 'string' },
            scriptName: { type: 'string' }
          }
        },
        formatting: { 
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            formatter: { type: 'string' },
            scriptName: { type: 'string' }
          }
        }
      },
      required: [...this.configSchema.required],
      defaults: {
        ...this.configSchema.defaults,
        blockingMode: 'warn',
        reviewTypes: ['bugs', 'security', 'best-practices'],
        includePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx', '*.py', '*.rb'],
        excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**'],
        maxDiffSize: 50000,
        blockOnSeverity: 'high',
        typeCheck: { enabled: false, scriptName: 'types:check' },
        linting: { enabled: false, linter: 'eslint', scriptName: 'lint' },
        formatting: { enabled: false, formatter: 'prettier', scriptName: 'format' }
      }
    };

    // Register middleware for hook lifecycle phases
    this.use(HookLifecycle.BEFORE_EXECUTION, this.beforeExecutionMiddleware.bind(this));
    this.use(HookLifecycle.EXECUTION, this.executionMiddleware.bind(this));
    this.use(HookLifecycle.AFTER_EXECUTION, this.afterExecutionMiddleware.bind(this));
    this.use(HookLifecycle.ERROR, this.errorMiddleware.bind(this));
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

# Run the enhanced Claude hook for pre-commit validation
npx ai-coding-assistants-setup claude-hook-runner enhanced-pre-commit --non-interactive "$@"
exit $?
`;
  }

  /**
   * Before execution middleware
   * @param {Object} context Hook execution context
   * @param {Function} next Next middleware function
   */
  async beforeExecutionMiddleware(context, _next) {
    this.info('Preparing to run pre-commit checks...');
    
    // Get staged files
    context.stagedFiles = await this.getStagedFiles();
    if (context.stagedFiles.length === 0) {
      this.info('No files staged for commit, skipping checks');
      context.result = {
        status: HookResultStatus.SKIPPED,
        message: 'No files staged for commit, skipping checks',
        data: {},
        shouldBlock: false,
        issues: []
      };
      return; // Skip to next middleware
    }
    
    // Initialize results structure
    context.results = {
      typeCheck: { ran: false, success: true, output: '', error: null },
      linting: { ran: false, success: true, output: '', error: null },
      formatting: { ran: false, success: true, output: '', error: null },
      review: { ran: false, summary: '', issues: [] }
    };
  }

  /**
   * Execution middleware - runs the quality checks
   * @param {Object} context Hook execution context
   * @param {Function} next Next middleware function
   */
  async executionMiddleware(context, _next) {
    // Skip if we already have a result (e.g., due to early exit in before execution)
    if (context.result) {
      return; // Skip to next middleware
    }
    
    try {
      // Run TypeScript type checking if enabled
      if (this.typeCheck.enabled) {
        await this.runTypeCheck(context);
      }
      
      // Run linting if enabled
      if (this.linting.enabled) {
        await this.runLinting(context);
      }
      
      // Run formatting if enabled
      if (this.formatting.enabled) {
        await this.runFormatting(context);
      }
      
      // Run Claude code review
      await this.runCodeReview(context);
      
      // Determine if any check failed
      const anyFailure = !context.results.typeCheck.success || 
                         !context.results.linting.success || 
                         !context.results.formatting.success ||
                         this.shouldBlockCommit(context.results.review.issues);
      
      // Create result
      context.result = {
        status: anyFailure ? 
          (this.blockingMode === 'block' ? HookResultStatus.ERROR : HookResultStatus.WARNING) : 
          HookResultStatus.SUCCESS,
        message: anyFailure ? 
          'Code quality issues found' : 
          'Code quality checks passed',
        data: context.results,
        shouldBlock: anyFailure && this.blockingMode === 'block',
        issues: this.collectAllIssues(context.results)
      };
    } catch (err) {
      this.error(`Failed to execute pre-commit hook: ${err.message}`);
      
      // Set error result
      context.error = err;
      context.result = {
        status: HookResultStatus.ERROR,
        message: `Failed to execute pre-commit hook: ${err.message}`,
        data: {},
        shouldBlock: this.blockingMode === 'block',
        issues: [{
          severity: 'high',
          description: `Failed to execute pre-commit hook: ${err.message}`,
          file: '',
          line: ''
        }]
      };
    }
  }

  /**
   * After execution middleware
   * @param {Object} context Hook execution context
   * @param {Function} next Next middleware function
   */
  async afterExecutionMiddleware(context, _next) {
    // Output check results
    this.outputCheckResults(context.results);
    
    // Emit event with the result
    this.emit('pre-commit:complete', {
      result: context.result,
      results: context.results,
      stagedFiles: context.stagedFiles
    });
    
    // Log information about the execution
    if (context.result.status === HookResultStatus.SUCCESS) {
      this.success(`Hook ${this.name} completed successfully`);
    } else if (context.result.status === HookResultStatus.WARNING) {
      this.warn(`Hook ${this.name} completed with warnings`);
    } else if (context.result.status === HookResultStatus.SKIPPED) {
      this.info(`Hook ${this.name} execution was skipped: ${context.result.message}`);
    } else {
      this.error(`Hook ${this.name} completed with status: ${context.result.status}`);
      
      if (context.result.shouldBlock) {
        this.info('You can bypass this hook with git commit --no-verify');
      }
    }
  }

  /**
   * Error middleware
   * @param {Object} context Hook execution context
   * @param {Function} next Next middleware function
   */
  async errorMiddleware(context, _next) {
    this.error(`Error in ${this.name} hook: ${context.error?.message || 'Unknown error'}`);
    
    // Emit error event
    this.emit('pre-commit:error', {
      error: context.error,
      stagedFiles: context.stagedFiles
    });
    
    // Handle blocking based on blocking mode
    if (this.blockingMode !== 'block') {
      if (context.result && context.result.shouldBlock) {
        context.result.shouldBlock = false;
        this.warn('Error occurred, but allowing commit to proceed due to blocking mode');
      }
    }
  }

  /**
   * Run TypeScript type checking
   * @param {Object} context The execution context
   * @returns {Promise<void>}
   */
  async runTypeCheck(context) {
    this.info(`Running TypeScript type checking with "${this.typeCheck.scriptName}" script...`);
    
    try {
      context.results.typeCheck.ran = true;
      const { output, success } = await this.runNpmScript(this.typeCheck.scriptName);
      context.results.typeCheck.success = success;
      context.results.typeCheck.output = output;
      
      if (success) {
        this.success('TypeScript type checking passed');
      } else {
        this.error('TypeScript type checking failed');
      }
    } catch (err) {
      context.results.typeCheck.success = false;
      context.results.typeCheck.error = err.message;
      this.error(`Failed to run TypeScript type checking: ${err.message}`);
    }
  }

  /**
   * Run linting
   * @param {Object} context The execution context
   * @returns {Promise<void>}
   */
  async runLinting(context) {
    this.info(`Running linting with "${this.linting.scriptName}" script...`);
    
    try {
      context.results.linting.ran = true;
      const { output, success } = await this.runNpmScript(this.linting.scriptName);
      context.results.linting.success = success;
      context.results.linting.output = output;
      
      if (success) {
        this.success('Linting passed');
      } else {
        this.error('Linting failed');
      }
    } catch (err) {
      context.results.linting.success = false;
      context.results.linting.error = err.message;
      this.error(`Failed to run linting: ${err.message}`);
    }
  }

  /**
   * Run formatting
   * @param {Object} context The execution context
   * @returns {Promise<void>}
   */
  async runFormatting(context) {
    this.info(`Running formatting with "${this.formatting.scriptName}" script...`);
    
    try {
      context.results.formatting.ran = true;
      const { output, success } = await this.runNpmScript(this.formatting.scriptName);
      context.results.formatting.success = success;
      context.results.formatting.output = output;
      
      if (success) {
        this.success('Formatting passed');
      } else {
        this.error('Formatting failed');
      }
    } catch (err) {
      context.results.formatting.success = false;
      context.results.formatting.error = err.message;
      this.error(`Failed to run formatting: ${err.message}`);
    }
  }

  /**
   * Run code review using Claude
   * @param {Object} context The execution context
   * @returns {Promise<void>}
   */
  async runCodeReview(context) {
    this.info('Running Claude code review...');
    
    try {
      // Get the diff of staged changes
      const diff = await this.getStagedDiff();
      if (!diff || diff.length === 0) {
        this.info('No changes in staged files, skipping review');
        return;
      }
      
      // Check if the diff is too large
      if (diff.length > this.maxDiffSize) {
        this.warn(`Diff too large (${diff.length} bytes), skipping review`);
        return;
      }

      // Check if Claude is available
      if (this.claudeAvailable === null) {
        await this.checkClaudeAvailability();
      }
      
      if (!this.claudeAvailable) {
        this.warn('Claude is not available, skipping code review');
        return;
      }
      
      // Mark review as attempted
      context.results.review.ran = true;
      
      // Create a prompt for Claude
      const prompt = this.createReviewPrompt(diff);
      
      // Call Claude API
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-haiku-20240307', // Use a faster model for commit review
        maxTokens: 2000,
        temperature: 0.2, // Lower temperature for more consistent reviews
        cacheResponse: true // Cache responses to avoid duplicate API calls
      });
      
      // Parse the response
      const reviewResult = this.parseReviewResponse(response);
      context.results.review.summary = reviewResult.summary;
      context.results.review.issues = reviewResult.issues;
      
      this.info('Claude code review completed');
    } catch (err) {
      this.error(`Failed to run code review: ${err.message}`);
    }
  }

  /**
   * Run an npm script and return whether it succeeded
   * @param {string} scriptName The name of the npm script to run
   * @returns {Promise<{output: string, success: boolean}>} The script output and success status
   */
  async runNpmScript(scriptName) {
    return new Promise((resolve) => {
      const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const child = spawn(npm, ['run', scriptName], {
        cwd: this.projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
      });
      
      let output = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({
          output: output.trim(),
          success: code === 0
        });
      });
    });
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
    if (this.blockOnSeverity === 'none' || !issues || issues.length === 0) {
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
   * Collect all issues from all checks
   * @param {Object} results Results from all checks
   * @returns {Array<Object>} Collected issues
   */
  collectAllIssues(results) {
    const issues = [];
    
    // Add TypeScript type checking issues
    if (results.typeCheck.ran && !results.typeCheck.success) {
      issues.push({
        severity: 'high',
        description: 'TypeScript type checking failed',
        suggestion: 'Fix TypeScript type errors',
        file: '',
        line: '',
        output: results.typeCheck.output
      });
    }
    
    // Add linting issues
    if (results.linting.ran && !results.linting.success) {
      issues.push({
        severity: 'medium',
        description: 'Linting failed',
        suggestion: 'Fix linting errors',
        file: '',
        line: '',
        output: results.linting.output
      });
    }
    
    // Add formatting issues
    if (results.formatting.ran && !results.formatting.success) {
      issues.push({
        severity: 'low',
        description: 'Formatting failed',
        suggestion: 'Fix formatting errors',
        file: '',
        line: '',
        output: results.formatting.output
      });
    }
    
    // Add Claude code review issues
    if (results.review.ran && results.review.issues && results.review.issues.length > 0) {
      issues.push(...results.review.issues);
    }
    
    return issues;
  }

  /**
   * Output check results to the console
   * @param {Object} results Results from all checks
   */
  outputCheckResults(results) {
    console.log('\n=== Code Quality Checks ===\n');
    
    // Output TypeScript type checking results
    if (results.typeCheck.ran) {
      const status = results.typeCheck.success ? chalk.green('PASS') : chalk.red('FAIL');
      console.log(`TypeScript type checking: ${status}`);
      if (!results.typeCheck.success && results.typeCheck.output) {
        console.log(chalk.yellow('Type checking output:'));
        console.log(results.typeCheck.output.slice(0, 500) + (results.typeCheck.output.length > 500 ? '...' : ''));
      }
    }
    
    // Output linting results
    if (results.linting.ran) {
      const status = results.linting.success ? chalk.green('PASS') : chalk.red('FAIL');
      console.log(`Linting: ${status}`);
      if (!results.linting.success && results.linting.output) {
        console.log(chalk.yellow('Linting output:'));
        console.log(results.linting.output.slice(0, 500) + (results.linting.output.length > 500 ? '...' : ''));
      }
    }
    
    // Output formatting results
    if (results.formatting.ran) {
      const status = results.formatting.success ? chalk.green('PASS') : chalk.red('FAIL');
      console.log(`Formatting: ${status}`);
      if (!results.formatting.success && results.formatting.output) {
        console.log(chalk.yellow('Formatting output:'));
        console.log(results.formatting.output.slice(0, 500) + (results.formatting.output.length > 500 ? '...' : ''));
      }
    }
    
    // Output Claude code review results
    if (results.review.ran) {
      console.log('\n=== Claude Code Review ===\n');
      console.log(results.review.summary);
      
      if (results.review.issues && results.review.issues.length > 0) {
        console.log('\nIssues found:');
        
        const severityColors = {
          critical: chalk.bgRed.white,
          high: chalk.red,
          medium: chalk.yellow,
          low: chalk.blue
        };
        
        results.review.issues.forEach(issue => {
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
    }
    
    console.log('\n===========================\n');
  }
}

export default EnhancedPreCommitHook;