/**
 * Post-Merge Hook
 * 
 * Implements a post-merge hook for Git that uses Claude to generate
 * summaries of merged changes after pull or merge operations.
 */

import fs from 'fs-extra';
import path from 'path';
import { BaseHook } from './base-hook.js';

class PostMergeHook extends BaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Claude Merge Summary',
      description: 'Uses Claude to generate a summary of merged changes',
      gitHookName: 'post-merge'
    });
    
    // Additional configuration specific to post-merge
    this.summaryFormat = config.summaryFormat || 'detailed'; // 'concise' or 'detailed'
    this.includeStats = config.includeStats || true; // Whether to include file stats in the summary
    this.includeDependencies = config.includeDependencies || true; // Whether to highlight dependency changes
    this.includeBreakingChanges = config.includeBreakingChanges || true; // Whether to highlight breaking changes
    this.maxDiffSize = config.maxDiffSize || 100000; // Maximum diff size to summarize
    this.notifyMethod = config.notifyMethod || 'terminal'; // How to deliver the summary ('terminal', 'file', 'notification')
    this.outputFile = config.outputFile || 'merge-summary.md'; // File to write the summary to if notifyMethod is 'file'
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

# Check if this is a squash merge (Git doesn't provide this info directly)
IS_SQUASH=0
if [ -f ".git/SQUASH_MSG" ]; then
  IS_SQUASH=1
fi

# Run the hook script, passing the squash flag as an argument
"${nodePath}" "${scriptPath}" post-merge "$1" "$IS_SQUASH"
exit $?
`;
  }

  /**
   * Execute the post-merge hook logic
   * @param {Array<string>} args Command-line arguments
   * @returns {Promise<void>}
   */
  async execute(args) {
    this.info('Executing post-merge hook...');
    
    try {
      // Extract arguments
      const isSquash = args[1] === '1'; // Whether this is a squash merge
      const isFFMerge = args[0] === '1'; // Whether this is a fast-forward merge
      
      const mergeType = isSquash ? 'squash merge' : isFFMerge ? 'fast-forward merge' : 'regular merge';
      this.info(`Detected ${mergeType}`);
      
      // Get the previous HEAD commit
      const previousHead = await this.getPreviousHead();
      
      // Get the current HEAD commit
      const currentHead = await this.getCurrentHead();
      
      // Get the merge commit details
      const mergeCommit = await this.getCommitDetails(currentHead);
      
      // Get the files changed in the merge
      const filesChanged = await this.getFilesChanged(previousHead, currentHead);
      
      if (filesChanged.length === 0) {
        this.info('No files changed in the merge, skipping summary');
        return;
      }
      
      // Get the diff for the merge
      const diff = await this.getDiff(previousHead, currentHead);
      
      if (!diff || diff.length === 0) {
        this.info('No changes in the merge, skipping summary');
        return;
      }
      
      // Check if the diff is too large
      if (diff.length > this.maxDiffSize) {
        this.warn(`Diff too large (${diff.length} bytes), skipping summary generation`);
        return;
      }
      
      // Generate a summary of the merge
      const summary = await this.generateMergeSummary(diff, previousHead, currentHead, mergeCommit, filesChanged, mergeType);
      
      // Deliver the summary based on the notification method
      await this.deliverSummary(summary);
      
    } catch (err) {
      this.error(`Failed to execute post-merge hook: ${err.message}`);
      // This is a post-merge hook, so we don't need to exit with a non-zero status
    }
  }

  /**
   * Get the previous HEAD commit before the merge
   * @returns {Promise<string>} SHA of the previous HEAD commit
   */
  async getPreviousHead() {
    try {
      // Get the reflog entries for HEAD
      const reflog = this.executeCommand('git reflog -n 2 --format=%H HEAD');
      const commits = reflog.split('\n').filter(line => line.trim() !== '');
      
      // The second entry in the reflog is the previous HEAD
      return commits.length > 1 ? commits[1] : '';
    } catch (err) {
      this.error(`Failed to get previous HEAD: ${err.message}`);
      return '';
    }
  }

  /**
   * Get the current HEAD commit
   * @returns {Promise<string>} SHA of the current HEAD commit
   */
  async getCurrentHead() {
    try {
      return this.executeCommand('git rev-parse HEAD').trim();
    } catch (err) {
      this.error(`Failed to get current HEAD: ${err.message}`);
      return '';
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
   * Generate a summary of the merge using Claude
   * @param {string} diff Git diff
   * @param {string} previousHead Previous HEAD commit SHA
   * @param {string} currentHead Current HEAD commit SHA
   * @param {Object} mergeCommit Merge commit details
   * @param {Array<Object>} filesChanged List of files changed
   * @param {string} mergeType Type of merge
   * @returns {Promise<string>} Generated summary
   */
  async generateMergeSummary(diff, previousHead, currentHead, mergeCommit, filesChanged, mergeType) {
    // Load environment variables to get API key
    const env = this.loadEnv();
    this.setClaudeApiKey(env.ANTHROPIC_API_KEY || '');
    
    if (!this.claudeApiKey) {
      return `# Merge Summary

