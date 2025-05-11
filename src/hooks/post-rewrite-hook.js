/**
 * Post-Rewrite Hook
 * 
 * Implements a post-rewrite hook for Git that uses Claude to generate
 * summaries of changes after rebase or commit amend operations.
 */

import fs from 'fs-extra';
import path from 'path';
import { BaseHook } from './base-hook.js';

class PostRewriteHook extends BaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Claude Rewrite Summary',
      description: 'Uses Claude to generate a summary of changes after rebase or amend operations',
      gitHookName: 'post-rewrite'
    });
    
    // Additional configuration specific to post-rewrite
    this.summaryFormat = config.summaryFormat || 'detailed'; // 'concise' or 'detailed'
    this.includeStats = config.includeStats || true; // Whether to include file stats in the summary
    this.includeDependencies = config.includeDependencies || true; // Whether to highlight dependency changes
    this.includeBreakingChanges = config.includeBreakingChanges || true; // Whether to highlight breaking changes
    this.maxDiffSize = config.maxDiffSize || 100000; // Maximum diff size to summarize
    this.notifyMethod = config.notifyMethod || 'terminal'; // How to deliver the summary ('terminal', 'file', 'notification')
    this.outputFile = config.outputFile || 'rewrite-summary.md'; // File to write the summary to if notifyMethod is 'file'
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

# Run the hook script, passing all arguments received by the hook
"${nodePath}" "${scriptPath}" post-rewrite "$@"
exit $?
`;
  }

  /**
   * Execute the post-rewrite hook logic
   * @param {Array<string>} args Command-line arguments
   * @returns {Promise<void>}
   */
  async execute(args) {
    this.info('Executing post-rewrite hook...');
    
    try {
      // Extract arguments
      const rewriteType = args[0]; // Type of rewrite ('amend' or 'rebase')
      const rewriteInfo = args.slice(1); // Each line contains <old-sha> <new-sha>
      
      this.info(`Detected ${rewriteType} operation with ${rewriteInfo.length} rewritten commits`);
      
      // Skip if no rewrites
      if (rewriteInfo.length === 0) {
        this.info('No rewrites detected, skipping summary');
        return;
      }
      
      // Parse the rewrite information
      const rewrites = rewriteInfo.map(line => {
        const [oldSha, newSha] = line.split(' ');
        return { oldSha, newSha };
      });
      
      // Get current branch name
      const currentBranch = await this.getCurrentBranch();
      
      // If this is a single amend, generate summary for just that commit
      if (rewriteType === 'amend' || rewrites.length === 1) {
        const { oldSha, newSha } = rewrites[0];
        
        // Get the commit details
        const commitDetails = await this.getCommitDetails(newSha);
        
        // Get files changed in the amendment
        const filesChanged = await this.getFilesChanged(oldSha, newSha);
        
        if (filesChanged.length === 0) {
          this.info('No files changed in the rewrite, skipping summary');
          return;
        }
        
        // Get the diff for the amendment
        const diff = await this.getDiff(oldSha, newSha);
        
        if (!diff || diff.length === 0) {
          this.info('No changes in the rewrite, skipping summary');
          return;
        }
        
        // Check if the diff is too large
        if (diff.length > this.maxDiffSize) {
          this.warn(`Diff too large (${diff.length} bytes), skipping summary generation`);
          return;
        }
        
        // Generate a summary of the amendment
        const summary = await this.generateAmendSummary(diff, oldSha, newSha, commitDetails, filesChanged);
        
        // Deliver the summary
        await this.deliverSummary(summary);
      } 
      // If this is a rebase with multiple commits, generate a summary of the entire rebase
      else if (rewriteType === 'rebase') {
        // Get the diff between the original first commit and the new last commit
        const firstOldSha = rewrites[0].oldSha;
        const lastNewSha = rewrites[rewrites.length - 1].newSha;
        
        // Get the files changed across the entire rebase
        const filesChanged = await this.getFilesChanged(firstOldSha, lastNewSha);
        
        if (filesChanged.length === 0) {
          this.info('No files changed in the rebase, skipping summary');
          return;
        }
        
        // Get the diff for the entire rebase
        const diff = await this.getDiff(firstOldSha, lastNewSha);
        
        if (!diff || diff.length === 0) {
          this.info('No changes in the rebase, skipping summary');
          return;
        }
        
        // Check if the diff is too large
        if (diff.length > this.maxDiffSize) {
          this.warn(`Diff too large (${diff.length} bytes), skipping summary generation`);
          return;
        }
        
        // Generate a summary of the rebase
        const summary = await this.generateRebaseSummary(diff, rewrites, filesChanged, currentBranch);
        
        // Deliver the summary
        await this.deliverSummary(summary);
      }
      
    } catch (err) {
      this.error(`Failed to execute post-rewrite hook: ${err.message}`);
      // This is a post-rewrite hook, so we don't need to exit with a non-zero status
    }
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
   * Generate a summary of a commit amendment using Claude
   * @param {string} diff Git diff
   * @param {string} oldSha Old commit SHA
   * @param {string} newSha New commit SHA
   * @param {Object} commitDetails New commit details
   * @param {Array<Object>} filesChanged List of files changed
   * @returns {Promise<string>} Generated summary
   */
  async generateAmendSummary(diff, oldSha, newSha, commitDetails, filesChanged) {
    // Load environment variables to get API key
    const env = this.loadEnv();
    this.setClaudeApiKey(env.ANTHROPIC_API_KEY || '');
    
    if (!this.claudeApiKey) {
      return `# Commit Amendment Summary

