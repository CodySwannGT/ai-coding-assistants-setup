/**
 * Enhanced Commit Message Hook
 * 
 * Implements a commit-msg hook for Git that uses Claude to validate
 * commit message structure and content against configurable rules.
 * Built on the enhanced hook framework.
 */

import fs from 'fs-extra';
import path from 'path';
import { EnhancedBaseHook } from './enhanced-base-hook.js';
import { HookLifecycle, HookResultStatus } from './hook-interfaces.js';

class EnhancedCommitMsgHook extends EnhancedBaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Claude Enhanced Commit Message Validator',
      description: 'Uses Claude to validate commit message structure and content',
      gitHookName: 'commit-msg'
    });

    // Additional configuration specific to commit-msg
    this.blockingMode = config.blockingMode || 'warn'; // 'block', 'warn', or 'none'
    this.conventionalCommits = config.conventionalCommits !== false; // Check for conventional commits format by default
    this.checkSpelling = config.checkSpelling !== false; // Check for spelling errors by default
    this.checkGrammar = config.checkGrammar !== false; // Check for grammar errors by default
    this.maxLength = config.maxLength || { subject: 72, body: 100 }; // Maximum lengths for subject and body
    this.suggestImprovements = config.suggestImprovements !== false; // Suggest improvements by default
    this.aiModel = config.aiModel || 'claude-3-haiku-20240307'; // Use a faster model by default
    this.autoFix = config.autoFix || false; // Whether to automatically fix issues
    this.fixableIssues = config.fixableIssues || ['spelling', 'grammar', 'style']; // Issues that can be auto-fixed

    // Override the config schema for this specific hook
    this.configSchema = {
      properties: {
        ...this.configSchema.properties,
        conventionalCommits: { type: 'boolean' },
        checkSpelling: { type: 'boolean' },
        checkGrammar: { type: 'boolean' },
        maxLength: { 
          type: 'object',
          properties: {
            subject: { type: 'number' },
            body: { type: 'number' }
          }
        },
        suggestImprovements: { type: 'boolean' },
        aiModel: { type: 'string' },
        autoFix: { type: 'boolean' },
        fixableIssues: { 
          type: 'array',
          items: { type: 'string', enum: ['spelling', 'grammar', 'style', 'format'] }
        }
      },
      required: [...this.configSchema.required],
      defaults: {
        ...this.configSchema.defaults,
        conventionalCommits: true,
        checkSpelling: true,
        checkGrammar: true,
        maxLength: { subject: 72, body: 100 },
        suggestImprovements: true,
        aiModel: 'claude-3-haiku-20240307',
        autoFix: false,
        fixableIssues: ['spelling', 'grammar', 'style']
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

# Validate commit message with commitlint
npx --no -- commitlint --edit ${1}

# Run the enhanced Claude hook to validate commit message
npx ai-coding-assistants-setup claude-hook-runner enhanced-commit-msg --non-interactive "$@"
exit $?
`;
  }

  /**
   * Before execution middleware
   * @param {Object} context Hook execution context
   * @param {Function} next Next middleware function
   */
  async beforeExecutionMiddleware(context, _next) {
    this.info('Preparing to validate commit message...');
    
    // Ensure prompt templates are available
    await this.createPromptTemplate();
    await this.loadPromptTemplates();
    
    // Check if Claude is available - this is set on the base hook class
    if (this.claudeAvailable === null) {
      await this.checkClaudeAvailability();
    }
    
    // Add hook-specific context properties
    context.commitMsgFile = context.args[0];
    
    if (!context.commitMsgFile) {
      this.error('No commit message file provided');
      context.result = {
        status: HookResultStatus.ERROR,
        message: 'No commit message file provided',
        data: {},
        shouldBlock: this.blockingMode === 'block',
        issues: [{
          severity: 'high',
          description: 'No commit message file provided',
          file: '',
          line: ''
        }]
      };
      return; // Skip to next middleware
    }
    
    // Read the commit message
    try {
      context.commitMessage = await this.getCommitMessage(context.commitMsgFile);
    } catch (err) {
      this.error(`Failed to read commit message file: ${err.message}`);
      context.result = {
        status: HookResultStatus.ERROR,
        message: `Failed to read commit message file: ${err.message}`,
        data: {},
        shouldBlock: this.blockingMode === 'block',
        issues: [{
          severity: 'high',
          description: `Failed to read commit message file: ${err.message}`,
          file: context.commitMsgFile,
          line: ''
        }]
      };
      return; // Skip to next middleware
    }
    
    // Remove comment lines from the commit message
    context.cleanMessage = context.commitMessage.split('\n')
      .filter(line => !line.startsWith('#'))
      .join('\n')
      .trim();
    
    // Skip if the commit message is empty
    if (!context.cleanMessage) {
      this.error('Empty commit message, please provide a message');
      context.result = {
        status: HookResultStatus.ERROR,
        message: 'Empty commit message, please provide a message',
        data: {},
        shouldBlock: this.blockingMode === 'block',
        issues: [{
          severity: 'high',
          description: 'Empty commit message, please provide a message',
          file: context.commitMsgFile,
          line: ''
        }]
      };
      return; // Skip to next middleware
    }

    // Store original message for comparison if auto-fix is enabled
    context.originalMessage = context.cleanMessage;
  }

  /**
   * Execution middleware - validates the commit message
   * @param {Object} context Hook execution context
   * @param {Function} next Next middleware function
   */
  async executionMiddleware(context, _next) {
    // Skip if we already have a result (e.g., due to early exit in before execution)
    if (context.result) {
      return; // Skip to next middleware
    }
    
    try {
      // Validate the commit message with Claude
      this.info('Validating commit message...');
      context.validation = await this.validateCommitMessage(context.cleanMessage);
      
      // Display the validation results
      this.outputValidationResults(context.validation);
      
      // Auto-fix issues if enabled and there are fixable issues
      if (this.autoFix && !context.validation.valid) {
        const fixableIssuesFound = context.validation.issues.some(issue => 
          issue.fixable && this.fixableIssues.includes(issue.type)
        );
        
        if (fixableIssuesFound) {
          this.info('Auto-fixing commit message issues...');
          context.fixedMessage = await this.fixCommitMessage(context.cleanMessage, context.validation);
          
          // Apply the fixed message if it's different from the original
          if (context.fixedMessage && context.fixedMessage !== context.originalMessage) {
            await this.setCommitMessage(context.commitMsgFile, context.fixedMessage);
            this.success('Commit message issues auto-fixed');
            
            // Re-validate the fixed message
            const revalidation = await this.validateCommitMessage(context.fixedMessage);
            
            // Update the validation result
            context.validation = revalidation;
            this.info('Re-validating fixed commit message...');
            this.outputValidationResults(revalidation);
          } else {
            this.info('No auto-fixable issues found or no changes needed');
          }
        }
      }
      
      // Handle blocking based on validation result
      if (this.blockingMode === 'block' && !context.validation.valid) {
        this.error('Commit message validation failed, blocking commit');
        this.info('You can edit your commit message or bypass this hook with git commit --no-verify');
        
        context.result = {
          status: HookResultStatus.ERROR,
          message: 'Commit message validation failed, blocking commit',
          data: { validation: context.validation },
          shouldBlock: true,
          issues: context.validation.issues.map(issue => ({
            severity: issue.type === 'error' ? 'high' : 'medium',
            description: issue.message,
            file: context.commitMsgFile,
            line: ''
          }))
        };
      } else {
        // Success or warning result
        context.result = {
          status: context.validation.valid ? HookResultStatus.SUCCESS : HookResultStatus.WARNING,
          message: context.validation.valid ? 'Commit message validation passed' : 'Commit message has issues but commit is allowed',
          data: { validation: context.validation },
          shouldBlock: false,
          issues: context.validation.issues.map(issue => ({
            severity: issue.type === 'error' ? 'high' : 'medium',
            description: issue.message,
            file: context.commitMsgFile,
            line: ''
          }))
        };
      }
    } catch (err) {
      this.error(`Failed to validate commit message: ${err.message}`);
      
      // Set error result
      context.error = err;
      context.result = {
        status: HookResultStatus.ERROR,
        message: `Failed to validate commit message: ${err.message}`,
        data: {},
        shouldBlock: this.blockingMode === 'block',
        issues: [{
          severity: 'high',
          description: `Failed to validate commit message: ${err.message}`,
          file: context.commitMsgFile,
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
    // Emit event with the result
    this.emit('commit-msg:complete', {
      result: context.result,
      commitMsgFile: context.commitMsgFile,
      validation: context.validation
    });
    
    // Log information about the execution
    if (context.result.status === HookResultStatus.SUCCESS) {
      this.info(`Hook ${this.name} completed successfully`);
    } else if (context.result.status === HookResultStatus.WARNING) {
      this.warn(`Hook ${this.name} completed with warnings`);
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
    this.emit('commit-msg:error', {
      error: context.error,
      commitMsgFile: context.commitMsgFile
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
      checkGrammar: this.checkGrammar ? 'true' : 'false',
      autoFix: this.autoFix ? 'true' : 'false'
    };

    // Get the appropriate prompt
    const prompt = this.formatPrompt('commit-message-validation', variables);

    try {
      // Call Claude API with caching for efficiency
      const response = await this.callClaudeApi({
        prompt,
        model: this.aiModel,
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
   * Fix commit message issues using Claude
   * @param {string} message Original commit message
   * @param {Object} validation Validation results
   * @returns {Promise<string>} Fixed commit message
   */
  async fixCommitMessage(message, validation) {
    // Skip if no issues or Claude is not available
    if (validation.valid || !this.claudeAvailable) {
      return message;
    }

    // Check if there are fixable issues
    const fixableIssues = validation.issues.filter(issue => 
      issue.fixable && this.fixableIssues.includes(issue.type)
    );

    if (fixableIssues.length === 0) {
      return message;
    }

    // Prepare the prompt for fixing
    const variables = {
      message: message,
      issues: JSON.stringify(fixableIssues),
      conventionalCommits: this.conventionalCommits ? 'true' : 'false',
      maxSubjectLength: this.maxLength.subject,
      maxBodyLength: this.maxLength.body
    };

    // Get the appropriate prompt
    const prompt = this.formatPrompt('commit-message-fix', variables);

    try {
      // Call Claude API with caching for efficiency
      const response = await this.callClaudeApi({
        prompt,
        model: this.aiModel,
        maxTokens: 1000,
        temperature: 0.2, // Lower temperature for more consistent responses
        cacheResponse: true // Cache responses to avoid duplicate API calls
      });

      // Extract the fixed message from the response
      const content = response.content[0]?.text || '';
      
      // Try to find the fixed message in the response
      const messageMatch = content.match(/```[a-z]*\n([\s\S]*?)```/) ||
                          content.match(/```([\s\S]*?)```/) ||
                          { index: 0, '1': content };

      return messageMatch[1].trim();
    } catch (err) {
      this.error(`Failed to fix commit message with Claude: ${err.message}`);
      return message; // Return original message on error
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
        message: `Subject line is too long (${subject.length} chars, max ${this.maxLength.subject})`,
        fixable: true
      });
      suggestions.push(`Shorten the subject line to ${this.maxLength.subject} characters or less`);
      valid = false;
    }

    // Check if subject starts with capital letter
    if (subject && /^[a-z]/.test(subject)) {
      issues.push({
        type: 'warning',
        message: 'Subject line should start with a capital letter',
        fixable: true
      });
      suggestions.push('Capitalize the first letter of the subject line');
    }

    // Check if subject ends with period
    if (subject && subject.endsWith('.')) {
      issues.push({
        type: 'warning',
        message: 'Subject line should not end with a period',
        fixable: true
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
          message: `${longLines.length} line(s) in the message body exceed ${this.maxLength.body} characters`,
          fixable: true
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
          message: 'Subject does not follow Conventional Commits format',
          fixable: true
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
          message: 'Claude response could not be parsed as JSON',
          fixable: false
        }],
        suggestions: ['Consider running validation again']
      };
    } catch (err) {
      this.error(`Failed to parse Claude validation response: ${err.message}`);
      return {
        valid: true, // Default to valid in case of parsing failure
        issues: [{
          type: 'warning',
          message: `Failed to parse Claude validation response: ${err.message}`,
          fixable: false
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
        const fixable = issue.fixable ? ' (fixable)' : '';
        console.log(`${prefix} ${issue.message}${fixable}`);
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
      "message": "Description of the issue",
      "fixable": true/false
    }
  ],
  "suggestions": [
    "Suggestion for improvement"
  ]
}
\`\`\`

Return ONLY the JSON with no additional explanation.`;
    } else if (templateName === 'commit-message-fix') {
      return `You are an expert developer tasked with fixing issues in a Git commit message.

The original commit message is:
\`\`\`
${variables.message}
\`\`\`

The issues that need to be fixed are:
${variables.issues}

Please fix these issues while following these guidelines:
${variables.conventionalCommits === 'true' ? '- Follow the Conventional Commits format' : ''}
- Subject should be less than ${variables.maxSubjectLength} characters
- Subject should be in imperative mood (e.g., "Add feature" not "Added feature")
- Subject should not end with a period
- Subject should start with a capital letter
- Body lines should be less than ${variables.maxBodyLength} characters
- Keep the original meaning of the message
- Make minimal changes needed to fix the issues

Return ONLY the fixed commit message with no explanation or markdown formatting.`;
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

{{#if autoFix == 'true'}}
For each issue, indicate whether it is automatically fixable by including a "fixable" boolean field.
{{/if}}

Format your response as JSON with the following structure:
\`\`\`json
{
  "valid": true/false,
  "issues": [
    {
      "type": "error/warning",
      "message": "Description of the issue"{{#if autoFix == 'true'}},
      "fixable": true/false{{/if}}
    }
  ],
  "suggestions": [
    "Suggestion for improvement"
  ]
}
\`\`\`

Return ONLY the JSON with no additional explanation.`,

        'commit-message-fix': `You are an expert developer tasked with fixing issues in a Git commit message.

The original commit message is:
\`\`\`
{{message}}
\`\`\`

The issues that need to be fixed are:
{{issues}}

Please fix these issues while following these guidelines:
{{#if conventionalCommits == 'true'}}- Follow the Conventional Commits format{{/if}}
- Subject should be less than {{maxSubjectLength}} characters
- Subject should be in imperative mood (e.g., "Add feature" not "Added feature")
- Subject should not end with a period
- Subject should start with a capital letter
- Body lines should be less than {{maxBodyLength}} characters
- Keep the original meaning of the message
- Make minimal changes needed to fix the issues

Return ONLY the fixed commit message with no explanation or markdown formatting.`
      };

      // Write template file
      await fs.writeJson(templatePath, templates, { spaces: 2 });
      this.debug(`Created prompt template file at ${templatePath}`);
    } catch (err) {
      this.debug(`Failed to create prompt template file: ${err.message}`);
    }
  }
}

export default EnhancedCommitMsgHook;