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
    // Get the Node executable path
    const nodePath = process.execPath;
    
    // Get the script path - this will be installed in the project's bin directory
    const scriptPath = path.join(this.projectRoot, 'node_modules', '.bin', 'claude-hook-runner');
    
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

# Run the hook script
"${nodePath}" "${scriptPath}" prepare-commit-msg "$@"
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
      let existingMessage = '';
      try {
        existingMessage = await fs.readFile(commitMsgFile, 'utf8');
      } catch (err) {
        this.warn(`Failed to read commit message file: ${err.message}`);
      }
      
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
      const generatedMessage = await this.generateCommitMessage(diff, stagedFiles);
      
      // Apply the generated message
      if (this.mode === 'insert') {
        // Insert mode: Replace the existing message with the generated one
        await fs.writeFile(commitMsgFile, generatedMessage);
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
    // Load environment variables to get API key
    const env = this.loadEnv();
    this.setClaudeApiKey(env.ANTHROPIC_API_KEY || '');
    
    if (!this.claudeApiKey) {
      throw new Error('No Claude API key found. Please set ANTHROPIC_API_KEY in your .env file');
    }
    
    // Create a prompt for Claude
    const prompt = this.createCommitMessagePrompt(diff, files);
    
    try {
      // Call Claude API
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-opus-20240229',
        maxTokens: 1000
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
      return 'Failed to generate commit message with Claude';
    }
  }

  /**
   * Create a prompt for Claude to generate a commit message
   * @param {string} diff Git diff to generate message from
   * @param {Array<string>} files List of staged files
   * @returns {string} Prompt for Claude
   */
  createCommitMessagePrompt(diff, files) {
    const conventionalFormat = this.conventionalCommits
      ? `Use the Conventional Commits format:
<type>${this.includeScope ? '(<scope>)' : ''}: <description>

${this.messageStyle === 'detailed' ? '[optional body]' : ''}
${this.includeBreaking ? '[optional BREAKING CHANGE: <description>]' : ''}

Valid types include: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert`
      : '';
    
    const styleGuidance = this.messageStyle === 'concise'
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
${files.join('\n')}

# Git Diff:
\`\`\`diff
${diff}
\`\`\`

Reply with ONLY the commit message, properly formatted, without any additional explanation or markdown formatting. Only the text that should appear in the commit message.`;
  }
}

export default PrepareCommitMsgHook;