A commit was amended, but Claude couldn't generate a summary because no API key was found.
Please set ANTHROPIC_API_KEY in your .env file to enable this feature.

## Basic Information

- Original commit: ${oldSha}
- New commit: ${newSha}
- Author: ${commitDetails.author}
- Date: ${commitDetails.date}
- Subject: ${commitDetails.subject}

## Files Changed

${filesChanged.map(file => `- ${file.status}: ${file.file}`).join('\n')}
`;
    }
    
    // Create a prompt for Claude
    const prompt = this.createAmendSummaryPrompt(diff, oldSha, newSha, commitDetails, filesChanged);
    
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
      this.error(`Failed to generate amendment summary with Claude: ${err.message}`);
      
      // Return a basic summary if Claude fails
      return `# Commit Amendment Summary

A commit was amended, but Claude couldn't generate a detailed summary due to an error.

## Basic Information

- Original commit: ${oldSha}
- New commit: ${newSha}
- Author: ${commitDetails.author}
- Date: ${commitDetails.date}
- Subject: ${commitDetails.subject}

## Files Changed

${filesChanged.map(file => `- ${file.status}: ${file.file}`).join('\n')}
`;
    }
  }

  /**
   * Generate a summary of a rebase operation using Claude
   * @param {string} diff Git diff of the entire rebase
   * @param {Array<Object>} rewrites List of commit rewrites
   * @param {Array<Object>} filesChanged List of files changed
   * @param {string} currentBranch Current branch name
   * @returns {Promise<string>} Generated summary
   */
  async generateRebaseSummary(diff, rewrites, filesChanged, currentBranch) {
    // Load environment variables to get API key
    const env = this.loadEnv();
    this.setClaudeApiKey(env.ANTHROPIC_API_KEY || '');
    
    // Get details for each rewritten commit
    const rewrittenCommits = await Promise.all(
      rewrites.map(async ({ oldSha, newSha }) => {
        const oldDetails = await this.getCommitDetails(oldSha);
        const newDetails = await this.getCommitDetails(newSha);
        return { oldSha, oldDetails, newSha, newDetails };
      })
    );
    
    if (!this.claudeApiKey) {
      return `# Rebase Summary

A rebase was completed on branch ${currentBranch}, but Claude couldn't generate a summary because no API key was found.
Please set ANTHROPIC_API_KEY in your .env file to enable this feature.

## Basic Information

- Number of rewritten commits: ${rewrites.length}
- Current branch: ${currentBranch}

## Rewritten Commits

${rewrittenCommits.map(({ oldSha, oldDetails, newSha, newDetails }) => 
  `- ${oldSha.substring(0, 7)} → ${newSha.substring(0, 7)}: ${newDetails.subject}`
).join('\n')}

## Files Changed

${filesChanged.map(file => `- ${file.status}: ${file.file}`).join('\n')}
`;
    }
    
    // Create a prompt for Claude
    const prompt = this.createRebaseSummaryPrompt(diff, rewrittenCommits, filesChanged, currentBranch);
    
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
      this.error(`Failed to generate rebase summary with Claude: ${err.message}`);
      
      // Return a basic summary if Claude fails
      return `# Rebase Summary

