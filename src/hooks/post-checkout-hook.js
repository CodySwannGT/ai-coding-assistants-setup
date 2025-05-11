/**
 * Post-Checkout Hook
 *
 * Implements a post-checkout hook for Git that uses Claude to generate
 * summaries of branch changes after checkout operations.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { BaseHook } from './base-hook.js';

class PostCheckoutHook extends BaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Claude Branch Summary',
      description: 'Uses Claude to generate a summary of branch changes when switching branches',
      gitHookName: 'post-checkout'
    });

    // Additional configuration specific to post-checkout
    this.summaryFormat = config.summaryFormat || 'detailed'; // 'concise' or 'detailed'
    this.includeStats = config.includeStats !== false; // Whether to include file stats in the summary
    this.includeDependencies = config.includeDependencies !== false; // Whether to highlight dependency changes
    this.includeBreakingChanges = config.includeBreakingChanges !== false; // Whether to highlight breaking changes
    this.maxDiffSize = config.maxDiffSize || 100000; // Maximum diff size to summarize
    this.notifyMethod = config.notifyMethod || 'terminal'; // How to deliver the summary ('terminal', 'file', 'notification')
    this.outputFile = config.outputFile || 'branch-summary.md'; // File to write the summary to if notifyMethod is 'file'
    this.skipInitialCheckout = config.skipInitialCheckout !== false; // Skip summaries for initial checkout operations
    this.skipTagCheckout = config.skipTagCheckout || false; // Skip summaries when checking out tags
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

# Run the hook script, passing the checkout parameters
"${nodePath}" "${scriptPath}" post-checkout "$1" "$2" "$3"
exit $?
`;
  }

  /**
   * Execute the post-checkout hook logic
   * @param {Array<string>} args Command-line arguments
   * @returns {Promise<void>}
   */
  async execute(args) {
    this.info('Executing post-checkout hook...');

    try {
      // Check if hook should execute
      if (!await this.shouldExecute()) {
        this.debug('Skipping post-checkout hook execution based on configuration');
        return;
      }

      // Ensure prompt templates are available
      await this.createPromptTemplate();
      await this.loadPromptTemplates();

      // Extract arguments
      const prevHead = args[0]; // Previous HEAD SHA
      const newHead = args[1]; // New HEAD SHA
      const isBranchCheckout = args[2] === '1'; // Whether this is a branch checkout (1) or file checkout (0)

      // Skip if this is a file checkout, not a branch checkout
      if (!isBranchCheckout) {
        this.info('This is a file checkout, not a branch checkout, skipping summary');
        return;
      }

      // Get the current branch name
      const currentBranch = await this.getCurrentBranch();

      if (!currentBranch || currentBranch === 'HEAD') {
        this.warn('Could not determine current branch, skipping summary');
        return;
      }

      // Skip initial checkout operations where there's no real diff
      if (this.skipInitialCheckout && prevHead === '0'.repeat(40)) {
        this.info('This appears to be an initial checkout, skipping summary');
        return;
      }

      // Check if we're checking out a tag and if we should skip it
      if (this.skipTagCheckout && await this.isTagCheckout(newHead)) {
        this.info('This is a tag checkout, skipping summary');
        return;
      }

      // Get the files changed between the previous and new HEAD
      const filesChanged = await this.getFilesChanged(prevHead, newHead);

      if (filesChanged.length === 0) {
        this.info('No files changed in the checkout, skipping summary');
        return;
      }

      // Get the diff between the previous and new HEAD
      const diff = await this.getDiff(prevHead, newHead);

      if (!diff || diff.length === 0) {
        this.info('No changes in the checkout, skipping summary');
        return;
      }

      // Check if the diff is too large
      if (diff.length > this.maxDiffSize) {
        this.warn(`Diff too large (${diff.length} bytes, max is ${this.maxDiffSize}), skipping summary generation`);
        return;
      }

      // Get details for the old and new branches/commits
      const prevHeadDetails = await this.getCommitDetails(prevHead);
      const newHeadDetails = await this.getCommitDetails(newHead);

      // Generate a summary of the branch changes
      this.info('Generating branch summary...');
      const summary = await this.generateBranchSummary(diff, prevHead, newHead, prevHeadDetails, newHeadDetails, filesChanged, currentBranch);

      // Deliver the summary based on the notification method
      await this.deliverSummary(summary);

    } catch (err) {
      this.error(`Failed to execute post-checkout hook: ${err.message}`);
      // This is a post-checkout hook, so we don't need to exit with a non-zero status
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
    if (process.env.CLAUDE_SKIP_POST_CHECKOUT === 'true') {
      this.debug('Skipping post-checkout hook due to CLAUDE_SKIP_POST_CHECKOUT environment variable');
      return false;
    }

    return true;
  }

  /**
   * Get the current branch name
   * @returns {Promise<string>} Current branch name
   */
  async getCurrentBranch() {
    try {
      return this.executeCommand('git rev-parse --abbrev-ref HEAD').trim();
    } catch (err) {
      this.error(`Failed to get current branch: ${err.message}`);
      return 'Unknown';
    }
  }

  /**
   * Check if the checkout is for a tag
   * @param {string} ref Git reference to check
   * @returns {Promise<boolean>} Whether this is a tag checkout
   */
  async isTagCheckout(ref) {
    try {
      const tags = this.executeCommand(`git tag --points-at ${ref}`).trim();
      return tags.length > 0;
    } catch (err) {
      this.error(`Failed to check if ref is a tag: ${err.message}`);
      return false;
    }
  }

  /**
   * Get details of a commit
   * @param {string} commitSha SHA of the commit
   * @returns {Promise<Object>} Commit details
   */
  async getCommitDetails(commitSha) {
    try {
      const format = '%H|%an|%at|%s|%b';
      const output = this.executeCommand(`git show -s --format="${format}" ${commitSha}`);
      const [hash, author, timestamp, subject, body] = output.split('|');

      return {
        hash,
        author,
        date: new Date(parseInt(timestamp) * 1000).toISOString(),
        subject,
        body: body.trim()
      };
    } catch (err) {
      this.error(`Failed to get commit details: ${err.message}`);
      return {
        hash: commitSha,
        author: 'Unknown',
        date: new Date().toISOString(),
        subject: 'Unknown',
        body: ''
      };
    }
  }

  /**
   * Get the files changed between two commits
   * @param {string} fromSha From commit SHA
   * @param {string} toSha To commit SHA
   * @returns {Promise<Array<Object>>} List of files changed
   */
  async getFilesChanged(fromSha, toSha) {
    try {
      const output = this.executeCommand(`git diff --name-status ${fromSha} ${toSha}`);

      if (!output || output.trim() === '') {
        return [];
      }

      return output.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [status, ...fileParts] = line.split('\t');
          const file = fileParts.join('\t'); // Handle filenames with tabs

          return {
            status: this.getStatusDescription(status.charAt(0)),
            file
          };
        });
    } catch (err) {
      this.error(`Failed to get files changed: ${err.message}`);
      return [];
    }
  }

  /**
   * Get a human-readable description of a file status
   * @param {string} statusCode Git status code
   * @returns {string} Human-readable status
   */
  getStatusDescription(statusCode) {
    switch (statusCode) {
      case 'A': return 'Added';
      case 'C': return 'Copied';
      case 'D': return 'Deleted';
      case 'M': return 'Modified';
      case 'R': return 'Renamed';
      case 'T': return 'Type Changed';
      case 'U': return 'Unmerged';
      case 'X': return 'Unknown';
      default: return statusCode;
    }
  }

  /**
   * Get the diff between two commits
   * @param {string} fromSha From commit SHA
   * @param {string} toSha To commit SHA
   * @returns {Promise<string>} Git diff output
   */
  async getDiff(fromSha, toSha) {
    try {
      return this.executeCommand(`git diff ${fromSha} ${toSha}`);
    } catch (err) {
      this.error(`Failed to get diff: ${err.message}`);
      return '';
    }
  }

  /**
   * Generate a summary of the branch changes using Claude
   * @param {string} diff Git diff
   * @param {string} prevHead Previous HEAD commit SHA
   * @param {string} newHead New HEAD commit SHA
   * @param {Object} prevHeadDetails Previous HEAD commit details
   * @param {Object} newHeadDetails New HEAD commit details
   * @param {Array<Object>} filesChanged List of files changed
   * @param {string} currentBranch Current branch name
   * @returns {Promise<string>} Generated summary
   */
  async generateBranchSummary(diff, prevHead, newHead, prevHeadDetails, newHeadDetails, filesChanged, currentBranch) {
    // Check if Claude is available
    if (this.claudeAvailable === null) {
      await this.checkClaudeAvailability();
    }

    if (!this.claudeAvailable) {
      return this.generateBranchSummaryFallback(diff, prevHead, newHead, prevHeadDetails, newHeadDetails, filesChanged, currentBranch);
    }

    // Load prompt templates if not loaded yet
    if (Object.keys(this.promptTemplates).length === 0) {
      await this.loadPromptTemplates();
    }

    // Create a list of files changed
    const filesList = filesChanged.map(file => `${file.status}: ${file.file}`).join('\n');

    // Create variables for prompt template
    const variables = {
      diff: diff.length > 50000 ? diff.substring(0, 50000) + '\n... [diff truncated due to size] ...' : diff,
      prevHead,
      newHead,
      currentBranch,
      prevHeadSubject: prevHeadDetails.subject,
      newHeadSubject: newHeadDetails.subject,
      newHeadAuthor: newHeadDetails.author,
      newHeadDate: newHeadDetails.date,
      filesList,
      summaryFormat: this.summaryFormat,
      includeStats: this.includeStats ? 'true' : 'false',
      includeDependencies: this.includeDependencies ? 'true' : 'false',
      includeBreakingChanges: this.includeBreakingChanges ? 'true' : 'false'
    };

    // Get the appropriate prompt
    const prompt = this.formatPrompt('branch-summary', variables);

    try {
      // Call Claude API
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-haiku-20240307', // Use a faster model for summaries
        maxTokens: 2000,
        temperature: 0.3, // Lower temperature for more consistent responses
        cacheResponse: false // Don't cache branch summaries as they're unique
      });

      // Extract the summary from the response
      const message = response.content[0]?.text || '';

      // Clean up the response
      return message.replace(/\n\nHuman: /g, '').replace(/\n\nAssistant: /g, '').trim();
    } catch (err) {
      this.error(`Failed to generate branch summary with Claude: ${err.message}`);
      return this.generateBranchSummaryFallback(diff, prevHead, newHead, prevHeadDetails, newHeadDetails, filesChanged, currentBranch);
    }
  }

  /**
   * Fallback method to generate a branch summary without Claude
   * @param {string} diff Git diff
   * @param {string} prevHead Previous HEAD commit SHA
   * @param {string} newHead New HEAD commit SHA
   * @param {Object} prevHeadDetails Previous HEAD commit details
   * @param {Object} newHeadDetails New HEAD commit details
   * @param {Array<Object>} filesChanged List of files changed
   * @param {string} currentBranch Current branch name
   * @returns {string} Generated summary
   */
  generateBranchSummaryFallback(diff, prevHead, newHead, prevHeadDetails, newHeadDetails, filesChanged, currentBranch) {
    this.info('Using fallback branch summary generation');

    // Count files by type
    const fileTypes = {};
    filesChanged.forEach(file => {
      const status = file.status;
      fileTypes[status] = (fileTypes[status] || 0) + 1;
    });

    // Generate file stats
    const statsSection = this.includeStats ?
      `## File Statistics

${Object.entries(fileTypes).map(([type, count]) => `- ${type}: ${count} files`).join('\n')}

Total: ${filesChanged.length} files changed
` : '';

    // Identify dependency changes
    const dependencyFiles = filesChanged
      .filter(file => file.file.includes('package.json') ||
                     file.file.includes('requirements.txt') ||
                     file.file.includes('Gemfile') ||
                     file.file.includes('go.mod'))
      .map(file => file.file);

    const dependencySection = this.includeDependencies && dependencyFiles.length > 0 ?
      `## Dependency Changes

${dependencyFiles.map(file => `- ${file}`).join('\n')}
` : '';

    // Generate summary
    return `# Branch Checkout Summary: ${currentBranch}

You've checked out branch ${currentBranch}.

## Basic Information

- Previous commit: ${prevHeadDetails.hash} - ${prevHeadDetails.subject}
- New commit: ${newHeadDetails.hash} - ${newHeadDetails.subject}
- Author: ${newHeadDetails.author}
- Date: ${newHeadDetails.date}

## Files Changed

${filesChanged.map(file => `- ${file.status}: ${file.file}`).join('\n')}

${statsSection}
${dependencySection}
`;
  }

  /**
   * Deliver the generated summary based on the notification method
   * @param {string} summary Generated summary
   * @returns {Promise<void>}
   */
  async deliverSummary(summary) {
    switch (this.notifyMethod) {
      case 'terminal':
        // Output to terminal
        console.log('\n' + summary + '\n');
        break;

      case 'file':
        // Write to file
        const outputPath = path.join(this.projectRoot, this.outputFile);
        try {
          await fs.writeFile(outputPath, summary, 'utf8');
          this.success(`Branch summary written to ${outputPath}`);
        } catch (err) {
          this.error(`Failed to write branch summary to file: ${err.message}`);
          // Fall back to terminal output
          console.log('\n' + summary + '\n');
        }
        break;

      case 'notification':
        // Show a notification (platform-dependent, falls back to terminal)
        console.log('\n' + summary + '\n');
        // On macOS we could use osascript for notifications
        if (process.platform === 'darwin') {
          try {
            const title = 'Branch Checkout Summary';
            const message = summary.split('\n')[0].replace(/^#\s+/, ''); // Use first line as message
            this.executeCommand(`osascript -e 'display notification "${message}" with title "${title}"'`);
          } catch (err) {
            this.error(`Failed to show notification: ${err.message}`);
          }
        }
        break;

      default:
        // Default to terminal
        console.log('\n' + summary + '\n');
    }
  }

  /**
   * Get a fallback prompt template for branch summary
   * @param {string} templateName The template name
   * @param {Object} variables Variables for the template
   * @returns {string} The fallback prompt
   */
  getFallbackPrompt(templateName, variables) {
    if (templateName === 'branch-summary') {
      // Determine what to include in the summary based on configuration
      const includeDependencies = variables.includeDependencies === 'true'
        ? 'Highlight any dependency changes (package.json, requirements.txt, etc.)'
        : '';

      const includeBreakingChanges = variables.includeBreakingChanges === 'true'
        ? 'Identify any potential breaking changes or migration steps needed'
        : '';

      const formattingInstructions = variables.summaryFormat === 'concise'
        ? 'Be concise and focus on the most important changes'
        : 'Provide a detailed explanation of the changes';

      return `You are a helpful assistant that creates summaries of Git branch checkouts. Please summarize the following Git branch checkout in a clear, human-readable format.

# Branch Information
- Current branch: ${variables.currentBranch}
- Previous HEAD: ${variables.prevHead} (${variables.prevHeadSubject})
- New HEAD: ${variables.newHead} (${variables.newHeadSubject})
- Author: ${variables.newHeadAuthor}
- Date: ${variables.newHeadDate}

# Files Changed
${variables.filesList}

# Git Diff
\`\`\`diff
${variables.diff}
\`\`\`

Please create a detailed Markdown summary of this branch checkout with the following:

1. A descriptive title summarizing the branch and its purpose
2. An overview of the differences between the old and new branches
3. A breakdown of the main changes by category or component
4. ${includeDependencies}
5. ${includeBreakingChanges}
6. ${variables.includeStats === 'true' ? 'Include statistics on the changes (files changed, lines added/removed)' : ''}

Formatting instructions:
- ${formattingInstructions}
- Use Markdown formatting
- Include headings, lists, and code blocks as appropriate
- Focus on explaining the changes in a way that helps developers understand the branch context`;
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
        'branch-summary': `You are a helpful assistant that creates summaries of Git branch checkouts. Please summarize the following Git branch checkout in a clear, human-readable format.

# Branch Information
- Current branch: {{currentBranch}}
- Previous HEAD: {{prevHead}} ({{prevHeadSubject}})
- New HEAD: {{newHead}} ({{newHeadSubject}})
- Author: {{newHeadAuthor}}
- Date: {{newHeadDate}}

# Files Changed
{{filesList}}

# Git Diff
\`\`\`diff
{{diff}}
\`\`\`

Please create a detailed Markdown summary of this branch checkout with the following:

1. A descriptive title summarizing the branch and its purpose
2. An overview of the differences between the old and new branches
3. A breakdown of the main changes by category or component
{{#if includeDependencies == 'true'}}4. Highlight any dependency changes (package.json, requirements.txt, etc.){{/if}}
{{#if includeBreakingChanges == 'true'}}5. Identify any potential breaking changes or migration steps needed{{/if}}
{{#if includeStats == 'true'}}6. Include statistics on the changes (files changed, lines added/removed){{/if}}

Formatting instructions:
{{#if summaryFormat == 'concise'}}- Be concise and focus on the most important changes{{else}}- Provide a detailed explanation of the changes{{/if}}
- Use Markdown formatting
- Include headings, lists, and code blocks as appropriate
- Focus on explaining the changes in a way that helps developers understand the branch context`
      };

      // Write template file
      await fs.writeJson(templatePath, templates, { spaces: 2 });
      this.debug(`Created prompt template file at ${templatePath}`);
    } catch (err) {
      this.debug(`Failed to create prompt template file: ${err.message}`);
    }
  }
}

export default PostCheckoutHook;