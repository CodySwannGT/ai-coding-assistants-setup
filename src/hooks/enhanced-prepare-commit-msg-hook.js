/**
 * Enhanced Prepare Commit Message Hook
 * 
 * Implements a prepare-commit-msg hook for Git that uses Claude to suggest
 * or generate commit messages based on staged changes. Built on the enhanced hook framework.
 */

import fs from 'fs-extra';
import path from 'path';
import { EnhancedBaseHook } from './enhanced-base-hook.js';
import { HookLifecycle, HookResultStatus } from './hook-interfaces.js';

class EnhancedPrepareCommitMsgHook extends EnhancedBaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Claude Enhanced Commit Message Generator',
      description: 'Uses Claude to suggest or generate commit messages based on staged changes',
      gitHookName: 'prepare-commit-msg'
    });
    
    // Additional configuration specific to prepare-commit-msg
    this.mode = config.mode || 'suggest'; // 'suggest' or 'insert'
    this.conventionalCommits = config.conventionalCommits !== false; // Use conventional commits format by default
    this.includeScope = config.includeScope !== false; // Include scope in conventional commits by default
    this.includeBreaking = config.includeBreaking !== false; // Check for breaking changes by default
    this.messageStyle = config.messageStyle || 'detailed'; // 'concise' or 'detailed'
    this.maxDiffSize = config.maxDiffSize || 50000; // Maximum diff size to process
    this.skipEmptyCommits = config.skipEmptyCommits !== false; // Skip processing empty commits by default
    this.skipMergeCommits = config.skipMergeCommits !== false; // Skip processing merge commits by default
    this.aiModel = config.aiModel || 'claude-3-haiku-20240307'; // Use a faster model by default

    // Override the config schema for this specific hook
    this.configSchema = {
      properties: {
        ...this.configSchema.properties,
        mode: { type: 'string', enum: ['suggest', 'insert'] },
        conventionalCommits: { type: 'boolean' },
        includeScope: { type: 'boolean' },
        includeBreaking: { type: 'boolean' },
        messageStyle: { type: 'string', enum: ['concise', 'detailed'] },
        maxDiffSize: { type: 'number' },
        skipEmptyCommits: { type: 'boolean' },
        skipMergeCommits: { type: 'boolean' },
        aiModel: { type: 'string' }
      },
      required: [...this.configSchema.required],
      defaults: {
        ...this.configSchema.defaults,
        mode: 'suggest',
        conventionalCommits: true,
        includeScope: true,
        includeBreaking: true,
        messageStyle: 'detailed',
        maxDiffSize: 50000,
        skipEmptyCommits: true,
        skipMergeCommits: true,
        aiModel: 'claude-3-haiku-20240307'
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

# Check if this is a merge commit or a commit with a message template
COMMIT_SOURCE="$2"
if [ "$COMMIT_SOURCE" = "merge" ] && [ "${this.skipMergeCommits}" = "true" ]; then
  exit 0
fi

# Check if any files are staged
if [ -z "$(git diff --cached --name-only)" ] && [ "${this.skipEmptyCommits}" = "true" ]; then
  echo "No files staged for commit, skipping ${this.name} hook"
  exit 0
fi

# Run the hook script
npx ai-coding-assistants-setup claude-hook-runner enhanced-prepare-commit-msg --non-interactive "$@"
exit $?
`;
  }

  /**
   * Before execution middleware
   * @param {Object} context Hook execution context
   * @param {Function} next Next middleware function
   */
  async beforeExecutionMiddleware(context, _next) {
    this.info('Preparing to process commit message...');
    
    // Ensure prompt templates are available
    await this.createPromptTemplate();
    await this.loadPromptTemplates();
    
    // Check if Claude is available - this is set on the base hook class
    if (this.claudeAvailable === null) {
      await this.checkClaudeAvailability();
    }
    
    // Add hook-specific context properties
    context.commitMsgFile = context.args[0];
    context.commitSource = context.args[1] || '';
    context.commitSha = context.args[2] || '';
    
    if (!context.commitMsgFile) {
      this.error('No commit message file provided');
      context.result = {
        status: HookResultStatus.ERROR,
        message: 'No commit message file provided',
        data: {},
        shouldBlock: false,
        issues: [{
          severity: 'high',
          description: 'No commit message file provided',
          file: '',
          line: ''
        }]
      };
      return; // Skip to next middleware
    }
    
    // Check if this is a merge commit
    if (context.commitSource === 'merge' && this.skipMergeCommits) {
      this.info(`Skipping ${this.name} for merge commit`);
      context.result = {
        status: HookResultStatus.SKIPPED,
        message: 'Merge commit detected, skipping hook execution',
        data: { commitSource: context.commitSource },
        shouldBlock: false,
        issues: []
      };
      return; // Skip to next middleware
    }
    
    // Check if this is a commit with a message template
    if (context.commitSource === 'template' && this.skipTemplateCommits) {
      this.info(`Skipping ${this.name} for commit with message template`);
      context.result = {
        status: HookResultStatus.SKIPPED,
        message: 'Commit with message template detected, skipping hook execution',
        data: { commitSource: context.commitSource },
        shouldBlock: false,
        issues: []
      };
      return; // Skip to next middleware
    }
    
    // Read the existing commit message
    try {
      context.existingMessage = await this.getCommitMessage(context.commitMsgFile);
    } catch (err) {
      this.error(`Failed to read commit message file: ${err.message}`);
      context.result = {
        status: HookResultStatus.ERROR,
        message: `Failed to read commit message file: ${err.message}`,
        data: {},
        shouldBlock: false,
        issues: [{
          severity: 'high',
          description: `Failed to read commit message file: ${err.message}`,
          file: context.commitMsgFile,
          line: ''
        }]
      };
      return; // Skip to next middleware
    }
    
    // Skip if the commit message is not empty and not a comment (in suggest mode)
    const nonCommentLines = context.existingMessage.split('\n')
      .filter(line => !line.startsWith('#') && line.trim() !== '');
    
    if (nonCommentLines.length > 0 && this.mode === 'suggest') {
      this.info('Commit message already exists, skipping generation');
      context.result = {
        status: HookResultStatus.SKIPPED,
        message: 'Commit message already exists, skipping generation',
        data: { existingMessage: context.existingMessage },
        shouldBlock: false,
        issues: []
      };
      return; // Skip to next middleware
    }
    
    // Get staged files
    context.stagedFiles = await this.getStagedFiles();
    if (context.stagedFiles.length === 0 && this.skipEmptyCommits) {
      this.info('No files staged for commit, skipping message generation');
      context.result = {
        status: HookResultStatus.SKIPPED,
        message: 'No files staged for commit, skipping message generation',
        data: {},
        shouldBlock: false,
        issues: []
      };
      return; // Skip to next middleware
    }
    
    // Get the diff of staged changes
    context.diff = await this.getStagedDiff();
    if ((!context.diff || context.diff.length === 0) && this.skipEmptyCommits) {
      this.info('No changes in staged files, skipping message generation');
      context.result = {
        status: HookResultStatus.SKIPPED,
        message: 'No changes in staged files, skipping message generation',
        data: {},
        shouldBlock: false,
        issues: []
      };
      return; // Skip to next middleware
    }
    
    // Check if the diff is too large
    if (context.diff.length > this.maxDiffSize) {
      this.warn(`Diff too large (${context.diff.length} bytes), skipping message generation`);
      context.result = {
        status: HookResultStatus.SKIPPED,
        message: `Diff too large (${context.diff.length} bytes), skipping message generation`,
        data: { diffSize: context.diff.length, maxDiffSize: this.maxDiffSize },
        shouldBlock: false,
        issues: [{
          severity: 'medium',
          description: `Diff too large (${context.diff.length} bytes), max size is ${this.maxDiffSize}`,
          file: '',
          line: ''
        }]
      };
      return; // Skip to next middleware
    }
  }

  /**
   * Execution middleware - generates the commit message
   * @param {Object} context Hook execution context
   * @param {Function} next Next middleware function
   */
  async executionMiddleware(context, _next) {
    // Skip if we already have a result (e.g., due to early exit in before execution)
    if (context.result) {
      return; // Skip to next middleware
    }
    
    try {
      // Generate commit message with Claude
      this.info('Generating commit message...');
      context.generatedMessage = await this.generateCommitMessage(context.diff, context.stagedFiles);
      
      // Apply the generated message
      if (this.mode === 'insert') {
        // Insert mode: Replace the existing message with the generated one
        await this.setCommitMessage(context.commitMsgFile, context.generatedMessage);
        this.success('Commit message inserted');
        
        context.result = {
          status: HookResultStatus.SUCCESS,
          message: 'Commit message generated and inserted',
          data: { generatedMessage: context.generatedMessage },
          shouldBlock: false,
          issues: []
        };
      } else {
        // Suggest mode: Show the suggested message but don't modify the file
        console.log('\n=== Claude Suggested Commit Message ===\n');
        console.log(context.generatedMessage);
        console.log('\n=======================================\n');
        
        // Add the suggested message as a comment at the end of the file
        const commentedMessage = context.generatedMessage.split('\n')
          .map(line => `# Suggested by Claude: ${line}`)
          .join('\n');
        
        await fs.appendFile(context.commitMsgFile, `\n\n${commentedMessage}`);
        this.success('Commit message suggestion added as comment');
        
        context.result = {
          status: HookResultStatus.SUCCESS,
          message: 'Commit message suggestion added as comment',
          data: { generatedMessage: context.generatedMessage },
          shouldBlock: false,
          issues: []
        };
      }
    } catch (err) {
      this.error(`Failed to generate commit message: ${err.message}`);
      
      // Set error result
      context.error = err;
      context.result = {
        status: HookResultStatus.ERROR,
        message: `Failed to generate commit message: ${err.message}`,
        data: {},
        shouldBlock: false,
        issues: [{
          severity: 'high',
          description: `Failed to generate commit message: ${err.message}`,
          file: '',
          line: ''
        }]
      };
      
      // In case of failure, don't block the commit
      if (this.blockingMode === 'block') {
        this.warn('Blocking mode is enabled, but allowing commit to proceed despite error');
      }
    }
  }

  /**
   * After execution middleware
   * @param {Object} context Hook execution context
   * @param {Function} next Next middleware function
   */
  async afterExecutionMiddleware(context, _next) {
    // Emit event with the result
    this.emit('prepare-commit-msg:complete', {
      result: context.result,
      commitMsgFile: context.commitMsgFile,
      stagedFiles: context.stagedFiles
    });
    
    // Log information about the execution
    if (context.result.status === HookResultStatus.SUCCESS) {
      this.info(`Hook ${this.name} completed successfully`);
    } else if (context.result.status === HookResultStatus.SKIPPED) {
      this.info(`Hook ${this.name} execution was skipped: ${context.result.message}`);
    } else {
      this.warn(`Hook ${this.name} completed with status: ${context.result.status}`);
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
    this.emit('prepare-commit-msg:error', {
      error: context.error,
      commitMsgFile: context.commitMsgFile
    });
    
    // Don't block the commit process in case of hook failure
    if (context.result && context.result.shouldBlock) {
      context.result.shouldBlock = false;
      this.warn('Error occurred, but allowing commit to proceed');
    }
  }

  /**
   * Generate commit message with Claude
   * @param {string} diff Git diff to generate message from
   * @param {Array<string>} files List of staged files
   * @returns {Promise<string>} Generated commit message
   */
  async generateCommitMessage(diff, files) {
    // Check if Claude is available
    if (this.claudeAvailable === null) {
      await this.checkClaudeAvailability();
    }

    if (!this.claudeAvailable) {
      return this.generateFallbackCommitMessage(diff, files);
    }

    // Load prompt templates if not loaded yet
    if (Object.keys(this.promptTemplates).length === 0) {
      await this.loadPromptTemplates();
    }

    // Create variables for prompt template
    const variables = {
      diff: diff,
      files: files.join('\n'),
      conventionalCommits: this.conventionalCommits ? 'true' : 'false',
      includeScope: this.includeScope ? 'true' : 'false',
      includeBreaking: this.includeBreaking ? 'true' : 'false',
      messageStyle: this.messageStyle
    };

    // Get the appropriate prompt
    const prompt = this.formatPrompt('commit-message', variables);

    try {
      // Call Claude API with caching for efficiency
      const response = await this.callClaudeApi({
        prompt,
        model: this.aiModel,
        maxTokens: 1000,
        temperature: 0.7,
        cacheResponse: true // Cache responses to avoid duplicate API calls
      });

      // Extract the message from the response
      const message = response.content[0]?.text || '';

      // Try to find the commit message in the response
      const messageMatch = message.match(/```[a-z]*\n([\s\S]*?)```/) ||
                          message.match(/```([\s\S]*?)```/) ||
                          { index: 0, '1': message };

      return messageMatch[1].trim();
    } catch (err) {
      this.error(`Failed to generate commit message with Claude: ${err.message}`);
      return this.generateFallbackCommitMessage(diff, files);
    }
  }

  /**
   * Generate a fallback commit message without Claude
   * @param {string} diff Git diff to generate message from
   * @param {Array<string>} files List of staged files
   * @returns {string} Generated commit message
   */
  generateFallbackCommitMessage(diff, files) {
    this.info('Using fallback commit message generation');

    // Try to determine the type of change
    let type = 'chore';
    let scope = '';

    // Look for patterns in the files and diff to determine type
    const fileString = files.join(' ');
    if (fileString.includes('test') || diff.includes('test(') || diff.includes('describe(')) {
      type = 'test';
    } else if (fileString.includes('docs') || fileString.endsWith('.md')) {
      type = 'docs';
    } else if (diff.includes('new') || diff.includes('function') || diff.includes('class') || diff.includes('export')) {
      type = 'feat';
    } else if (diff.includes('fix') || diff.includes('bug') || diff.includes('issue')) {
      type = 'fix';
    } else if (diff.includes('style') || diff.includes('css') || diff.includes('format')) {
      type = 'style';
    }

    // Try to determine scope from file paths
    if (files.length === 1) {
      const fileParts = files[0].split('/');
      if (fileParts.length > 1) {
        scope = fileParts[0];
      }
    } else if (files.length > 0) {
      // Check if all files are in the same directory
      const firstDir = files[0].split('/')[0];
      const allSameDir = files.every(file => file.startsWith(firstDir + '/'));
      if (allSameDir) {
        scope = firstDir;
      }
    }

    // Format the commit message
    if (this.conventionalCommits) {
      const scopePart = scope && this.includeScope ? `(${scope})` : '';
      return `${type}${scopePart}: update ${files.length} ${files.length === 1 ? 'file' : 'files'}`;
    } else {
      return `Update ${files.length} ${files.length === 1 ? 'file' : 'files'}`;
    }
  }

  /**
   * Get a fallback prompt template for commit message generation
   * @param {string} templateName The template name
   * @param {Object} variables Variables for the template
   * @returns {string} The fallback prompt
   */
  getFallbackPrompt(templateName, variables) {
    if (templateName === 'commit-message') {
      const conventionalFormat = variables.conventionalCommits === 'true'
        ? `Use the Conventional Commits format:
<type>${variables.includeScope === 'true' ? '(<scope>)' : ''}: <description>

${variables.messageStyle === 'detailed' ? '[optional body]' : ''}
${variables.includeBreaking === 'true' ? '[optional BREAKING CHANGE: <description>]' : ''}

Valid types include: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert`
        : '';

      const styleGuidance = variables.messageStyle === 'concise'
        ? 'Keep the message concise, focusing on the "what" and "why" in a single line.'
        : 'Include a concise subject line followed by a more detailed body explaining the "what" and "why" of the changes.';

      return `You are an expert developer tasked with creating a meaningful Git commit message for the following changes.

${conventionalFormat}

Style guidance:
- ${styleGuidance}
- Use imperative mood (e.g., "Add feature" not "Added feature")
- Don't end the subject line with a period
- Start with a capital letter
- Focus on the purpose of the change, not just what was changed
- Mention relevant components or areas of the codebase

# Files changed:
${variables.files}

# Git Diff:
\`\`\`diff
${variables.diff}
\`\`\`

Reply with ONLY the commit message, properly formatted, without any additional explanation or markdown formatting. Only the text that should appear in the commit message.`;
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
        'commit-message': `You are an expert developer tasked with creating a meaningful Git commit message for the following changes.

{{#if conventionalCommits == 'true'}}
Use the Conventional Commits format:
<type>{{#if includeScope == 'true'}}(<scope>){{/if}}: <description>

{{#if messageStyle == 'detailed'}}[optional body]{{/if}}
{{#if includeBreaking == 'true'}}[optional BREAKING CHANGE: <description>]{{/if}}

Valid types include: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
{{/if}}

Style guidance:
{{#if messageStyle == 'concise'}}
- Keep the message concise, focusing on the "what" and "why" in a single line.
{{else}}
- Include a concise subject line followed by a more detailed body explaining the "what" and "why" of the changes.
{{/if}}
- Use imperative mood (e.g., "Add feature" not "Added feature")
- Don't end the subject line with a period
- Start with a capital letter
- Focus on the purpose of the change, not just what was changed
- Mention relevant components or areas of the codebase

# Files changed:
{{files}}

# Git Diff:
\`\`\`diff
{{diff}}
\`\`\`

Reply with ONLY the commit message, properly formatted, without any additional explanation or markdown formatting. Only the text that should appear in the commit message.`
      };

      // Write template file
      await fs.writeJson(templatePath, templates, { spaces: 2 });
      this.debug(`Created prompt template file at ${templatePath}`);
    } catch (err) {
      this.debug(`Failed to create prompt template file: ${err.message}`);
    }
  }
}

export default EnhancedPrepareCommitMsgHook;