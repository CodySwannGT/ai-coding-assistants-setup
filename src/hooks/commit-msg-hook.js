/**
 * Commit Message Hook
 * 
 * Implements a commit-msg hook for Git that uses Claude to validate
 * commit message structure and content against configurable rules.
 */

import fs from 'fs-extra';
import path from 'path';
import { BaseHook } from './base-hook.js';

class CommitMsgHook extends BaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Claude Commit Message Validator',
      description: 'Uses Claude to validate commit message structure and content',
      gitHookName: 'commit-msg'
    });
    
    // Additional configuration specific to commit-msg
    this.blockingMode = config.blockingMode || false; // Whether to block commits on validation failures
    this.conventionalCommits = config.conventionalCommits || true; // Check for conventional commits format
    this.checkSpelling = config.checkSpelling || true; // Check for spelling errors
    this.checkGrammar = config.checkGrammar || true; // Check for grammar errors
    this.maxLength = config.maxLength || { subject: 72, body: 100 }; // Maximum lengths for subject and body
    this.suggestImprovements = config.suggestImprovements || true; // Suggest improvements
  }

  /**
   * Generate the hook script content
   * @returns {string} The hook script content
   */
  generateHookScript() {
    // Get the Node executable path
    const nodePath = process.execPath;
    
    // Get the script path - this will be installed in the project's bin directory
    const scriptPath = path.join(this.projectRoot, 'node_modules', '.bin', 'claude-hook-runner');
    
    return `#!/bin/sh
# AI Coding Assistants Hook: ${this.name}
# Description: ${this.description}
# Generated: ${new Date().toISOString()}

# Run the hook script
"${nodePath}" "${scriptPath}" commit-msg "$@"
exit $?
`;
  }

  /**
   * Execute the commit-msg hook logic
   * @param {Array<string>} args Command-line arguments
   * @returns {Promise<void>}
   */
  async execute(args) {
    this.info('Executing commit-msg hook...');
    
    try {
      // Get the commit message file path from args
      const commitMsgFile = args[0];
      if (!commitMsgFile) {
        this.error('No commit message file provided');
        process.exit(1);
      }
      
      // Read the commit message
      let commitMessage = '';
      try {
        commitMessage = await fs.readFile(commitMsgFile, 'utf8');
      } catch (err) {
        this.error(`Failed to read commit message file: ${err.message}`);
        process.exit(1);
      }
      
      // Remove comment lines from the commit message
      commitMessage = commitMessage.split('\n')
        .filter(line => !line.startsWith('#'))
        .join('\n')
        .trim();
      
      // Skip if the commit message is empty
      if (!commitMessage) {
        this.error('Empty commit message, please provide a message');
        process.exit(1);
      }
      
      // Validate the commit message with Claude
      const validation = await this.validateCommitMessage(commitMessage);
      
      // Display the validation results
      this.outputValidationResults(validation);
      
      // Block commit if necessary
      if (this.blockingMode && !validation.valid) {
        this.error('Commit message validation failed, blocking commit');
        this.info('You can edit your commit message or bypass this hook with git commit --no-verify');
        process.exit(1);
      }
    } catch (err) {
      this.error(`Failed to execute commit-msg hook: ${err.message}`);
      
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
   * Validate commit message with Claude
   * @param {string} message Commit message to validate
   * @returns {Promise<Object>} Validation results
   */
  async validateCommitMessage(message) {
    // Load environment variables to get API key
    const env = this.loadEnv();
    this.setClaudeApiKey(env.ANTHROPIC_API_KEY || '');
    
    if (!this.claudeApiKey) {
      throw new Error('No Claude API key found. Please set ANTHROPIC_API_KEY in your .env file');
    }
    
    // Create a prompt for Claude
    const prompt = this.createValidationPrompt(message);
    
    try {
      // Call Claude API
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-opus-20240229',
        maxTokens: 1000
      });
      
      // Parse the response
      return this.parseValidationResponse(response);
    } catch (err) {
      this.error(`Failed to validate commit message with Claude: ${err.message}`);
      return {
        valid: true, // Assume valid in case of API failure
        issues: [{
          type: 'error',
          message: `Failed to validate commit message with Claude: ${err.message}`
        }],
        suggestions: []
      };
    }
  }

  /**
   * Create a prompt for Claude to validate a commit message
   * @param {string} message Commit message to validate
   * @returns {string} Prompt for Claude
   */
  createValidationPrompt(message) {
    const conventionalCommitsCheck = this.conventionalCommits
      ? `Check if the message follows the Conventional Commits format:
<type>[(scope)]: <description>

[body]

[footer(s)]

Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert`
      : '';
    
    return `You are an expert developer tasked with validating a Git commit message against best practices.

The commit message is:
\`\`\`
${message}
\`\`\`

Please validate this commit message against the following criteria:

${conventionalCommitsCheck}

Rules:
- Subject should be less than ${this.maxLength.subject} characters
- Subject should be in imperative mood (e.g., "Add feature" not "Added feature")
- Subject should not end with a period
- Subject should start with a capital letter
- Body lines should be less than ${this.maxLength.body} characters
${this.checkSpelling ? '- No spelling errors' : ''}
${this.checkGrammar ? '- No grammar errors' : ''}
- Message should be clear and descriptive
- Message should focus on why the change was made, not just what was changed

Format your response as JSON with the following structure:
{
  "valid": true/false,
  "issues": [
    {
      "type": "error/warning",
      "message": "Description of the issue"
    }
  ],
  "suggestions": [
    "Suggestion for improvement"
  ]
}`;
  }

  /**
   * Parse Claude's response to extract validation information
   * @param {Object} response Claude API response
   * @returns {Object} Parsed validation information
   */
  parseValidationResponse(response) {
    try {
      const message = response.content[0]?.text || '';
      
      // Try to extract JSON from the response
      const jsonMatch = message.match(/```json\n([\s\S]*?)\n```/) || 
                       message.match(/```([\s\S]*?)```/) ||
                       message.match(/\{[\s\S]*"valid"[\s\S]*"issues"[\s\S]*"suggestions"[\s\S]*\}/);
      
      if (jsonMatch && jsonMatch[1]) {
        const jsonStr = jsonMatch[1].trim();
        return JSON.parse(jsonStr);
      }
      
      // If no JSON found, try to create a basic structure from the text
      // Default to valid if we can't parse the response
      return {
        valid: true,
        issues: [{
          type: 'warning',
          message: 'Claude response could not be parsed as JSON'
        }],
        suggestions: ['Consider running validation again']
      };
    } catch (err) {
      this.error(`Failed to parse Claude validation response: ${err.message}`);
      return {
        valid: true, // Default to valid in case of parsing failure
        issues: [{
          type: 'warning',
          message: `Failed to parse Claude validation response: ${err.message}`
        }],
        suggestions: []
      };
    }
  }

  /**
   * Output the validation results to the console
   * @param {Object} validation Validation results
   */
  outputValidationResults(validation) {
    console.log('\n=== Claude Commit Message Validation ===\n');
    
    if (validation.valid) {
      console.log('✅ Commit message looks good!\n');
    } else {
      console.log('❌ Commit message needs improvement\n');
    }
    
    if (validation.issues && validation.issues.length > 0) {
      console.log('Issues:');
      validation.issues.forEach(issue => {
        const prefix = issue.type === 'error' ? '❌' : '⚠️';
        console.log(`${prefix} ${issue.message}`);
      });
      console.log('');
    }
    
    if (validation.suggestions && validation.suggestions.length > 0) {
      console.log('Suggestions:');
      validation.suggestions.forEach(suggestion => {
        console.log(`💡 ${suggestion}`);
      });
      console.log('');
    }
    
    console.log('=========================================\n');
  }
}

export default CommitMsgHook;