A rebase was completed on branch ${currentBranch}, but Claude couldn't generate a detailed summary due to an error.

## Basic Information

- Number of rewritten commits: ${rewrites.length}
- Current branch: ${currentBranch}

## Rewritten Commits

${rewrittenCommits.map(({ oldSha, oldDetails, newSha, newDetails }) => 
  `- ${oldSha.substring(0, 7)} → ${newSha.substring(0, 7)}: ${newDetails.subject}`
).join('\n')}

## Files Changed

${filesChanged.map(file => `- ${file.status}: ${file.file}`).join('\n')}
`;
    }
  }

  /**
   * Create a prompt for Claude to generate an amendment summary
   * @param {string} diff Git diff
   * @param {string} oldSha Old commit SHA
   * @param {string} newSha New commit SHA
   * @param {Object} commitDetails New commit details
   * @param {Array<Object>} filesChanged List of files changed
   * @returns {string} Prompt for Claude
   */
  createAmendSummaryPrompt(diff, oldSha, newSha, commitDetails, filesChanged) {
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
    
    return `You are a helpful assistant that creates summaries of Git commit amendments. Please summarize the following Git commit amendment in a clear, human-readable format.

# Amendment Information
- Original commit: ${oldSha}
- New commit: ${newSha}
- Author: ${commitDetails.author}
- Date: ${commitDetails.date}
- Subject: ${commitDetails.subject}
- Body: ${commitDetails.body}

# Files Changed
${filesList}

# Git Diff
\`\`\`diff
${diff}
\`\`\`

Please create a detailed Markdown summary of this commit amendment with the following:

1. A descriptive title summarizing the amendment
2. An overview of what changed between the original and amended commit
3. A breakdown of the main changes by category or component
4. ${includeDependencies}
5. ${includeBreakingChanges}
6. ${this.includeStats ? 'Include statistics on the changes (files changed, lines added/removed)' : ''}

Formatting instructions:
- ${formattingInstructions}
- Use Markdown formatting
- Include headings, lists, and code blocks as appropriate
- Focus on explaining the changes in a way that helps developers understand what was amended`;
  }

  /**
   * Create a prompt for Claude to generate a rebase summary
   * @param {string} diff Git diff
   * @param {Array<Object>} rewrittenCommits List of rewritten commits with details
   * @param {Array<Object>} filesChanged List of files changed
   * @param {string} currentBranch Current branch name
   * @returns {string} Prompt for Claude
   */
  createRebaseSummaryPrompt(diff, rewrittenCommits, filesChanged, currentBranch) {
    // Create a list of files changed
    const filesList = filesChanged.map(file => `${file.status}: ${file.file}`).join('\n');
    
    // Create a list of rewritten commits
    const commitsList = rewrittenCommits.map(({ oldSha, oldDetails, newSha, newDetails }) => 
      `- ${oldSha.substring(0, 7)} → ${newSha.substring(0, 7)}: ${oldDetails.subject} → ${newDetails.subject}`
    ).join('\n');
    
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
    
    return `You are a helpful assistant that creates summaries of Git rebase operations. Please summarize the following Git rebase in a clear, human-readable format.

# Rebase Information
- Current branch: ${currentBranch}
- Number of rewritten commits: ${rewrittenCommits.length}

# Rewritten Commits
${commitsList}

# Files Changed
${filesList}

# Git Diff
\`\`\`diff
${diff}
\`\`\`

Please create a detailed Markdown summary of this rebase operation with the following:

1. A descriptive title summarizing the rebase
2. An overview of what changed during the rebase
3. A breakdown of the main changes by category or component
4. ${includeDependencies}
5. ${includeBreakingChanges}
6. ${this.includeStats ? 'Include statistics on the changes (files changed, lines added/removed)' : ''}

Formatting instructions:
- ${formattingInstructions}
- Use Markdown formatting
- Include headings, lists, and code blocks as appropriate
- Focus on explaining the changes in a way that helps developers understand what happened during the rebase`;
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
          this.success(`Rewrite summary written to ${outputPath}`);
        } catch (err) {
          this.error(`Failed to write rewrite summary to file: ${err.message}`);
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
            const title = 'Rewrite Summary';
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

export default PostRewriteHook;