A merge was completed, but Claude couldn't generate a summary because no API key was found.
Please set ANTHROPIC_API_KEY in your .env file to enable this feature.

## Basic Information

- Merge type: ${mergeType}
- Merge commit: ${mergeCommit.hash}
- Author: ${mergeCommit.author}
- Date: ${mergeCommit.date}
- Subject: ${mergeCommit.subject}

## Files Changed

${filesChanged.map(file => `- ${file.status}: ${file.file}`).join('\n')}
`;
    }
    
    // Create a prompt for Claude
    const prompt = this.createSummaryPrompt(diff, previousHead, currentHead, mergeCommit, filesChanged, mergeType);
    
    try {
      // Call Claude API
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-opus-20240229',
        maxTokens: 2000
      });
      
      // Extract the summary from the response
      const message = response.content[0]?.text || '';
      
      // Clean up the response
      return message.replace(/\n\nHuman: /g, '').replace(/\n\nAssistant: /g, '').trim();
    } catch (err) {
      this.error(`Failed to generate merge summary with Claude: ${err.message}`);
      
      // Return a basic summary if Claude fails
      return `# Merge Summary

A merge was completed, but Claude couldn't generate a detailed summary due to an error.

## Basic Information

- Merge type: ${mergeType}
- Merge commit: ${mergeCommit.hash}
- Author: ${mergeCommit.author}
- Date: ${mergeCommit.date}
- Subject: ${mergeCommit.subject}

## Files Changed

${filesChanged.map(file => `- ${file.status}: ${file.file}`).join('\n')}
`;
    }
  }

  /**
   * Create a prompt for Claude to generate a merge summary
   * @param {string} diff Git diff
   * @param {string} previousHead Previous HEAD commit SHA
   * @param {string} currentHead Current HEAD commit SHA
   * @param {Object} mergeCommit Merge commit details
   * @param {Array<Object>} filesChanged List of files changed
   * @param {string} mergeType Type of merge
   * @returns {string} Prompt for Claude
   */
  createSummaryPrompt(diff, previousHead, currentHead, mergeCommit, filesChanged, mergeType) {
    // Create a list of files changed
    const filesList = filesChanged.map(file => `${file.status}: ${file.file}`).join('\n');
    
    // Determine what to include in the summary based on configuration
    const includeDependencies = this.includeDependencies
      ? 'Highlight any dependency changes (package.json, requirements.txt, etc.)'
      : '';
    
    const includeBreakingChanges = this.includeBreakingChanges
      ? 'Identify any potential breaking changes or migration steps needed'
      : '';
    
    const formattingInstructions = this.summaryFormat === 'concise'
      ? 'Be concise and focus on the most important changes'
      : 'Provide a detailed explanation of the changes';
    
    return `You are a helpful assistant that creates summaries of Git merges. Please summarize the following Git merge in a clear, human-readable format.

# Merge Information
- Merge type: ${mergeType}
- Previous HEAD: ${previousHead}
- Current HEAD: ${currentHead}
- Merge commit: ${mergeCommit.hash}
- Author: ${mergeCommit.author}
- Date: ${mergeCommit.date}
- Subject: ${mergeCommit.subject}
- Body: ${mergeCommit.body}

# Files Changed
${filesList}

# Git Diff
\`\`\`diff
${diff}
\`\`\`

Please create a detailed Markdown summary of this merge with the following:

1. A descriptive title summarizing the merge
2. An overview of what changed and why
3. A breakdown of the main changes by category or component
4. ${includeDependencies}
5. ${includeBreakingChanges}
6. ${this.includeStats ? 'Include statistics on the changes (files changed, lines added/removed)' : ''}

Formatting instructions:
- ${formattingInstructions}
- Use Markdown formatting
- Include headings, lists, and code blocks as appropriate
- Focus on explaining the changes in a way that helps developers understand what happened`;
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
          this.success(`Merge summary written to ${outputPath}`);
        } catch (err) {
          this.error(`Failed to write merge summary to file: ${err.message}`);
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
            const title = 'Merge Summary';
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
}

export default PostMergeHook;