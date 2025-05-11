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
    this.blockingMode = config.blockingMode || 'warn'; // 'block', 'warn', or 'none'
    this.conventionalCommits = config.conventionalCommits !== false; // Check for conventional commits format
    this.checkSpelling = config.checkSpelling !== false; // Check for spelling errors
    this.checkGrammar = config.checkGrammar !== false; // Check for grammar errors
    this.maxLength = config.maxLength || { subject: 72, body: 100 }; // Maximum lengths for subject and body
    this.suggestImprovements = config.suggestImprovements !== false; // Suggest improvements
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
      // Check if hook should execute
      if (!await this.shouldExecute()) {
        this.debug('Skipping commit-msg hook execution based on configuration');
        process.exit(0);
      }

      // Ensure prompt templates are available
      await this.createPromptTemplate();
      await this.loadPromptTemplates();

      // Get the commit message file path from args
      const commitMsgFile = args[0];
      if (!commitMsgFile) {
        this.error('No commit message file provided');
        process.exit(1);
      }

      // Read the commit message
      let commitMessage = '';
      try {
        commitMessage = await this.getCommitMessage(commitMsgFile);
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
      this.info('Validating commit message...');
      const validation = await this.validateCommitMessage(commitMessage);

      // Display the validation results
      this.outputValidationResults(validation);

      // Handle blocking based on validation result
      if (this.blockingMode === 'block' && !validation.valid) {
        this.error('Commit message validation failed, blocking commit');
        this.info('You can edit your commit message or bypass this hook with git commit --no-verify');
        process.exit(1);
      }
    } catch (err) {
      this.error(`Failed to execute commit-msg hook: ${err.message}`);

      // Handle hook failure based on blocking mode
      if (this.blockingMode === 'block') {
        this.error('Blocking mode enabled, blocking commit due to hook failure');
        process.exit(1);
      } else {
        this.warn('Allowing commit to proceed despite hook failure');
        process.exit(0);
      }
    }
  }

  /**
   * Check if hook should execute
   * @returns {Promise<boolean>} Whether hook should execute
   */
  async shouldExecute() {
    // Skip if hook is disabled
    if (!this.enabled) {
      return false;
    }

    // Skip if environment variable is set to skip
    if (process.env.CLAUDE_SKIP_COMMIT_MSG === 'true') {
      this.debug('Skipping commit-msg hook due to CLAUDE_SKIP_COMMIT_MSG environment variable');
      return false;
    }

    return true;
  }

  /**
   * Validate commit message with Claude
   * @param {string} message Commit message to validate
   * @returns {Promise<Object>} Validation results
   */
  async validateCommitMessage(message) {
    // Check if Claude is available
    if (this.claudeAvailable === null) {
      await this.checkClaudeAvailability();
    }

    if (!this.claudeAvailable) {
      return this.validateCommitMessageFallback(message);
    }

    // Load prompt templates if not loaded yet
    if (Object.keys(this.promptTemplates).length === 0) {
      await this.loadPromptTemplates();
    }

    // Create variables for prompt template
    const variables = {
      message: message,
      conventionalCommits: this.conventionalCommits ? 'true' : 'false',
      maxSubjectLength: this.maxLength.subject,
      maxBodyLength: this.maxLength.body,
      checkSpelling: this.checkSpelling ? 'true' : 'false',
      checkGrammar: this.checkGrammar ? 'true' : 'false'
    };

    // Get the appropriate prompt
    const prompt = this.formatPrompt('commit-message-validation', variables);

    try {
      // Call Claude API with caching for efficiency
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-haiku-20240307', // Use a faster model for message validation
        maxTokens: 1000,
        temperature: 0.2, // Lower temperature for more consistent responses
        cacheResponse: true // Cache responses to avoid duplicate API calls
      });

      // Parse the response
      return this.parseValidationResponse(response);
    } catch (err) {
      this.error(`Failed to validate commit message with Claude: ${err.message}`);
      return this.validateCommitMessageFallback(message);
    }
  }

  /**
   * Fallback method to validate commit message without Claude
   * @param {string} message Commit message to validate
   * @returns {Promise<Object>} Validation results
   */
  async validateCommitMessageFallback(message) {
    this.info('Using fallback commit message validation');

    const issues = [];
    const suggestions = [];
    let valid = true;

    // Split into subject and body
    const lines = message.split('\n');
    const subject = lines[0] || '';
    const body = lines.slice(1).join('\n').trim();

    // Check subject length
    if (subject.length > this.maxLength.subject) {
      issues.push({
        type: 'error',
        message: `Subject line is too long (${subject.length} chars, max ${this.maxLength.subject})`
      });
      suggestions.push(`Shorten the subject line to ${this.maxLength.subject} characters or less`);
      valid = false;
    }

    // Check if subject starts with capital letter
    if (subject && /^[a-z]/.test(subject)) {
      issues.push({
        type: 'warning',
        message: 'Subject line should start with a capital letter'
      });
      suggestions.push('Capitalize the first letter of the subject line');
    }

    // Check if subject ends with period
    if (subject && subject.endsWith('.')) {
      issues.push({
        type: 'warning',
        message: 'Subject line should not end with a period'
      });
      suggestions.push('Remove the period at the end of the subject line');
    }

    // Check body line length
    if (body) {
      const bodyLines = body.split('\n');
      const longLines = bodyLines.filter(line => line.length > this.maxLength.body);

      if (longLines.length > 0) {
        issues.push({
          type: 'warning',
          message: `${longLines.length} line(s) in the message body exceed ${this.maxLength.body} characters`
        });
        suggestions.push(`Wrap body text at ${this.maxLength.body} characters`);
      }
    }

    // Check conventional commits format if enabled
    if (this.conventionalCommits) {
      const conventionalPattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9-_]+\))?!?: .+/i;

      if (!conventionalPattern.test(subject)) {
        issues.push({
          type: 'error',
          message: 'Subject does not follow Conventional Commits format'
        });
        suggestions.push('Use format: type(scope): description (e.g., feat(auth): add login endpoint)');
        valid = false;
      }
    }

    return {
      valid,
      issues,
      suggestions
    };
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
      } else if (message.includes('{') && message.includes('}')) {
        // Try to find just the JSON object in the response
        const startIdx = message.indexOf('{');
        const endIdx = message.lastIndexOf('}') + 1;
        if (startIdx >= 0 && endIdx > startIdx) {
          const jsonStr = message.substring(startIdx, endIdx);
          return JSON.parse(jsonStr);
        }
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

  /**
   * Get a fallback prompt template for commit message validation
   * @param {string} templateName The template name
   * @param {Object} variables Variables for the template
   * @returns {string} The fallback prompt
   */
  getFallbackPrompt(templateName, variables) {
    if (templateName === 'commit-message-validation') {
      const conventionalCommitsCheck = variables.conventionalCommits === 'true'
        ? `Check if the message follows the Conventional Commits format:
<type>[(scope)]: <description>

[body]

[footer(s)]

Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert`
        : '';

      return `You are an expert developer tasked with validating a Git commit message against best practices.

The commit message is:
\`\`\`
${variables.message}
\`\`\`

Please validate this commit message against the following criteria:

${conventionalCommitsCheck}

Rules:
- Subject should be less than ${variables.maxSubjectLength} characters
- Subject should be in imperative mood (e.g., "Add feature" not "Added feature")
- Subject should not end with a period
- Subject should start with a capital letter
- Body lines should be less than ${variables.maxBodyLength} characters
${variables.checkSpelling === 'true' ? '- No spelling errors' : ''}
${variables.checkGrammar === 'true' ? '- No grammar errors' : ''}
- Message should be clear and descriptive
- Message should focus on why the change was made, not just what was changed

Format your response as JSON with the following structure:
\`\`\`json
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
}
\`\`\`

Return ONLY the JSON with no additional explanation.`;
    }

    // Default fallback for unknown templates
    return super.getFallbackPrompt(templateName, variables);
  }

  /**
   * Create a prompt template file for this hook
   * @returns {Promise<void>}
   */
  async createPromptTemplate() {
    try {
      const templateDir = path.join(this.projectRoot, '.claude', 'templates');
      await fs.ensureDir(templateDir);

      const templatePath = path.join(templateDir, `${this.gitHookName}.json`);

      // Check if template already exists
      if (await fs.pathExists(templatePath)) {
        this.debug(`Prompt template file already exists at ${templatePath}`);
        return;
      }

      // Create default template
      const templates = {
        'commit-message-validation': `You are an expert developer tasked with validating a Git commit message against best practices.

The commit message is:
\`\`\`
{{message}}
\`\`\`

Please validate this commit message against the following criteria:

{{#if conventionalCommits == 'true'}}
Check if the message follows the Conventional Commits format:
<type>[(scope)]: <description>

[body]

[footer(s)]

Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
{{/if}}

Rules:
- Subject should be less than {{maxSubjectLength}} characters
- Subject should be in imperative mood (e.g., "Add feature" not "Added feature")
- Subject should not end with a period
- Subject should start with a capital letter
- Body lines should be less than {{maxBodyLength}} characters
{{#if checkSpelling == 'true'}}- No spelling errors{{/if}}
{{#if checkGrammar == 'true'}}- No grammar errors{{/if}}
- Message should be clear and descriptive
- Message should focus on why the change was made, not just what was changed

Format your response as JSON with the following structure:
\`\`\`json
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
}
\`\`\`

Return ONLY the JSON with no additional explanation.`
      };

      // Write template file
      await fs.writeJson(templatePath, templates, { spaces: 2 });
      this.debug(`Created prompt template file at ${templatePath}`);
    } catch (err) {
      this.debug(`Failed to create prompt template file: ${err.message}`);
    }
  }
}

export default CommitMsgHook;