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
    this.includeStats = config.includeStats !== undefined ? config.includeStats : true; // Whether to include file stats in the summary
    this.includeDependencies = config.includeDependencies !== undefined ? config.includeDependencies : true; // Whether to highlight dependency changes
    this.includeBreakingChanges = config.includeBreakingChanges !== undefined ? config.includeBreakingChanges : true; // Whether to highlight breaking changes
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
   * Determine if the hook should execute
   * @returns {Promise<boolean>} Whether the hook should execute
   */
  async shouldExecute() {
    // Skip if hook is disabled
    if (!this.enabled) {
      return false;
    }

    // Skip if environment variable is set
    if (process.env.CLAUDE_SKIP_POST_REWRITE === 'true') {
      this.debug('Skipping post-rewrite hook due to CLAUDE_SKIP_POST_REWRITE environment variable');
      return false;
    }

    return true;
  }

  /**
   * Execute the post-rewrite hook logic
   * @param {Array<string>} args Command-line arguments
   * @returns {Promise<void>}
   */
  async execute(args) {
    this.info('Executing post-rewrite hook...');

    // Check if hook should execute
    if (!await this.shouldExecute()) {
      this.debug('Hook execution skipped');
      return;
    }

    try {
      // Load prompt templates
      await this.loadPromptTemplates();

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
        const filesChanged = await this.getChangedFiles(oldSha, newSha);

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
        const filesChanged = await this.getChangedFiles(firstOldSha, lastNewSha);

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
   * Generate a summary of a commit amendment
   * @param {string} diff Git diff
   * @param {string} oldSha Old commit SHA
   * @param {string} newSha New commit SHA
   * @param {Object} commitDetails New commit details
   * @param {Array<Object>} filesChanged List of files changed
   * @returns {Promise<string>} Generated summary
   */
  async generateAmendSummary(diff, oldSha, newSha, commitDetails, filesChanged) {
    // Check if Claude is available
    if (this.claudeAvailable === null) {
      await this.checkClaudeAvailability();
    }

    if (!this.claudeAvailable) {
      return this.generateAmendSummaryFallback(diff, oldSha, newSha, commitDetails, filesChanged);
    }

    try {
      // Create variables for the prompt template
      const variables = {
        oldSha,
        newSha,
        author: commitDetails.author,
        date: commitDetails.date,
        subject: commitDetails.subject,
        body: commitDetails.body,
        filesList: filesChanged.map(file => `${file.status}: ${file.file}`).join('\n'),
        diff,
        summaryFormat: this.summaryFormat,
        includeStats: this.includeStats ? 'true' : 'false',
        includeDependencies: this.includeDependencies ? 'true' : 'false',
        includeBreakingChanges: this.includeBreakingChanges ? 'true' : 'false'
      };

      // Format the prompt using template
      const prompt = this.formatPrompt('amendSummary', variables);

      // Call Claude API
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-opus-20240229',
        maxTokens: 2000,
        cacheResponse: true
      });

      // Extract the summary from the response
      const message = response.content[0]?.text || '';

      // Clean up the response
      return message.replace(/\n\nHuman: /g, '').replace(/\n\nAssistant: /g, '').trim();
    } catch (err) {
      this.error(`Failed to generate amendment summary with Claude: ${err.message}`);
      return this.generateAmendSummaryFallback(diff, oldSha, newSha, commitDetails, filesChanged);
    }
  }

  /**
   * Generate a fallback summary for commit amendments when Claude is unavailable
   * @param {string} diff Git diff
   * @param {string} oldSha Old commit SHA
   * @param {string} newSha New commit SHA
   * @param {Object} commitDetails New commit details
   * @param {Array<Object>} filesChanged List of files changed
   * @returns {string} Generated summary
   */
  generateAmendSummaryFallback(diff, oldSha, newSha, commitDetails, filesChanged) {
    // Count files by type
    const fileStats = filesChanged.reduce((stats, file) => {
      stats[file.status] = (stats[file.status] || 0) + 1;
      return stats;
    }, {});

    // Format the file stats
    const statsSection = Object.entries(fileStats)
      .map(([status, count]) => `- ${status}: ${count}`)
      .join('\n');

    // Identify dependency changes
    const dependencyChanges = this.includeDependencies
      ? filesChanged.filter(file =>
          file.file.includes('package.json') ||
          file.file.includes('requirements.txt') ||
          file.file.includes('Gemfile') ||
          file.file.includes('pom.xml') ||
          file.file.includes('build.gradle') ||
          file.file.includes('go.mod')
        )
      : [];

    // Format dependency section if needed
    const dependencySection = dependencyChanges.length > 0
      ? `\n\n## Dependency Changes\n\n${dependencyChanges.map(dep => `- ${dep.status}: ${dep.file}`).join('\n')}`
      : '';

    // Generate a basic summary
    return `# Commit Amendment Summary

A commit was amended with changes to ${filesChanged.length} file${filesChanged.length !== 1 ? 's' : ''}.

## Basic Information

- Original commit: ${oldSha}
- New commit: ${newSha}
- Author: ${commitDetails.author}
- Date: ${commitDetails.date}
- Subject: ${commitDetails.subject}

## File Statistics

${statsSection}

## Files Changed

${filesChanged.map(file => `- ${file.status}: ${file.file}`).join('\n')}${dependencySection}
`;
  }

  /**
   * Generate a summary of a rebase operation
   * @param {string} diff Git diff of the entire rebase
   * @param {Array<Object>} rewrites List of commit rewrites
   * @param {Array<Object>} filesChanged List of files changed
   * @param {string} currentBranch Current branch name
   * @returns {Promise<string>} Generated summary
   */
  async generateRebaseSummary(diff, rewrites, filesChanged, currentBranch) {
    // Get details for each rewritten commit
    const rewrittenCommits = await Promise.all(
      rewrites.map(async ({ oldSha, newSha }) => {
        const oldDetails = await this.getCommitDetails(oldSha);
        const newDetails = await this.getCommitDetails(newSha);
        return { oldSha, oldDetails, newSha, newDetails };
      })
    );

    // Check if Claude is available
    if (this.claudeAvailable === null) {
      await this.checkClaudeAvailability();
    }

    if (!this.claudeAvailable) {
      return this.generateRebaseSummaryFallback(diff, rewrittenCommits, filesChanged, currentBranch);
    }

    try {
      // Create variables for the prompt template
      const variables = {
        currentBranch,
        rewriteCount: rewrites.length.toString(),
        commitsList: rewrittenCommits.map(({ oldSha, oldDetails, newSha, newDetails }) =>
          `- ${oldSha.substring(0, 7)} → ${newSha.substring(0, 7)}: ${oldDetails.subject} → ${newDetails.subject}`
        ).join('\n'),
        filesList: filesChanged.map(file => `${file.status}: ${file.file}`).join('\n'),
        diff,
        summaryFormat: this.summaryFormat,
        includeStats: this.includeStats ? 'true' : 'false',
        includeDependencies: this.includeDependencies ? 'true' : 'false',
        includeBreakingChanges: this.includeBreakingChanges ? 'true' : 'false'
      };

      // Format the prompt using template
      const prompt = this.formatPrompt('rebaseSummary', variables);

      // Call Claude API
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-opus-20240229',
        maxTokens: 2000,
        cacheResponse: true
      });

      // Extract the summary from the response
      const message = response.content[0]?.text || '';

      // Clean up the response
      return message.replace(/\n\nHuman: /g, '').replace(/\n\nAssistant: /g, '').trim();
    } catch (err) {
      this.error(`Failed to generate rebase summary with Claude: ${err.message}`);
      return this.generateRebaseSummaryFallback(diff, rewrittenCommits, filesChanged, currentBranch);
    }
  }

  /**
   * Generate a fallback summary for rebase operations when Claude is unavailable
   * @param {string} diff Git diff
   * @param {Array<Object>} rewrittenCommits List of rewritten commits with details
   * @param {Array<Object>} filesChanged List of files changed
   * @param {string} currentBranch Current branch name
   * @returns {string} Generated summary
   */
  generateRebaseSummaryFallback(diff, rewrittenCommits, filesChanged, currentBranch) {
    // Count files by type
    const fileStats = filesChanged.reduce((stats, file) => {
      stats[file.status] = (stats[file.status] || 0) + 1;
      return stats;
    }, {});

    // Format the file stats
    const statsSection = this.includeStats
      ? `\n\n## File Statistics\n\n${Object.entries(fileStats)
          .map(([status, count]) => `- ${status}: ${count}`)
          .join('\n')}`
      : '';

    // Identify dependency changes
    const dependencyChanges = this.includeDependencies
      ? filesChanged.filter(file =>
          file.file.includes('package.json') ||
          file.file.includes('requirements.txt') ||
          file.file.includes('Gemfile') ||
          file.file.includes('pom.xml') ||
          file.file.includes('build.gradle') ||
          file.file.includes('go.mod')
        )
      : [];

    // Format dependency section if needed
    const dependencySection = dependencyChanges.length > 0
      ? `\n\n## Dependency Changes\n\n${dependencyChanges.map(dep => `- ${dep.status}: ${dep.file}`).join('\n')}`
      : '';

    // Generate a basic summary
    return `# Rebase Summary

A rebase was completed on branch ${currentBranch}, rewriting ${rewrittenCommits.length} commit${rewrittenCommits.length !== 1 ? 's' : ''}.

## Basic Information

- Current branch: ${currentBranch}
- Number of rewritten commits: ${rewrittenCommits.length}
- Number of files changed: ${filesChanged.length}

## Rewritten Commits

${rewrittenCommits.map(({ oldSha, oldDetails, newSha, newDetails }) =>
  `- ${oldSha.substring(0, 7)} → ${newSha.substring(0, 7)}: ${newDetails.subject}`
).join('\n')}${statsSection}

## Files Changed

${filesChanged.map(file => `- ${file.status}: ${file.file}`).join('\n')}${dependencySection}
`;
  }

  /**
   * Create the default prompt templates for this hook
   * This is called when no templates are found
   * @returns {Promise<void>}
   */
  async createPromptTemplates() {
    this.debug('Creating default prompt templates for post-rewrite hook');

    const templatesDir = path.join(this.projectRoot, '.claude', 'templates');
    await fs.ensureDir(templatesDir);

    const templates = {
      amendSummary: `You are a helpful assistant that creates summaries of Git commit amendments. Please summarize the following Git commit amendment in a clear, human-readable format.

# Amendment Information
- Original commit: {{oldSha}}
- New commit: {{newSha}}
- Author: {{author}}
- Date: {{date}}
- Subject: {{subject}}
- Body: {{body}}

# Files Changed
{{filesList}}

# Git Diff
\`\`\`diff
{{diff}}
\`\`\`

Please create a detailed Markdown summary of this commit amendment with the following:

1. A descriptive title summarizing the amendment
2. An overview of what changed between the original and amended commit
3. A breakdown of the main changes by category or component
4. {{#includeDependencies}}Highlight any dependency changes (package.json, requirements.txt, etc.){{/includeDependencies}}
5. {{#includeBreakingChanges}}Identify any potential breaking changes or migration steps needed{{/includeBreakingChanges}}
6. {{#includeStats}}Include statistics on the changes (files changed, lines added/removed){{/includeStats}}

Formatting instructions:
- {{#summaryFormat == 'concise'}}Be concise and focus on the most important changes{{/summaryFormat}}
- {{#summaryFormat == 'detailed'}}Provide a detailed explanation of the changes{{/summaryFormat}}
- Use Markdown formatting
- Include headings, lists, and code blocks as appropriate
- Focus on explaining the changes in a way that helps developers understand what was amended`,

      rebaseSummary: `You are a helpful assistant that creates summaries of Git rebase operations. Please summarize the following Git rebase in a clear, human-readable format.

# Rebase Information
- Current branch: {{currentBranch}}
- Number of rewritten commits: {{rewriteCount}}

# Rewritten Commits
{{commitsList}}

# Files Changed
{{filesList}}

# Git Diff
\`\`\`diff
{{diff}}
\`\`\`

Please create a detailed Markdown summary of this rebase operation with the following:

1. A descriptive title summarizing the rebase
2. An overview of what changed during the rebase
3. A breakdown of the main changes by category or component
4. {{#includeDependencies}}Highlight any dependency changes (package.json, requirements.txt, etc.){{/includeDependencies}}
5. {{#includeBreakingChanges}}Identify any potential breaking changes or migration steps needed{{/includeBreakingChanges}}
6. {{#includeStats}}Include statistics on the changes (files changed, lines added/removed){{/includeStats}}

Formatting instructions:
- {{#summaryFormat == 'concise'}}Be concise and focus on the most important changes{{/summaryFormat}}
- {{#summaryFormat == 'detailed'}}Provide a detailed explanation of the changes{{/summaryFormat}}
- Use Markdown formatting
- Include headings, lists, and code blocks as appropriate
- Focus on explaining the changes in a way that helps developers understand what happened during the rebase`
    };

    const templatePath = path.join(templatesDir, `${this.gitHookName}.json`);
    await fs.writeJson(templatePath, templates, { spaces: 2 });
    this.debug(`Created default prompt templates at ${templatePath}`);

    // Load the templates we just created
    await this.loadPromptTemplates();
  }

  /**
   * Get a fallback prompt template
   * @param {string} templateName The template name
   * @param {Object} variables Variables for the template
   * @returns {string} The fallback prompt
   */
  getFallbackPrompt(templateName, variables) {
    if (templateName === 'amendSummary') {
      return this.createAmendSummaryPrompt(
        variables.diff,
        variables.oldSha,
        variables.newSha,
        {
          author: variables.author,
          date: variables.date,
          subject: variables.subject,
          body: variables.body
        },
        variables.filesList.split('\n').map(line => {
          const [status, ...fileParts] = line.split(': ');
          return { status, file: fileParts.join(': ') };
        })
      );
    } else if (templateName === 'rebaseSummary') {
      // Create a list of rewritten commits
      const commitsList = variables.commitsList.split('\n').map(line => {
        const matches = line.match(/- ([a-f0-9]+) → ([a-f0-9]+): (.*) → (.*)/);
        if (matches) {
          return {
            oldSha: matches[1],
            newSha: matches[2],
            oldSubject: matches[3],
            newSubject: matches[4]
          };
        }
        return null;
      }).filter(Boolean);

      return this.createRebaseSummaryPrompt(
        variables.diff,
        commitsList,
        variables.filesList.split('\n').map(line => {
          const [status, ...fileParts] = line.split(': ');
          return { status, file: fileParts.join(': ') };
        }),
        variables.currentBranch
      );
    }

    return super.getFallbackPrompt(templateName, variables);
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
      `- ${oldSha.substring(0, 7)} → ${newSha.substring(0, 7)}: ${oldDetails?.subject || ''} → ${newDetails?.subject || ''}`
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