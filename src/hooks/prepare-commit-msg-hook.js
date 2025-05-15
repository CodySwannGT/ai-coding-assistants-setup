/**
 * Prepare Commit Message Hook
 * 
 * Implements a prepare-commit-msg hook for Git that uses Claude to suggest
 * or generate commit messages based on staged changes.
 */

import fs from 'fs-extra';
import path from 'path';
import { BaseHook } from './base-hook.js';

class PrepareCommitMsgHook extends BaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Claude Commit Message Generator',
      description: 'Uses Claude to suggest or generate commit messages based on staged changes',
      gitHookName: 'prepare-commit-msg'
    });
    
    // Additional configuration specific to prepare-commit-msg
    this.mode = config.mode || 'suggest'; // 'suggest' or 'insert'
    this.conventionalCommits = config.conventionalCommits || true; // Use conventional commits format
    this.includeScope = config.includeScope || true; // Include scope in conventional commits
    this.includeBreaking = config.includeBreaking || true; // Check for breaking changes
    this.messageStyle = config.messageStyle || 'detailed'; // 'concise' or 'detailed'
    this.maxDiffSize = config.maxDiffSize || 50000; // Maximum diff size to process
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
if [ "$COMMIT_SOURCE" = "merge" ] || [ "$COMMIT_SOURCE" = "template" ]; then
  exit 0
fi

# Check if any files are staged
if [ -z "$(git diff --cached --name-only)" ]; then
  echo "No files staged for commit, skipping ${this.name} hook"
  exit 0
fi

# Run the Claude hook for prepare-commit-msg
npx ai-coding-assistants-setup claude-hook-runner prepare-commit-msg --non-interactive "$@"
exit $?
`;
  }

  /**
   * Execute the prepare-commit-msg hook logic
   * @param {Array<string>} args Command-line arguments
   * @returns {Promise<void>}
   */
  async execute(args) {
    this.info('Executing prepare-commit-msg hook...');

    try {
      // Check if hook should execute
      if (!await this.shouldExecute()) {
        this.debug('Skipping prepare-commit-msg hook execution based on configuration');
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

      // Get the commit source from args
      const commitSource = args[1] || '';

      // Skip for merge commits or commits with a message template
      if (commitSource === 'merge' || commitSource === 'template') {
        this.info(`Skipping ${this.name} for ${commitSource} commit`);
        process.exit(0);
      }

      // Read the existing commit message
      let existingMessage = await this.getCommitMessage(commitMsgFile);

      // Skip if the commit message is not empty and not a comment
      const nonCommentLines = existingMessage.split('\n')
        .filter(line => !line.startsWith('#') && line.trim() !== '');

      if (nonCommentLines.length > 0 && this.mode === 'suggest') {
        this.info('Commit message already exists, skipping generation');

        // In suggest mode, we don't modify the existing message
        process.exit(0);
      }

      // Get staged files
      const stagedFiles = await this.getStagedFiles();
      if (stagedFiles.length === 0) {
        this.info('No files staged for commit, skipping message generation');
        process.exit(0);
      }

      // Get the diff of staged changes
      const diff = await this.getStagedDiff();
      if (!diff || diff.length === 0) {
        this.info('No changes in staged files, skipping message generation');
        process.exit(0);
      }

      // Check if the diff is too large
      if (diff.length > this.maxDiffSize) {
        this.warn(`Diff too large (${diff.length} bytes), skipping message generation`);
        process.exit(0);
      }

      // Generate commit message with Claude
      this.info('Generating commit message...');
      const generatedMessage = await this.generateCommitMessage(diff, stagedFiles);

      // Apply the generated message
      if (this.mode === 'insert') {
        // Insert mode: Replace the existing message with the generated one
        await this.setCommitMessage(commitMsgFile, generatedMessage);
        this.success('Commit message inserted');
      } else {
        // Suggest mode: Show the suggested message but don't modify the file
        console.log('\n=== Claude Suggested Commit Message ===\n');
        console.log(generatedMessage);
        console.log('\n=======================================\n');

        // Add the suggested message as a comment at the end of the file
        const commentedMessage = generatedMessage.split('\n')
          .map(line => `# Suggested by Claude: ${line}`)
          .join('\n');

        await fs.appendFile(commitMsgFile, `\n\n${commentedMessage}`);
        this.success('Commit message suggestion added as comment');
      }
    } catch (err) {
      this.error(`Failed to execute prepare-commit-msg hook: ${err.message}`);
      // Don't block the commit process in case of hook failure
      process.exit(0);
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
    if (process.env.CLAUDE_SKIP_PREPARE_COMMIT_MSG === 'true') {
      this.debug('Skipping prepare-commit-msg hook due to CLAUDE_SKIP_PREPARE_COMMIT_MSG environment variable');
      return false;
    }

    return true;
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
        model: 'claude-3-haiku-20240307', // Use a faster model for commit messages
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

{{#if conventionalCommits}}
Use the Conventional Commits format:
<type>{{#if includeScope}}(<scope>){{/if}}: <description>

{{#if messageStyle == 'detailed'}}[optional body]{{/if}}
{{#if includeBreaking}}[optional BREAKING CHANGE: <description>]{{/if}}

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

export default PrepareCommitMsgHook;